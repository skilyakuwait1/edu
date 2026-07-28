import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe subset of the auth config (no Prisma/bcrypt imports — those pull in
 * Node built-ins that can't load in the Edge middleware/proxy runtime). Route-gating
 * only inspects the already-decoded JWT; it never touches the database.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
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
