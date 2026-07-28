import { NextRequest, NextResponse } from "next/server";
import { getSessionOrThrow } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { reassignLead } from "@/lib/services/queue.service";
import { withTenantContext } from "@/lib/tenant/withTenantContext";

export const PATCH = withTenantContext(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await getSessionOrThrow();
    const { id } = await params;
    const { employeeId } = await request.json();
    if (typeof employeeId !== "string" || !employeeId) {
      return NextResponse.json({ error: "الموظف مطلوب" }, { status: 400 });
    }
    const lead = await reassignLead(session, id, employeeId);
    if (!lead) {
      return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    }
    return NextResponse.json({ lead });
  } catch (error) {
    return apiErrorResponse(error);
  }
});
