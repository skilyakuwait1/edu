import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { platformPrisma } from "@/lib/platformPrisma";
import { getTenantClients } from "@/lib/tenant/clientCache";
import { tenantContext } from "@/lib/tenant/context";
import { authConfig } from "@/auth.config";
import { refillQueue } from "@/lib/services/queue.service";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        // No subdomains — every tenant's users share one login page, so the
        // tenant is resolved from the email itself via a global routing
        // index in the platform DB, kept in sync whenever a tenant admin
        // creates/edits/deletes a User (see src/app/api/users/**).
        const index = await platformPrisma.tenantUserIndex.findUnique({ where: { email } });
        if (!index) return null;

        const { prisma: tenantPrisma, pgPool: tenantPgPool } = await getTenantClients(index.tenantId);

        const user = await tenantPrisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        if (user.employeeId) {
          const employeeId = user.employeeId;
          // Heartbeat for the queue engine's auto-release check: logging in
          // marks this agent active again immediately, then tops their
          // active set back up to a full queueSize right away. refillQueue()
          // (queue.service.ts) reaches the DB through the @/lib/prisma and
          // @/lib/pgPool Proxies, which read from AsyncLocalStorage — no
          // request-scoped context exists yet this early in the login flow
          // (that's what this call is establishing), so it needs its own
          // explicit tenantContext.run(...) rather than relying on
          // withTenantContext (which wraps *already-authenticated* requests).
          await tenantContext.run(
            { tenantId: index.tenantId, prisma: tenantPrisma, pgPool: tenantPgPool },
            async () => {
              await tenantPrisma.employee.update({
                where: { id: employeeId },
                data: { lastActiveAt: new Date() },
              });
              await refillQueue(employeeId);
            },
          );
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
          tenantId: index.tenantId,
        };
      },
    }),
  ],
  // jwt/session/authorized all come from authConfig (see auth.config.ts for
  // why they live there instead of here).
});
