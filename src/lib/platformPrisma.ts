import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/platform-client/client";

const globalForPlatformPrisma = globalThis as unknown as { platformPrisma?: PrismaClient };

function createPlatformPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.PLATFORM_DATABASE_URL });
  return new PrismaClient({ adapter });
}

// The one client that's fine as a plain global singleton, unproxied — there's
// only ever one platform database, unlike the per-tenant `prisma` export in
// @/lib/prisma.
export const platformPrisma = globalForPlatformPrisma.platformPrisma ?? createPlatformPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPlatformPrisma.platformPrisma = platformPrisma;
}
