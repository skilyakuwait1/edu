import { prisma } from "@/lib/prisma";
import { appendTimelineEvent } from "@/lib/services/timeline.service";
import { refillQueue } from "@/lib/services/queue.service";
import { buildLeadVisibilityFilter, ForbiddenError, type Session } from "@/lib/auth/session";
import { LeadStatus, Role } from "@/generated/prisma/client";
import type { FollowUpCreateInput } from "@/lib/validation/followUpSchema";

/**
 * A direct "schedule a follow-up" action, independent of logging a call
 * result (that path is call-log.service.ts's logCall, which sets
 * nextFollowUpDate automatically based on the CallResult). Both paths move
 * the lead to FOLLOW_UP and immediately vacate the agent's active slot, so
 * the queue engine behaves consistently regardless of entry point.
 */
export async function scheduleFollowUp(session: Session, input: FollowUpCreateInput) {
  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) return null;

  if (session.role === Role.AGENT && lead.assignedEmployeeId !== session.employeeId) {
    throw new ForbiddenError("لا يمكنك جدولة متابعة لهذا العميل");
  }
  if (!session.employeeId) {
    throw new ForbiddenError("هذا الحساب غير مرتبط بموظف");
  }

  const followUpDate = new Date(input.followUpDate);

  const followUp = await prisma.followUp.create({
    data: {
      leadId: input.leadId,
      employeeId: session.employeeId,
      followUpDate,
      followUpTime: input.followUpTime || null,
      notes: input.notes || null,
    },
  });

  await prisma.lead.update({
    where: { id: input.leadId },
    data: { status: LeadStatus.FOLLOW_UP, nextFollowUpDate: followUpDate },
  });

  await appendTimelineEvent(prisma, {
    leadId: input.leadId,
    type: "FOLLOW_UP_SCHEDULED",
    summary: `تمت جدولة متابعة بتاريخ ${input.followUpDate}${input.followUpTime ? ` الساعة ${input.followUpTime}` : ""}`,
    employeeId: session.employeeId,
  });

  if (lead.status === LeadStatus.ASSIGNED && lead.assignedEmployeeId) {
    await refillQueue(lead.assignedEmployeeId);
  }

  return followUp;
}

/** "Today's Follow-up List" per the SRS — leads whose follow-up date has arrived, role-visibility aware. */
export async function listTodaysFollowUps(session: Session) {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  return prisma.lead.findMany({
    where: {
      ...buildLeadVisibilityFilter(session),
      status: LeadStatus.FOLLOW_UP,
      nextFollowUpDate: { lte: endOfToday },
    },
    include: { source: true, assignedEmployee: true },
    orderBy: { nextFollowUpDate: "asc" },
  });
}
