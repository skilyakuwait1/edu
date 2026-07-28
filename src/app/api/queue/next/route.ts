import { NextResponse } from "next/server";
import { getSessionOrThrow, ForbiddenError } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { getNextCustomer } from "@/lib/services/queue.service";
import { withTenantContext } from "@/lib/tenant/withTenantContext";

export const POST = withTenantContext(async () => {
  try {
    const session = await getSessionOrThrow();
    if (!session.employeeId) {
      throw new ForbiddenError("هذا الحساب غير مرتبط بموظف");
    }
    const lead = await getNextCustomer(session.employeeId);
    return NextResponse.json({ lead });
  } catch (error) {
    return apiErrorResponse(error);
  }
});
