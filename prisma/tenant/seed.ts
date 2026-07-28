import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/tenant-client/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SOURCES = [
  "WhatsApp",
  "WATI",
  "Instagram",
  "Facebook",
  "TikTok",
  "Google Ads",
  "Website",
  "Walk In",
  "Referral",
  "Phone Call",
  "Excel Import",
];

async function main() {
  for (const name of SOURCES) {
    await prisma.source.upsert({ where: { name }, update: {}, create: { name } });
  }

  await prisma.branch.upsert({
    where: { name: "Main Campus" },
    update: {},
    create: { name: "Main Campus" },
  });

  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", queueSize: 20, inactivityTimeoutHours: 48 },
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@educationcrm.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  // Test accounts for the two other roles, each linked to an Employee record
  // (so leads can be assigned to them and role-based visibility can be tested).
  const testAccounts: { name: string; email: string; role: "MANAGER" | "AGENT" }[] = [
    { name: "منى إبراهيم", email: "manager@educationcrm.com", role: "MANAGER" },
    { name: "أحمد سالم", email: "agent1@educationcrm.com", role: "AGENT" },
    { name: "سارة يوسف", email: "agent2@educationcrm.com", role: "AGENT" },
  ];
  const testPassword = process.env.SEED_TEST_PASSWORD ?? "ChangeMe123!";
  const testPasswordHash = await bcrypt.hash(testPassword, 10);

  for (const account of testAccounts) {
    let employee = await prisma.employee.findFirst({ where: { name: account.name } });
    if (!employee) {
      employee = await prisma.employee.create({ data: { name: account.name } });
    }

    await prisma.user.upsert({
      where: { email: account.email },
      update: { employeeId: employee.id },
      create: {
        email: account.email,
        passwordHash: testPasswordHash,
        role: account.role,
        employeeId: employee.id,
      },
    });
  }

  console.log(`Seeded ${SOURCES.length} sources, 1 branch, default settings (queueSize=20, inactivityTimeoutHours=48).`);
  console.log(`Super Admin login: ${adminEmail} / ${adminPassword}`);
  for (const account of testAccounts) {
    console.log(`${account.role} login: ${account.email} / ${testPassword}`);
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
