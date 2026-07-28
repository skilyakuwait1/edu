import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/platform-client/client";

const adapter = new PrismaPg({ connectionString: process.env.PLATFORM_DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_PLATFORM_ADMIN_EMAIL ?? "owner@educationcrm.com";
  const password = process.env.SEED_PLATFORM_ADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.platformAdmin.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash },
  });

  console.log(`Platform admin login: ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
