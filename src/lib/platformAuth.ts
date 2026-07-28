import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { platformPrisma } from "@/lib/platformPrisma";

/**
 * A second, fully separate NextAuth instance for the SaaS owner's own login
 * — distinct cookie name and secret from the tenant-facing instance in
 * src/auth.ts, so a platform-admin session can never be confused with (or
 * accidentally grant access via) a tenant user's session, and vice versa.
 *
 * `next-auth`'s `User`/`Session`/`JWT` interfaces are augmented globally
 * (src/types/next-auth.d.ts) with tenant-specific fields (role, employeeId,
 * tenantId) for the *other* instance — PlatformAdmin has none of those, so
 * `authorize`'s return is cast rather than fighting that augmentation for
 * an account model that's intentionally unrelated to it.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.PLATFORM_ADMIN_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/platform-admin/login" },
  cookies: {
    sessionToken: {
      name: "platform-admin.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
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

        const admin = await platformPrisma.platformAdmin.findUnique({ where: { email } });
        if (!admin) return null;

        const valid = await bcrypt.compare(password, admin.passwordHash);
        if (!valid) return null;

        // See the class comment: PlatformAdmin intentionally has none of
        // the tenant-side fields the global next-auth type augmentation
        // requires — this account model isn't a tenant User.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { id: admin.id, email: admin.email } as any;
      },
    }),
  ],
  callbacks: {
    session: async ({ session, token }) => {
      session.user.id = token.sub as string;
      return session;
    },
  },
});
