import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // api/webhooks is excluded: those endpoints are called by external services
  // (no user session) and enforce their own auth (e.g. a shared-secret token).
  // platform-admin/api/platform-admin are excluded: that's a fully separate
  // auth system (src/lib/platformAuth.ts, own cookie, own session shape with
  // no tenantId) — gating it with the tenant `authorized()` check below
  // would either bounce it to the wrong login page or reject it outright.
  // It enforces its own auth in src/app/platform-admin/(protected)/layout.tsx.
  matcher: [
    "/((?!api/auth|api/webhooks|platform-admin|api/platform-admin|_next/static|_next/image|favicon.ico).*)",
  ],
};
