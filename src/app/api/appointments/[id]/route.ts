import { NextRequest, NextResponse } from "next/server";
import { getSessionOrThrow } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { updateAppointmentStatus } from "@/lib/services/appointment.service";
import { appointmentStatusSchema } from "@/lib/validation/appointmentSchema";
import { withTenantContext } from "@/lib/tenant/withTenantContext";

export const PATCH = withTenantContext(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await getSessionOrThrow();
    const { id } = await params;
    const body = await request.json();
    const { status } = appointmentStatusSchema.parse(body);
    const appointment = await updateAppointmentStatus(session, id, status);
    if (!appointment) {
      return NextResponse.json({ error: "الموعد غير موجود" }, { status: 404 });
    }
    return NextResponse.json({ appointment });
  } catch (error) {
    return apiErrorResponse(error);
  }
});
