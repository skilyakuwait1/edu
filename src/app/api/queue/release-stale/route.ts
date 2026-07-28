import { NextResponse } from "next/server";
import { getSessionOrThrow, requireRole } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { releaseStaleAssignments } from "@/lib/services/queue.service";
import { Role } from "@/generated/prisma/client";

/**
 * Manual/cron-callable trigger for the queue's auto-release check. The MVP
 * relies on this running lazily wherever `refillQueue` fires, but this
 * endpoint exists so a real scheduler (Vercel Cron, etc.) can call it
 * directly in production later without further wiring.
 */
export async function POST() {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.SUPER_ADMIN, Role.MANAGER]);
    const result = await releaseStaleAssignments();
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
