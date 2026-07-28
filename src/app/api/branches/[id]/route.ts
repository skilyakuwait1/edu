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

    const data: { name?: string; isActive?: boolean } = {};
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    const branch = await prisma.branch.update({ where: { id }, data });
    return NextResponse.json({ branch });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * Deactivates rather than hard-deletes: Branch is an optional FK on Appointment,
 * so Prisma's default referential action (SetNull) would let a real delete succeed
 * silently and orphan historical appointments' branch attribution. Deactivating keeps
 * the row (and existing references) intact while hiding it from active-branch pickers.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.SUPER_ADMIN]);
    const { id } = await params;
    await prisma.branch.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ deactivated: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
