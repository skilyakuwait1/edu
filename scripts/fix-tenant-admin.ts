/**
 * Fixes a tenant Super Admin account whose email has stray whitespace baked
 * in (e.g. a trailing newline from how it was typed into a terminal
 * command), and/or resets their password to a known value. Updates both the
 * tenant database's User row and the platform database's TenantUserIndex
 * (login resolution reads the index, so both must be corrected together).
 *
 * Usage:
 *   PLATFORM_DATABASE_URL="postgresql://...platform..." \
 *   DATABASE_URL="postgresql://...tenant1..." \
 *   npx tsx scripts/fix-tenant-admin.ts --email-contains "mohsocial38" --new-email "mohsocial38@gmail.com" --new-password "ChooseYourOwnStrongPassword1!"
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient as TenantPrismaClient } from "../src/generated/tenant-client/client";
import { PrismaClient as PlatformPrismaClient } from "../src/generated/platform-client/client";

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const emailContains = get("--email-contains");
  const newEmail = get("--new-email");
  const newPassword = get("--new-password");
  if (!emailContains || !newEmail || !newPassword) {
    console.error(
      'Usage: tsx scripts/fix-tenant-admin.ts --email-contains "partial" --new-email "clean@email.com" --new-password "..."',
    );
    process.exit(1);
  }
  return { emailContains, newEmail, newPassword };
}

async function main() {
  const { emailContains, newEmail, newPassword } = parseArgs();

  const tenantAdapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const tenantPrisma = new TenantPrismaClient({ adapter: tenantAdapter });
  const platformAdapter = new PrismaPg({ connectionString: process.env.PLATFORM_DATABASE_URL });
  const platformPrisma = new PlatformPrismaClient({ adapter: platformAdapter });

  try {
    const candidates = await tenantPrisma.user.findMany({
      where: { email: { contains: emailContains } },
    });

    if (candidates.length === 0) {
      console.log(`No user found with an email containing "${emailContains}".`);
      return;
    }

    for (const user of candidates) {
      console.log(`Found: ${JSON.stringify(user.email)} (role ${user.role})`);
    }

    if (candidates.length > 1) {
      console.error("More than one match — refine --email-contains to match exactly one user.");
      process.exitCode = 1;
      return;
    }

    const user = candidates[0];
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const updated = await tenantPrisma.user.update({
      where: { id: user.id },
      data: { email: newEmail, passwordHash },
    });
    console.log(`Tenant User row updated: email is now ${JSON.stringify(updated.email)}.`);

    if (user.email !== newEmail) {
      await platformPrisma.tenantUserIndex.deleteMany({ where: { email: user.email } });
    }
    const existingIndex = await platformPrisma.tenantUserIndex.findUnique({ where: { email: newEmail } });
    const tenantRecord = await platformPrisma.tenant.findFirst({
      where: { databaseUrl: process.env.DATABASE_URL },
    });
    if (!tenantRecord) {
      console.warn(
        "Could not find a matching Tenant row by DATABASE_URL in the platform DB — the login-routing " +
          "index was not updated. Login will still fail until this is fixed manually.",
      );
    } else if (!existingIndex) {
      await platformPrisma.tenantUserIndex.create({ data: { email: newEmail, tenantId: tenantRecord.id } });
      console.log(`Login-routing index created for ${newEmail}.`);
    } else {
      console.log(`Login-routing index already correct for ${newEmail}.`);
    }

    console.log("\nDone. Try logging in now with the new email/password.");
  } finally {
    await tenantPrisma.$disconnect();
    await platformPrisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
