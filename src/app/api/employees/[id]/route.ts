import { NextRequest, NextResponse } from "next/server";
import { getSessionOrThrow, requireRole } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/tenant-client/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.SUPER_ADMIN]);
    const { id } = await params;
    const body = await request.json();

    const data: { name?: string; phone?: string | null; isActive?: boolean } = {};
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (typeof body.phone === "string" || body.phone === null) data.phone = body.phone || null;
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    const employee = await prisma.employee.update({ where: { id }, data });
    return NextResponse.json({ employee });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** Deactivates rather than hard-deletes — see branches/[id]/route.ts for why. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.SUPER_ADMIN]);
    const { id } = await params;
    await prisma.employee.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ deactivated: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
