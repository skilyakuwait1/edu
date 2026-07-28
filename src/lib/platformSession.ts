import { auth } from "@/lib/platformAuth";

export type PlatformSession = {
  adminId: string;
  email: string;
};

export class PlatformUnauthorizedError extends Error {
  constructor() {
    super("Not authenticated");
  }
}

export async function getPlatformSession(): Promise<PlatformSession | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    adminId: session.user.id,
    email: session.user.email ?? "",
  };
}

export async function getPlatformSessionOrThrow(): Promise<PlatformSession> {
  const session = await getPlatformSession();
  if (!session) throw new PlatformUnauthorizedError();
  return session;
}
