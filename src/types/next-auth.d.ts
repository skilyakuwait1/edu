import type { Role } from "@/generated/tenant-client/enums";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    employeeId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      employeeId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    employeeId: string | null;
  }
}
