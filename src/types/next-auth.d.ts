import type { Role } from "@/generated/tenant-client/enums";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    employeeId: string | null;
    tenantId: string;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      employeeId: string | null;
      tenantId: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    employeeId: string | null;
    tenantId: string;
  }
}
