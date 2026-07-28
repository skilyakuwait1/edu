import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/validation/phone";
import type { LeadCreateInput } from "@/lib/validation/leadSchema";
import { appendTimelineEvent } from "@/lib/services/timeline.service";
import { refillQueue } from "@/lib/services/queue.service";
import { buildLeadVisibilityFilter, ForbiddenError, type Session } from "@/lib/auth/session";
import { Prisma, Role, LeadStatus } from "@/generated/tenant-client/client";

export type ExistingLeadSummary = {
  id: string;
  fullName: string;
  status: string;
  assignedEmployeeName: string | null;
  lastContactDate: Date | null;
  lastFollowUpNote: string | null;
  lastFollowUpDate: Date | null;
};

export class DuplicateLeadError extends Error {
  existing: ExistingLeadSummary;
  constructor(existing: ExistingLeadSummary) {
    super("العميل موجود مسبقاً");
    this.existing = existing;
  }
}

export class InvalidPhoneError extends Error {
  constructor(reason: string) {
    super(reason);
  }
}

async function findExistingLeadSummary(normalizedPhone: string): Promise<ExistingLeadSummary | null> {
  const lead = await prisma.lead.findUnique({
    where: { phone: normalizedPhone },
    include: {
      assignedEmployee: { select: { name: true } },
      followUps: {
        orderBy: { followUpDate: "desc" },
        take: 1,
      },
    },
  });
  if (!lead) return null;

  return {
    id: lead.id,
    fullName: lead.fullName,
    status: lead.status,
    assignedEmployeeName: lead.assignedEmployee?.name ?? null,
    lastContactDate: lead.lastContactDate,
    lastFollowUpNote: lead.followUps[0]?.notes ?? null,
    lastFollowUpDate: lead.followUps[0]?.followUpDate ?? null,
  };
}

/** Live duplicate check used by the create-lead form before submitting. */
export async function checkDuplicatePhone(rawPhone: string): Promise<ExistingLeadSummary | null> {
  const result = normalizePhone(rawPhone);
  if (!result.valid) return null;
  return findExistingLeadSummary(result.normalized);
}

export async function createLead(input: LeadCreateInput) {
  const phoneResult = normalizePhone(input.phone);
  if (!phoneResult.valid) {
    throw new InvalidPhoneError(phoneResult.reason);
  }

  const existing = await findExistingLeadSummary(phoneResult.normalized);
  if (existing) {
    throw new DuplicateLeadError(existing);
  }

  const lead = await prisma.lead.create({
    data: {
      fullName: input.fullName,
      phone: phoneResult.normalized,
      phoneRaw: input.phone,
      email: input.email || null,
      studyGrade: input.studyGrade || null,
      area: input.area || null,
      sourceId: input.sourceId,
      interestLevel: input.interestLevel || null,
      notes: input.notes || null,
      status: LeadStatus.AVAILABLE,
    },
    include: { source: true },
  });

  await appendTimelineEvent(prisma, {
    leadId: lead.id,
    type: "LEAD_CREATED",
    summary: `تم إنشاء العميل من مصدر ${lead.source.name}`,
  });

  return lead;
}

export type LeadListFilters = {
  status?: string;
  search?: string;
  /** 1-indexed. Omit for page 1. */
  page?: number;
  /** Defaults to 50 — this list is never fetched unbounded, even at 1000+ leads. */
  pageSize?: number;
};

/** The only sanctioned way to list leads — always applies role-based visibility, always paginated. */
export async function listLeadsForUser(session: Session, filters: LeadListFilters = {}) {
  const where: Prisma.LeadWhereInput = {
    ...buildLeadVisibilityFilter(session),
  };

  if (filters.status) {
    where.status = filters.status as Prisma.EnumLeadStatusFilter["equals"];
  }

  if (filters.search) {
    const phoneAttempt = normalizePhone(filters.search);
    where.OR = [
      { fullName: { contains: filters.search, mode: "insensitive" } },
      { phoneRaw: { contains: filters.search } },
      { studyGrade: { contains: filters.search, mode: "insensitive" } },
      { area: { contains: filters.search, mode: "insensitive" } },
      ...(phoneAttempt.valid ? [{ phone: phoneAttempt.normalized }] : []),
    ];
  }

  const pageSize = filters.pageSize ?? 50;
  const page = Math.max(1, filters.page ?? 1);

  const [total, leads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      include: {
        source: true,
        assignedEmployee: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { leads, total, page, pageSize };
}

/** Leads created today (not "currently AVAILABLE" — genuinely added today), role-visibility aware. */
export async function countNewLeadsToday(session: Session) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  return prisma.lead.count({
    where: {
      ...buildLeadVisibilityFilter(session),
      createdAt: { gte: start },
    },
  });
}

export async function getLeadForUser(session: Session, leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      source: true,
      assignedEmployee: true,
      timeline: { orderBy: { createdAt: "desc" } },
      callLogs: { orderBy: { calledAt: "desc" }, include: { employee: true } },
      followUps: { orderBy: { followUpDate: "desc" }, include: { employee: true } },
      appointments: { orderBy: { date: "desc" }, include: { branch: true, employee: true } },
    },
  });
  if (!lead) return null;

  if (
    session.role === Role.AGENT &&
    lead.assignedEmployeeId !== null &&
    lead.assignedEmployeeId !== session.employeeId
  ) {
    throw new ForbiddenError("لا يمكنك عرض هذا العميل");
  }

  return lead;
}

/** Manual status override (e.g. by a manager correcting a mistake). Agents drive
 * status changes through call logging instead — see call-log.service.ts. */
export async function updateLeadStatus(session: Session, leadId: string, status: LeadStatus) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return null;

  if (session.role === Role.AGENT && lead.assignedEmployeeId !== session.employeeId) {
    throw new ForbiddenError("لا يمكنك تعديل هذا العميل");
  }

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: { status },
  });

  await appendTimelineEvent(prisma, {
    leadId,
    type: "STATUS_CHANGED",
    summary: `تم تغيير الحالة إلى ${status}`,
    metadata: { from: lead.status, to: status },
    employeeId: session.employeeId,
  });

  await prisma.activityLog.create({
    data: {
      userId: session.userId,
      action: "LEAD_STATUS_CHANGED",
      entityType: "Lead",
      entityId: leadId,
      metadata: { from: lead.status, to: status },
    },
  });

  if (lead.status === LeadStatus.ASSIGNED && status !== LeadStatus.ASSIGNED && lead.assignedEmployeeId) {
    await refillQueue(lead.assignedEmployeeId);
  }

  return updated;
}
