import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { appendTimelineEvent } from "@/lib/services/timeline.service";
import { refillQueue } from "@/lib/services/queue.service";
import { ForbiddenError, type Session } from "@/lib/auth/session";
import { CallResult, LeadStatus, Role } from "@/generated/prisma/client";
import type { CallLogCreateInput } from "@/lib/validation/callLogSchema";

export class MissingFollowUpDateError extends Error {
  constructor() {
    super("موعد المتابعة مطلوب لهذه النتيجة");
  }
}

export class MissingAppointmentDetailsError extends Error {
  constructor() {
    super("تفاصيل الموعد مطلوبة");
  }
}

const FOLLOW_UP_DEFAULT_DAYS = 5;

// See magical-cooking-oasis.md for the reasoning: every result except the
// two terminal ones and APPOINTMENT_BOOKED now routes through FOLLOW_UP and
// immediately vacates the agent's active slot.
const STATUS_BY_RESULT: Record<CallResult, LeadStatus> = {
  INTERESTED: LeadStatus.FOLLOW_UP,
  NO_ANSWER: LeadStatus.FOLLOW_UP,
  BUSY: LeadStatus.FOLLOW_UP,
  NEED_FOLLOW_UP: LeadStatus.FOLLOW_UP,
  CALL_BACK_LATER: LeadStatus.FOLLOW_UP,
  WRONG_NUMBER: LeadStatus.LOST,
  NOT_INTERESTED: LeadStatus.LOST,
  APPOINTMENT_BOOKED: LeadStatus.COMPLETED,
  REGISTERED: LeadStatus.CONVERTED,
};

const RESULTS_WITH_DEFAULT_FOLLOW_UP = new Set<CallResult>([
  CallResult.INTERESTED,
  CallResult.NO_ANSWER,
  CallResult.BUSY,
]);

const RESULTS_REQUIRING_FOLLOW_UP_DATE = new Set<CallResult>([
  CallResult.NEED_FOLLOW_UP,
  CallResult.CALL_BACK_LATER,
]);

export async function logCall(session: Session, input: CallLogCreateInput) {
  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) return null;

  if (session.role === Role.AGENT && lead.assignedEmployeeId !== session.employeeId) {
    throw new ForbiddenError("لا يمكنك تسجيل مكالمة لهذا العميل");
  }
  if (!session.employeeId) {
    throw new ForbiddenError("هذا الحساب غير مرتبط بموظف");
  }

  let nextFollowUpDate: Date | null = null;
  if (RESULTS_REQUIRING_FOLLOW_UP_DATE.has(input.result)) {
    if (!input.nextFollowUpDate) throw new MissingFollowUpDateError();
    nextFollowUpDate = new Date(input.nextFollowUpDate);
  } else if (RESULTS_WITH_DEFAULT_FOLLOW_UP.has(input.result)) {
    nextFollowUpDate = input.nextFollowUpDate
      ? new Date(input.nextFollowUpDate)
      : addDays(new Date(), FOLLOW_UP_DEFAULT_DAYS);
  }

  if (input.result === CallResult.APPOINTMENT_BOOKED && !input.appointment) {
    throw new MissingAppointmentDetailsError();
  }

  const newStatus = STATUS_BY_RESULT[input.result];
  const employeeId = session.employeeId;

  const callLog = await prisma.callLog.create({
    data: {
      leadId: input.leadId,
      employeeId,
      result: input.result,
      durationSeconds: input.durationSeconds ?? null,
      notes: input.notes ?? null,
    },
  });

  await prisma.lead.update({
    where: { id: input.leadId },
    data: {
      status: newStatus,
      lastContactDate: new Date(),
      nextFollowUpDate,
    },
  });

  await appendTimelineEvent(prisma, {
    leadId: input.leadId,
    type: "CALL_LOGGED",
    summary: `تم تسجيل مكالمة - النتيجة: ${input.result}`,
    metadata: { result: input.result, notes: input.notes ?? undefined },
    employeeId,
  });

  if (input.result === CallResult.APPOINTMENT_BOOKED && input.appointment) {
    await prisma.appointment.create({
      data: {
        leadId: input.leadId,
        date: new Date(input.appointment.date),
        time: input.appointment.time,
        branchId: input.appointment.branchId || null,
        employeeId,
      },
    });

    await appendTimelineEvent(prisma, {
      leadId: input.leadId,
      type: "APPOINTMENT_BOOKED",
      summary: `تم حجز موعد بتاريخ ${input.appointment.date} الساعة ${input.appointment.time}`,
      employeeId,
    });
  }

  if (lead.status === LeadStatus.ASSIGNED && lead.assignedEmployeeId) {
    await refillQueue(lead.assignedEmployeeId);
  }

  return callLog;
}
