import { NextRequest, NextResponse } from "next/server";
import { getSessionOrThrow, requireRole } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

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

    const source = await prisma.source.update({ where: { id }, data });
    return NextResponse.json({ source });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** Deactivates rather than hard-deletes — Source is a required FK on Lead, so a real
 * delete would be blocked by any existing lead anyway; deactivating just hides it
 * from new-lead pickers while keeping historical leads' source attribution intact. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.SUPER_ADMIN]);
    const { id } = await params;
    await prisma.source.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ deactivated: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
