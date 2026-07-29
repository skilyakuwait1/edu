import { NextRequest, NextResponse } from "next/server";
import { getSessionOrThrow } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { getLeadForUser } from "@/lib/services/lead.service";
import { sendWatiReminder } from "@/lib/services/wati.service";
import { appendTimelineEvent } from "@/lib/services/timeline.service";
import { prisma } from "@/lib/prisma";
import { withTenantContext } from "@/lib/tenant/withTenantContext";

export const POST = withTenantContext(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await getSessionOrThrow();
    const { id } = await params;
    const lead = await getLeadForUser(session, id);
    if (!lead) {
      return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    }

    await sendWatiReminder(lead.phone, lead.fullName);

    await appendTimelineEvent(prisma, {
      leadId: lead.id,
      type: "WATI_REMINDER_SENT",
      summary: "تم إرسال تذكير واتساب عبر WATI",
      employeeId: session.employeeId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
});
