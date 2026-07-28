import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pgPool } from "@/lib/pgPool";
import { prisma } from "@/lib/prisma";
import { appendTimelineEvent } from "@/lib/services/timeline.service";
import { requireRole, type Session } from "@/lib/auth/session";
import { LeadStatus, Role } from "@/generated/tenant-client/client";

/** Prisma-based read for UI use (e.g. a settings page) — safe, not on the
 * concurrent claim path. See readSettingsRaw for the path that is. */
export async function getSettings() {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  return settings ?? { id: "singleton", queueSize: 20, inactivityTimeoutHours: 48 };
}

async function readSettingsRaw(client: PoolClient) {
  const res = await client.query<{ queueSize: number; inactivityTimeoutHours: number }>(
    `SELECT "queueSize", "inactivityTimeoutHours" FROM "Settings" WHERE id = 'singleton'`,
  );
  return res.rows[0] ?? { queueSize: 20, inactivityTimeoutHours: 48 };
}

type TimelineRow = {
  leadId: string;
  type: "RELEASED_TO_QUEUE" | "ASSIGNED_TO_EMPLOYEE";
  summary: string;
  employeeId: string | null;
};

async function insertTimelineRows(client: PoolClient, rows: TimelineRow[]) {
  if (rows.length === 0) return;
  const values: string[] = [];
  const params: unknown[] = [];
  rows.forEach((row, i) => {
    const base = i * 6;
    values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`);
    params.push(randomUUID(), row.leadId, row.type, row.summary, row.employeeId, new Date());
  });
  await client.query(
    `INSERT INTO "LeadTimeline" (id, "leadId", type, summary, "employeeId", "createdAt") VALUES ${values.join(", ")}`,
    params,
  );
}

/** Releases stale assignments using an already-open client/transaction — the
 * caller owns BEGIN/COMMIT. Shared by the standalone endpoint below and by
 * refillQueue, which folds this into its own single transaction. */
async function releaseStaleWithinClient(client: PoolClient) {
  const settings = await readSettingsRaw(client);
  const cutoff = new Date(Date.now() - settings.inactivityTimeoutHours * 60 * 60 * 1000);

  const released = await client.query<{ id: string }>(
    `UPDATE "Lead" SET status = 'AVAILABLE', "assignedEmployeeId" = NULL, "updatedAt" = now()
     WHERE status = 'ASSIGNED' AND "assignedEmployeeId" IN (
       SELECT id FROM "Employee" WHERE "lastActiveAt" < $1
     )
     RETURNING id`,
    [cutoff],
  );

  await insertTimelineRows(
    client,
    released.rows.map((r) => ({
      leadId: r.id,
      type: "RELEASED_TO_QUEUE" as const,
      summary: "تم إرجاع العميل للطابور بسبب عدم نشاط الموظف",
      employeeId: null,
    })),
  );

  return released.rows.length;
}

/**
 * Releases leads assigned to employees who have gone quiet for longer than
 * `inactivityTimeoutHours`. This is a lazy check (no cron in the MVP) —
 * `refillQueue` folds the same logic into its own transaction, and this
 * standalone version exists for `/api/queue/release-stale` so a future real
 * cron can call it directly. Idempotent: re-running it on already-released
 * leads is a harmless no-op.
 */
export async function releaseStaleAssignments() {
  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");
    const released = await releaseStaleWithinClient(client);
    await client.query("COMMIT");
    return { released };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type RefillResult = {
  reactivatedFollowUps: number;
  claimedNew: number;
  activeCount: number;
};

/**
 * Tops the given employee's active lead set back up to `queueSize`. This is
 * the queue engine's core operation — a real SQL transaction (via a plain
 * `pg` client, see pgPool.ts) with `FOR UPDATE SKIP LOCKED`: if two refills
 * race (e.g. two agents finishing calls at the same instant), each locks
 * and skips rows the other has already grabbed, so no lead is ever claimed
 * by two employees at once. Verified with a concurrent two-agent claim
 * script during development. Deliberately avoids the Prisma client for
 * every step (not just the transaction) — see pgPool.ts.
 *
 * Call this after any action that can move a lead out of an employee's
 * active set (call logged, manual status change) and on login.
 */
export async function refillQueue(employeeId: string): Promise<RefillResult> {
  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");

    await releaseStaleWithinClient(client);
    const settings = await readSettingsRaw(client);

    const activeRes = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM "Lead" WHERE "assignedEmployeeId" = $1 AND status = 'ASSIGNED'`,
      [employeeId],
    );
    const activeCount = Number(activeRes.rows[0].count);

    let needed = settings.queueSize - activeCount;
    let reactivatedFollowUps = 0;
    let claimedNew = 0;

    if (needed > 0) {
      const ownFollowUps = await client.query<{ id: string }>(
        `SELECT id FROM "Lead"
         WHERE status = 'FOLLOW_UP' AND "assignedEmployeeId" = $1 AND "nextFollowUpDate" <= now()
         ORDER BY "nextFollowUpDate" ASC
         LIMIT $2
         FOR UPDATE SKIP LOCKED`,
        [employeeId, needed],
      );

      if (ownFollowUps.rows.length > 0) {
        const ids = ownFollowUps.rows.map((r) => r.id);
        await client.query(
          `UPDATE "Lead" SET status = 'ASSIGNED', "updatedAt" = now() WHERE id = ANY($1::text[])`,
          [ids],
        );
        await insertTimelineRows(
          client,
          ids.map((leadId) => ({
            leadId,
            type: "ASSIGNED_TO_EMPLOYEE" as const,
            summary: "عاد العميل لنفس الموظف عند حلول موعد المتابعة",
            employeeId,
          })),
        );
        reactivatedFollowUps = ids.length;
        needed -= ids.length;
      }
    }

    if (needed > 0) {
      const claimable = await client.query<{ id: string }>(
        `SELECT id FROM "Lead" WHERE status = 'AVAILABLE' ORDER BY "createdAt" ASC LIMIT $1 FOR UPDATE SKIP LOCKED`,
        [needed],
      );

      if (claimable.rows.length > 0) {
        const ids = claimable.rows.map((r) => r.id);
        await client.query(
          `UPDATE "Lead" SET status = 'ASSIGNED', "assignedEmployeeId" = $2, "updatedAt" = now() WHERE id = ANY($1::text[])`,
          [ids, employeeId],
        );
        await insertTimelineRows(
          client,
          ids.map((leadId) => ({
            leadId,
            type: "ASSIGNED_TO_EMPLOYEE" as const,
            summary: "تم تعيين العميل تلقائياً من الطابور",
            employeeId,
          })),
        );
        claimedNew = ids.length;
      }
    }

    await client.query("COMMIT");

    return {
      reactivatedFollowUps,
      claimedNew,
      activeCount: activeCount + reactivatedFollowUps + claimedNew,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** The agent's current active worklist, oldest-claimed first. */
export async function listActiveLeadsForEmployee(employeeId: string) {
  return prisma.lead.findMany({
    where: { assignedEmployeeId: employeeId, status: LeadStatus.ASSIGNED },
    include: { source: true },
    orderBy: { updatedAt: "asc" },
  });
}

/** "Next Customer" quick button: the longest-waiting lead in the agent's active set. */
export async function getNextCustomer(employeeId: string) {
  await refillQueue(employeeId);
  return prisma.lead.findFirst({
    where: { assignedEmployeeId: employeeId, status: LeadStatus.ASSIGNED },
    include: { source: true },
    orderBy: { updatedAt: "asc" },
  });
}

/**
 * Manager/Super Admin override: hand a specific lead directly to a specific
 * employee, bypassing the queue's own draw. This is the "Reassign Leads" /
 * "Assign leads" permission from the SRS's role list — an exception path
 * for correcting mistakes or escalations, not how leads are assigned day to
 * day (that's exclusively refillQueue's job).
 */
export async function reassignLead(session: Session, leadId: string, employeeId: string) {
  requireRole(session, [Role.SUPER_ADMIN, Role.MANAGER]);

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return null;

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: { status: LeadStatus.ASSIGNED, assignedEmployeeId: employeeId },
  });

  await appendTimelineEvent(prisma, {
    leadId,
    type: "ASSIGNED_TO_EMPLOYEE",
    summary: "تم إعادة تعيين العميل يدوياً بواسطة المدير",
    employeeId,
  });

  await prisma.activityLog.create({
    data: {
      userId: session.userId,
      action: "LEAD_REASSIGNED",
      entityType: "Lead",
      entityId: leadId,
      metadata: { from: lead.assignedEmployeeId, to: employeeId },
    },
  });

  return updated;
}
