import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { refillQueue } from "@/lib/services/queue.service";
import type { Role } from "@/generated/tenant-client/client";

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

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        if (user.employeeId) {
          // Heartbeat for the queue engine's auto-release check: logging in
          // marks this agent active again immediately, then tops their
          // active set back up to a full queueSize right away.
          await prisma.employee.update({
            where: { id: user.employeeId },
            data: { lastActiveAt: new Date() },
          });
          await refillQueue(user.employeeId);
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role;
        token.employeeId = user.employeeId;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.sub as string;
      session.user.role = token.role as Role;
      session.user.employeeId = token.employeeId as string | null;
      return session;
    },
  },
});
