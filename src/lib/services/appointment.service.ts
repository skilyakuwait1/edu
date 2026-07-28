import { prisma } from "@/lib/prisma";
import { appendTimelineEvent } from "@/lib/services/timeline.service";
import { ForbiddenError, type Session } from "@/lib/auth/session";
import { AppointmentStatus, Role } from "@/generated/tenant-client/client";

/** SUPER_ADMIN/MANAGER see every appointment; AGENT only sees their own. */
export async function listAppointmentsForUser(session: Session) {
  return prisma.appointment.findMany({
    where: session.role === Role.AGENT ? { employeeId: session.employeeId ?? "__none__" } : {},
    include: { lead: true, branch: true, employee: true },
    orderBy: { date: "asc" },
  });
}

export async function updateAppointmentStatus(
  session: Session,
  appointmentId: string,
  status: AppointmentStatus,
) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) return null;

  if (session.role === Role.AGENT && appointment.employeeId !== session.employeeId) {
    throw new ForbiddenError("لا يمكنك تعديل هذا الموعد");
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status },
  });

  await appendTimelineEvent(prisma, {
    leadId: appointment.leadId,
    type: "APPOINTMENT_UPDATED",
    summary: `تم تحديث حالة الموعد إلى ${status}`,
    employeeId: session.employeeId,
  });

  return updated;
}
