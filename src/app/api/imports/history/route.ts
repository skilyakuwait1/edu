import { NextResponse } from "next/server";
import { getSessionOrThrow, requireRole } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { listImportLogs } from "@/lib/services/import.service";
import { Role } from "@/generated/prisma/client";

export async function GET() {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.SUPER_ADMIN, Role.MANAGER]);
    const logs = await listImportLogs();
    return NextResponse.json({ logs });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
