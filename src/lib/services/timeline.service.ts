import { prisma } from "@/lib/prisma";
import type { Prisma, TimelineEventType } from "@/generated/tenant-client/client";

// Prisma.TransactionClient covers both a plain `prisma` call and a call made
// inside `prisma.$transaction(async (tx) => ...)` — callers that need the
// timeline row written atomically with their own change pass `tx`.
type Db = typeof prisma | Prisma.TransactionClient;

/**
 * The only sanctioned way to write to a lead's timeline: rows are
 * append-only and never updated or deleted (see schema.prisma comment on
 * LeadTimeline). Every mutating action on a lead should call this.
 */
export async function appendTimelineEvent(
  db: Db,
  params: {
    leadId: string;
    type: TimelineEventType;
    summary: string;
    metadata?: Prisma.InputJsonValue;
    employeeId?: string | null;
  },
) {
  return db.leadTimeline.create({
    data: {
      leadId: params.leadId,
      type: params.type,
      summary: params.summary,
      metadata: params.metadata,
      employeeId: params.employeeId ?? null,
    },
  });
}
