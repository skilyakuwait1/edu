import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSessionOrThrow, requireRole, ForbiddenError } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/tenant-client/client";

const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(["SUPER_ADMIN", "MANAGER", "AGENT"]).optional(),
  employeeId: z.string().nullable().optional(),
  password: z.string().min(8).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.SUPER_ADMIN]);
    const { id } = await params;
    const body = await request.json();
    const input = userUpdateSchema.parse(body);

    const data: Record<string, unknown> = {};
    if (input.email) data.email = input.email;
    if (input.role) data.role = input.role;
    if (input.employeeId !== undefined) data.employeeId = input.employeeId || null;
    if (typeof input.isActive === "boolean") {
      if (id === session.userId && !input.isActive) {
        throw new ForbiddenError("لا يمكنك تعطيل حسابك الخاص");
      }
      data.isActive = input.isActive;
    }
    if (input.password) data.passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.update({ where: { id }, data });
    return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role, isActive: user.isActive } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * Deactivates rather than hard-deletes: ImportLog.userId is required (delete would be
 * blocked anyway once they've run an import) and ActivityLog.userId is optional (a real
 * delete would silently SetNull and lose "who did this" attribution). Deactivating also
 * blocks login immediately via the isActive check in src/auth.ts, which is the actual goal.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.SUPER_ADMIN]);
    const { id } = await params;

    if (id === session.userId) {
      throw new ForbiddenError("لا يمكنك تعطيل حسابك الخاص");
    }

    await prisma.user.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ deactivated: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
