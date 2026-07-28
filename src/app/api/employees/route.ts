import { NextRequest, NextResponse } from "next/server";
import { getSessionOrThrow, requireRole } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/tenant-client/client";
import { withTenantContext } from "@/lib/tenant/withTenantContext";

export const GET = withTenantContext(async () => {
  try {
    await getSessionOrThrow();
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ employees });
  } catch (error) {
    return apiErrorResponse(error);
  }
});

export const POST = withTenantContext(async (request: NextRequest) => {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.SUPER_ADMIN]);
    const { name, phone } = await request.json();
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
    }
    const employee = await prisma.employee.create({
      data: { name: name.trim(), phone: phone || null },
    });
    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
});
