import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/platform/schema.prisma",
  migrations: {
    path: "prisma/platform/migrations",
  },
  datasource: {
    url: process.env["PLATFORM_DATABASE_URL"],
  },
});
