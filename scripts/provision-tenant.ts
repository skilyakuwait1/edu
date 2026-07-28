/**
 * Provisions a new tenant: pushes the tenant schema to their database, seeds
 * default data (sources, settings, a Super Admin), records the Tenant row in
 * the platform DB, and syncs the seeded users into the platform-wide
 * TenantUserIndex (email -> tenant) that login resolution reads from.
 *
 * Usage:
 *   tsx scripts/provision-tenant.ts --name "Acme Institute" --db-url "postgresql://..."
 *
 * v1 is intentionally manual: the platform admin creates the Postgres
 * database by hand (e.g. in Neon's dashboard) and passes its connection
 * string in. See the plan doc, Phase 2 §5, for why automated provisioning
 * is deferred.
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient as TenantPrismaClient } from "../src/generated/tenant-client/client";
import { PrismaClient as PlatformPrismaClient } from "../src/generated/platform-client/client";

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const name = get("--name");
  const dbUrl = get("--db-url");
  if (!name || !dbUrl) {
    console.error('Usage: tsx scripts/provision-tenant.ts --name "Tenant Name" --db-url "postgresql://..."');
    process.exit(1);
  }
  return { name, dbUrl };
}

async function validateConnection(dbUrl: string) {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  await client.query("SELECT 1");
  await client.end();
}

function runPrismaCliStep(description: string, args: string[], dbUrl: string) {
  console.log(`- ${description}...`);
  execFileSync("npx", ["prisma", ...args], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: dbUrl },
  });
}

async function main() {
  const { name, dbUrl } = parseArgs();

  console.log(`Provisioning tenant "${name}"...`);

  console.log("- Validating connection string is reachable...");
  await validateConnection(dbUrl);

  runPrismaCliStep("Pushing tenant schema", ["db", "push", "--config", "prisma.tenant.config.ts"], dbUrl);
  runPrismaCliStep("Seeding default data", ["db", "seed", "--config", "prisma.tenant.config.ts"], dbUrl);

  const platformAdapter = new PrismaPg({ connectionString: process.env.PLATFORM_DATABASE_URL });
  const platformPrisma = new PlatformPrismaClient({ adapter: platformAdapter });

  const tenantAdapter = new PrismaPg({ connectionString: dbUrl });
  const tenantPrisma = new TenantPrismaClient({ adapter: tenantAdapter });

  try {
    console.log("- Recording the tenant in the platform database...");
    const tenant = await platformPrisma.tenant.create({
      data: { name, databaseUrl: dbUrl, status: "ACTIVE" },
    });

    console.log("- Syncing seeded users into the login-routing index...");
    const users = await tenantPrisma.user.findMany({ select: { email: true } });
    for (const user of users) {
      const existing = await platformPrisma.tenantUserIndex.findUnique({ where: { email: user.email } });
      if (existing) {
        console.warn(`  ! ${user.email} is already registered under another tenant — skipped.`);
        continue;
      }
      await platformPrisma.tenantUserIndex.create({ data: { email: user.email, tenantId: tenant.id } });
    }

    console.log(`\nDone. Tenant "${name}" provisioned with id ${tenant.id}.`);
    console.log(`Users that can log in: ${users.map((u) => u.email).join(", ")}`);
  } finally {
    await platformPrisma.$disconnect();
    await tenantPrisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
