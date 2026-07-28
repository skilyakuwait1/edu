import type { NextAuthConfig } from "next-auth";
// Type-only import — erased at build time, so this stays Edge-safe despite
// living in the same package as the Prisma runtime code.
import type { Role } from "@/generated/tenant-client/client";

/**
 * Edge-safe subset of the auth config (no Prisma/bcrypt imports — those pull in
 * Node built-ins that can't load in the Edge middleware/proxy runtime). Route-gating
 * only inspects the already-decoded JWT; it never touches the database.
 *
 * `jwt`/`session` live here (not only in src/auth.ts) because proxy.ts runs
 * its own separate, Edge-only `NextAuth(authConfig).auth` instance — if
 * these callbacks were Node-only, the Edge instance would fall back to
 * next-auth's default session shape (no role/employeeId/tenantId), and
 * `authorized()` below couldn't see `tenantId` at all. Both callbacks are
 * pure object field copying (token <-> session), no I/O, so they're safe
 * to run on Edge.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role;
        token.employeeId = user.employeeId;
        token.tenantId = user.tenantId;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.sub as string;
      session.user.role = token.role as Role;
      session.user.employeeId = token.employeeId as string | null;
      session.user.tenantId = token.tenantId as string;
      return session;
    },
    authorized({ auth, request }) {
      // Requiring tenantId (not just a truthy user) matters specifically
      // during the multi-tenant migration: a session cookie minted before
      // tenantId existed on the JWT would otherwise pass this check, reach
      // a page wrapped in withTenantContext, and crash with a raw 500
      // instead of being sent back through login to mint a fresh token.
      const isLoggedIn = !!auth?.user?.tenantId;
      const isAuthPage = request.nextUrl.pathname.startsWith("/login");

      if (isLoggedIn && isAuthPage) {
        return Response.redirect(new URL("/", request.nextUrl));
      }
      if (!isLoggedIn && !isAuthPage) {
        return false;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
