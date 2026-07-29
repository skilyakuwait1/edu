import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionOrThrow, requireRole } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/tenant-client/client";
import { withTenantContext } from "@/lib/tenant/withTenantContext";

const watiSettingsSchema = z.object({
  watiApiEndpoint: z.string().trim().min(1).max(500),
  watiTemplateName: z.string().trim().min(1).max(200),
  // Omitted or empty -> keep the previously saved key. Only overwritten when a new value is sent.
  watiApiKey: z.string().trim().min(1).optional(),
});

export const GET = withTenantContext(async () => {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.SUPER_ADMIN]);
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    return NextResponse.json({
      watiApiEndpoint: settings?.watiApiEndpoint ?? "",
      watiTemplateName: settings?.watiTemplateName ?? "",
      watiApiKeySet: Boolean(settings?.watiApiKey),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
});

export const PATCH = withTenantContext(async (request: NextRequest) => {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.SUPER_ADMIN]);
    const body = await request.json();
    const input = watiSettingsSchema.parse(body);

    const settings = await prisma.settings.upsert({
      where: { id: "singleton" },
      update: {
        watiApiEndpoint: input.watiApiEndpoint,
        watiTemplateName: input.watiTemplateName,
        ...(input.watiApiKey ? { watiApiKey: input.watiApiKey } : {}),
      },
      create: {
        id: "singleton",
        watiApiEndpoint: input.watiApiEndpoint,
        watiTemplateName: input.watiTemplateName,
        watiApiKey: input.watiApiKey,
      },
    });

    return NextResponse.json({
      watiApiEndpoint: settings.watiApiEndpoint ?? "",
      watiTemplateName: settings.watiTemplateName ?? "",
      watiApiKeySet: Boolean(settings.watiApiKey),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
});
