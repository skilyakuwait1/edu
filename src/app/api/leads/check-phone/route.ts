import { NextRequest, NextResponse } from "next/server";
import { getSessionOrThrow } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { checkDuplicatePhone } from "@/lib/services/lead.service";
import { withTenantContext } from "@/lib/tenant/withTenantContext";

export const POST = withTenantContext(async (request: NextRequest) => {
  try {
    await getSessionOrThrow();
    const { phone } = await request.json();
    if (typeof phone !== "string") {
      return NextResponse.json({ error: "رقم الهاتف مطلوب" }, { status: 400 });
    }
    const existing = await checkDuplicatePhone(phone);
    return NextResponse.json({ existing });
  } catch (error) {
    return apiErrorResponse(error);
  }
});
