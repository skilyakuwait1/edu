import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSessionOrThrow, requireRole, ForbiddenError } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { platformPrisma } from "@/lib/platformPrisma";
import { Role } from "@/generated/tenant-client/client";
import { withTenantContext } from "@/lib/tenant/withTenantContext";

const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(["SUPER_ADMIN", "MANAGER", "AGENT"]).optional(),
  employeeId: z.string().nullable().optional(),
  password: z.string().min(8).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export const PATCH = withTenantContext(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.SUPER_ADMIN]);
    const { id } = await params;
    const body = await request.json();
    const input = userUpdateSchema.parse(body);

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
    }

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

    // Email changes must move the platform login-routing index too — checked
    // and applied *before* the tenant-side write so a collision with another
    // tenant's user is rejected without leaving the tenant DB half-updated.
    if (input.email && input.email !== existingUser.email) {
      const collision = await platformPrisma.tenantUserIndex.findUnique({ where: { email: input.email } });
      if (collision) {
        return NextResponse.json(
          { error: "هذا البريد الإلكتروني مسجل بالفعل تحت مؤسسة أخرى" },
          { status: 409 },
        );
      }
    }

    const user = await prisma.user.update({ where: { id }, data });

    if (input.email && input.email !== existingUser.email) {
      try {
        await platformPrisma.tenantUserIndex.delete({ where: { email: existingUser.email } });
        await platformPrisma.tenantUserIndex.create({
          data: { email: user.email, tenantId: session.tenantId },
        });
      } catch (indexError) {
        console.error(
          `TenantUserIndex email-change sync failed for user ${user.id} (${existingUser.email} -> ${user.email}) in tenant ${session.tenantId} — login will fail until this is manually fixed.`,
          indexError,
        );
      }
    }

    return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role, isActive: user.isActive } });
  } catch (error) {
    return apiErrorResponse(error);
  }
});

/**
 * Deactivates rather than hard-deletes: ImportLog.userId is required (delete would be
 * blocked anyway once they've run an import) and ActivityLog.userId is optional (a real
 * delete would silently SetNull and lose "who did this" attribution). Deactivating also
 * blocks login immediately via the isActive check in src/auth.ts, which is the actual goal
 * — the platform TenantUserIndex entry is left in place (it only routes to the right
 * tenant's database; the tenant-side isActive check still blocks the login attempt).
 */
export const DELETE = withTenantContext(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
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
});
