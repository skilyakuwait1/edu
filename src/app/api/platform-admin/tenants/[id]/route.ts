import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformSessionOrThrow } from "@/lib/platformSession";
import { platformApiErrorResponse } from "@/lib/platformApiErrors";
import { platformPrisma } from "@/lib/platformPrisma";

const statusUpdateSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

/**
 * Suspending here only flips the flag `getTenantClients` (src/lib/tenant/
 * clientCache.ts) checks on a cache miss — a tenant's already-warm cached
 * client on a long-running process keeps working until that cache entry is
 * naturally evicted or the process restarts. Acceptable for v1; worth
 * revisiting if suspension needs to take effect instantly.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getPlatformSessionOrThrow();
    const { id } = await params;
    const body = await request.json();
    const { status } = statusUpdateSchema.parse(body);

    const tenant = await platformPrisma.tenant.update({ where: { id }, data: { status } });
    return NextResponse.json({ tenant: { id: tenant.id, name: tenant.name, status: tenant.status } });
  } catch (error) {
    return platformApiErrorResponse(error);
  }
}
