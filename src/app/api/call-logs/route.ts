import { NextRequest, NextResponse } from "next/server";
import { getSessionOrThrow } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { logCall } from "@/lib/services/call-log.service";
import { callLogCreateSchema } from "@/lib/validation/callLogSchema";
import { withTenantContext } from "@/lib/tenant/withTenantContext";

export const POST = withTenantContext(async (request: NextRequest) => {
  try {
    const session = await getSessionOrThrow();
    const body = await request.json();
    const input = callLogCreateSchema.parse(body);
    const callLog = await logCall(session, input);
    if (!callLog) {
      return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    }
    return NextResponse.json({ callLog }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
});
