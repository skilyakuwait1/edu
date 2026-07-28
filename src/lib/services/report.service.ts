import { prisma } from "@/lib/prisma";
import { LeadStatus, Role } from "@/generated/tenant-client/client";
import { requireRole, type Session } from "@/lib/auth/session";
import { listActiveLeadsForEmployee, releaseStaleAssignments } from "@/lib/services/queue.service";
import { listTodaysFollowUps } from "@/lib/services/followUp.service";
import { listImportLogs } from "@/lib/services/import.service";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Data for the agent's Daily Work Screen — the screen used most of the day. */
export async function getDailyWorkScreenData(session: Session) {
  await releaseStaleAssignments();

  const start = startOfToday();
  const end = endOfToday();
  const employeeId = session.employeeId;

  const [activeQueue, completedCallsToday, todaysAppointments, todaysFollowUps] = await Promise.all([
    employeeId ? listActiveLeadsForEmployee(employeeId) : Promise.resolve([]),
    employeeId
      ? prisma.callLog.count({ where: { employeeId, calledAt: { gte: start, lte: end } } })
      : Promise.resolve(0),
    employeeId
      ? prisma.appointment.findMany({
          where: { employeeId, date: { gte: start, lte: end } },
          include: { lead: true, branch: true },
          orderBy: { time: "asc" },
        })
      : Promise.resolve([]),
    listTodaysFollowUps(session),
  ]);

  return { activeQueue, completedCallsToday, todaysAppointments, todaysFollowUps };
}

/** Manager Dashboard aggregates per the SRS: today's leads/calls/appointments/
 * registrations, conversion rate, calls per employee, pending follow-ups,
 * no-answer leads, top employees, lead sources. */
export async function getManagerDashboard(session: Session) {
  requireRole(session, [Role.SUPER_ADMIN, Role.MANAGER]);
  await releaseStaleAssignments();

  const start = startOfToday();
  const end = endOfToday();

  // Sequential, not Promise.all: the local Prisma dev database (see pgPool.ts)
  // has been observed dropping connections under a burst of ~10+ truly
  // simultaneous queries from one client. A dashboard load runs once per
  // page view, so the small latency cost here is worth the reliability.
  const todaysLeads = await prisma.lead.count({ where: { createdAt: { gte: start, lte: end } } });
  const todaysCalls = await prisma.callLog.count({ where: { calledAt: { gte: start, lte: end } } });
  const todaysAppointments = await prisma.appointment.count({ where: { date: { gte: start, lte: end } } });
  const registrationsToday = await prisma.lead.count({
    where: { status: LeadStatus.CONVERTED, updatedAt: { gte: start, lte: end } },
  });
  const totalLeads = await prisma.lead.count();
  const convertedCount = await prisma.lead.count({ where: { status: LeadStatus.CONVERTED } });
  const pendingFollowUps = await prisma.lead.count({ where: { status: LeadStatus.FOLLOW_UP } });
  const noAnswerToday = await prisma.callLog.count({
    where: { result: "NO_ANSWER", calledAt: { gte: start, lte: end } },
  });
  const callsPerEmployeeRaw = await prisma.callLog.groupBy({
    by: ["employeeId"],
    _count: { _all: true },
    where: { calledAt: { gte: start, lte: end } },
  });
  const leadsBySourceRaw = await prisma.lead.groupBy({ by: ["sourceId"], _count: { _all: true } });
  const employees = await prisma.employee.findMany({ where: { isActive: true } });
  const sources = await prisma.source.findMany();

  const conversionRate = totalLeads > 0 ? (convertedCount / totalLeads) * 100 : 0;

  const callsPerEmployee = callsPerEmployeeRaw
    .map((row) => ({
      name: employees.find((e) => e.id === row.employeeId)?.name ?? "غير معروف",
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  const leadsBySource = leadsBySourceRaw.map((row) => ({
    name: sources.find((s) => s.id === row.sourceId)?.name ?? "غير معروف",
    count: row._count._all,
  }));

  const topEmployees: { name: string; convertedCount: number }[] = [];
  for (const emp of employees) {
    const empConvertedCount = await prisma.lead.count({
      where: { assignedEmployeeId: emp.id, status: LeadStatus.CONVERTED },
    });
    topEmployees.push({ name: emp.name, convertedCount: empConvertedCount });
  }
  topEmployees.sort((a, b) => b.convertedCount - a.convertedCount);

  return {
    todaysLeads,
    todaysCalls,
    todaysAppointments,
    registrationsToday,
    conversionRate,
    pendingFollowUps,
    noAnswerToday,
    callsPerEmployee,
    leadsBySource,
    topEmployees: topEmployees.slice(0, 5),
  };
}

/**
 * The dedicated Reports page per the SRS's MVP checklist (distinct from the
 * Manager Dashboard): Daily Calls, Employee Performance, Lead Sources,
 * Conversion Rate, Appointments, Registrations, Lost Leads, Follow-up
 * Compliance, Import Reports.
 *
 * Follow-up Compliance is approximated as the share of currently
 * FOLLOW_UP-status leads whose nextFollowUpDate hasn't already passed —
 * the SRS doesn't define the metric precisely, and this is the closest
 * proxy available without dedicated "was this follow-up done on time"
 * instrumentation.
 */
export async function getReportSummary(session: Session) {
  requireRole(session, [Role.SUPER_ADMIN, Role.MANAGER]);

  const totalLeads = await prisma.lead.count();
  const convertedCount = await prisma.lead.count({ where: { status: LeadStatus.CONVERTED } });
  const lostCount = await prisma.lead.count({ where: { status: LeadStatus.LOST } });
  const appointmentsCount = await prisma.appointment.count();
  const conversionRate = totalLeads > 0 ? (convertedCount / totalLeads) * 100 : 0;

  const totalFollowUpLeads = await prisma.lead.count({ where: { status: LeadStatus.FOLLOW_UP } });
  const overdueFollowUps = await prisma.lead.count({
    where: { status: LeadStatus.FOLLOW_UP, nextFollowUpDate: { lt: new Date() } },
  });
  const followUpCompliance =
    totalFollowUpLeads > 0 ? ((totalFollowUpLeads - overdueFollowUps) / totalFollowUpLeads) * 100 : 100;

  const leadsBySourceRaw = await prisma.lead.groupBy({ by: ["sourceId"], _count: { _all: true } });
  const sources = await prisma.source.findMany();
  const leadsBySource = leadsBySourceRaw.map((row) => ({
    name: sources.find((s) => s.id === row.sourceId)?.name ?? "غير معروف",
    count: row._count._all,
  }));

  const employees = await prisma.employee.findMany({ where: { isActive: true } });
  const employeePerformance: { name: string; assignedCount: number; convertedCount: number }[] = [];
  for (const emp of employees) {
    const assignedCount = await prisma.lead.count({ where: { assignedEmployeeId: emp.id } });
    const empConvertedCount = await prisma.lead.count({
      where: { assignedEmployeeId: emp.id, status: LeadStatus.CONVERTED },
    });
    employeePerformance.push({ name: emp.name, assignedCount, convertedCount: empConvertedCount });
  }

  const dailyCalls: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    const count = await prisma.callLog.count({ where: { calledAt: { gte: day, lte: dayEnd } } });
    dailyCalls.push({ date: day.toLocaleDateString("ar-KW"), count });
  }

  const importLogs = await listImportLogs();

  return {
    conversionRate,
    appointmentsCount,
    registrationsCount: convertedCount,
    lostCount,
    followUpCompliance,
    leadsBySource,
    employeePerformance,
    dailyCalls,
    importLogs: importLogs.slice(0, 10),
  };
}
