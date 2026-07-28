import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionOrThrow, requireRole } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { getSettings } from "@/lib/services/queue.service";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/tenant-client/client";
import { withTenantContext } from "@/lib/tenant/withTenantContext";

const settingsUpdateSchema = z.object({
  queueSize: z.number().int().min(1).max(200),
  inactivityTimeoutHours: z.number().int().min(1).max(720),
});

export const GET = withTenantContext(async () => {
  try {
    await getSessionOrThrow();
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return apiErrorResponse(error);
  }
});

export const PATCH = withTenantContext(async (request: NextRequest) => {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.SUPER_ADMIN]);
    const body = await request.json();
    const input = settingsUpdateSchema.parse(body);

    const settings = await prisma.settings.upsert({
      where: { id: "singleton" },
      update: input,
      create: { id: "singleton", ...input },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    return apiErrorResponse(error);
  }
});
