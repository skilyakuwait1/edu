/**
 * Lists every User in a given tenant database — emails and roles only, no
 * password hashes — so you can see exactly what accounts actually exist
 * rather than guessing what was typed during provisioning.
 *
 * Emails are printed via JSON.stringify so any invisible whitespace
 * (trailing spaces/newlines from a copy-paste into the terminal) becomes
 * visible as an escape sequence like "\n" instead of silently disappearing.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/list-tenant-users.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/tenant-client/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (users.length === 0) {
    console.log("No users found in this database.");
    return;
  }

  console.log(`Found ${users.length} user(s):\n`);
  for (const u of users) {
    const flagged = u.email !== u.email.trim() ? "  <-- has leading/trailing whitespace!" : "";
    console.log(`  ${JSON.stringify(u.email)}  —  ${u.role}  —  ${u.isActive ? "active" : "inactive"}${flagged}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
