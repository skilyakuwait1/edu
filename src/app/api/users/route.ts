import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSessionOrThrow, requireRole } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { platformPrisma } from "@/lib/platformPrisma";
import { Role } from "@/generated/tenant-client/client";
import { withTenantContext } from "@/lib/tenant/withTenantContext";

const userCreateSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(8, "كلمة المرور يجب ألا تقل عن 8 أحرف"),
  role: z.enum(["SUPER_ADMIN", "MANAGER", "AGENT"]),
  employeeId: z.string().optional().nullable(),
});

export const GET = withTenantContext(async () => {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.SUPER_ADMIN]);
    const users = await prisma.user.findMany({
      include: { employee: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        employeeName: u.employee?.name ?? null,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
});

export const POST = withTenantContext(async (request: NextRequest) => {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.SUPER_ADMIN]);
    const body = await request.json();
    const input = userCreateSchema.parse(body);

    // Email must be globally unique across the whole platform, not just
    // within this tenant — login resolves the tenant from this index, so a
    // collision here would make login ambiguous.
    const existingIndex = await platformPrisma.tenantUserIndex.findUnique({
      where: { email: input.email },
    });
    if (existingIndex) {
      return NextResponse.json(
        { error: "هذا البريد الإلكتروني مسجل بالفعل تحت مؤسسة أخرى" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: input.role,
        employeeId: input.employeeId || null,
      },
    });

    // Two physically separate databases, no cross-database transaction — the
    // tenant-side write above is the "real" data and already succeeded. If
    // this index write fails, the new user exists but can't log in until an
    // admin re-syncs the index; that's a narrower, more recoverable failure
    // than losing the account, so we log loudly rather than roll back.
    try {
      await platformPrisma.tenantUserIndex.create({
        data: { email: user.email, tenantId: session.tenantId },
      });
    } catch (indexError) {
      console.error(
        `TenantUserIndex write failed for new user ${user.id} (${user.email}) in tenant ${session.tenantId} — login will fail until this is manually fixed.`,
        indexError,
      );
    }

    return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
});
