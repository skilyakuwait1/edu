/**
 * Propagates the current tenant schema to every ACTIVE tenant's database.
 *
 * Uses `prisma db push` rather than `prisma migrate deploy` for now — the
 * plan doc recommends switching to real Prisma Migrate once this is running
 * against a real Postgres provider (the local dev sandbox's shadow-database
 * connection was found to be flaky in this environment, which `db push`
 * sidesteps entirely since it doesn't need one; that flakiness is specific
 * to the local dev proxy, not expected against Neon). Revisit before this
 * script is trusted to run unattended.
 *
 * Runs sequentially, not in parallel, to bound the blast radius of a bad
 * schema change and avoid overwhelming connection limits.
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient as PlatformPrismaClient } from "../src/generated/platform-client/client";

async function main() {
  const platformAdapter = new PrismaPg({ connectionString: process.env.PLATFORM_DATABASE_URL });
  const platformPrisma = new PlatformPrismaClient({ adapter: platformAdapter });

  const tenants = await platformPrisma.tenant.findMany({ where: { status: "ACTIVE" } });
  console.log(`Pushing tenant schema to ${tenants.length} active tenant(s)...\n`);

  const results: { name: string; ok: boolean }[] = [];

  for (const tenant of tenants) {
    console.log(`- ${tenant.name} (${tenant.id})`);
    try {
      execFileSync("npx", ["prisma", "db", "push", "--config", "prisma.tenant.config.ts"], {
        cwd: process.cwd(),
        stdio: "inherit",
        env: { ...process.env, DATABASE_URL: tenant.databaseUrl },
      });
      results.push({ name: tenant.name, ok: true });
    } catch (error) {
      console.error(`  Failed: ${(error as Error).message}`);
      results.push({ name: tenant.name, ok: false });
    }
  }

  await platformPrisma.$disconnect();

  console.log("\nSummary:");
  for (const r of results) {
    console.log(`  ${r.ok ? "OK" : "FAILED"} — ${r.name}`);
  }

  if (results.some((r) => !r.ok)) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
