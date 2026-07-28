import { NextRequest, NextResponse } from "next/server";
import { getSessionOrThrow } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { scheduleFollowUp } from "@/lib/services/followUp.service";
import { followUpCreateSchema } from "@/lib/validation/followUpSchema";
import { withTenantContext } from "@/lib/tenant/withTenantContext";

export const POST = withTenantContext(async (request: NextRequest) => {
  try {
    const session = await getSessionOrThrow();
    const body = await request.json();
    const input = followUpCreateSchema.parse(body);
    const followUp = await scheduleFollowUp(session, input);
    if (!followUp) {
      return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    }
    return NextResponse.json({ followUp }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
});
