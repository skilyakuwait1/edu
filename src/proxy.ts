import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // api/webhooks is excluded: those endpoints are called by external services
  // (no user session) and enforce their own auth (e.g. a shared-secret token).
  matcher: ["/((?!api/auth|api/webhooks|_next/static|_next/image|favicon.ico).*)"],
};
