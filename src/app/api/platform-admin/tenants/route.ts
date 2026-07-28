import { NextResponse } from "next/server";
import { getPlatformSessionOrThrow } from "@/lib/platformSession";
import { platformApiErrorResponse } from "@/lib/platformApiErrors";
import { platformPrisma } from "@/lib/platformPrisma";

export async function GET() {
  try {
    await getPlatformSessionOrThrow();
    const tenants = await platformPrisma.tenant.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({
      tenants: tenants.map((t) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    return platformApiErrorResponse(error);
  }
}
