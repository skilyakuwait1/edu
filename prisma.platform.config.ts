import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/platform/schema.prisma",
  migrations: {
    path: "prisma/platform/migrations",
    seed: "tsx prisma/platform/seed.ts",
  },
  datasource: {
    url: process.env["PLATFORM_DATABASE_URL"],
  },
});
