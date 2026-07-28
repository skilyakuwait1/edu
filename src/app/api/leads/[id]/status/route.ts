import { NextRequest, NextResponse } from "next/server";
import { getSessionOrThrow } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { updateLeadStatus } from "@/lib/services/lead.service";
import { leadStatusSchema } from "@/lib/validation/leadSchema";
import { withTenantContext } from "@/lib/tenant/withTenantContext";

export const PATCH = withTenantContext(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await getSessionOrThrow();
    const { id } = await params;
    const body = await request.json();
    const { status } = leadStatusSchema.parse(body);
    const lead = await updateLeadStatus(session, id, status);
    if (!lead) {
      return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    }
    return NextResponse.json({ lead });
  } catch (error) {
    return apiErrorResponse(error);
  }
});
