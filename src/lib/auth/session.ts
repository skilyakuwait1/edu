import { auth } from "@/auth";
import { Prisma, Role } from "@/generated/tenant-client/client";

export type Session = {
  userId: string;
  email: string;
  role: Role;
  employeeId: string | null;
};

export class UnauthorizedError extends Error {
  constructor() {
    super("Not authenticated");
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Not permitted") {
    super(message);
  }
}

export async function getSession(): Promise<Session | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    userId: session.user.id,
    email: session.user.email ?? "",
    role: session.user.role,
    employeeId: session.user.employeeId,
  };
}

export async function getSessionOrThrow(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

export function requireRole(session: Session, roles: Role[]) {
  if (!roles.includes(session.role)) {
    throw new ForbiddenError("غير مصرح لك بالوصول لهذه الصفحة");
  }
}

/**
 * SUPER_ADMIN/MANAGER see every lead. AGENT sees leads assigned to them,
 * plus leads not yet claimed by anyone (AVAILABLE, assignedEmployeeId
 * null) — an unassigned lead isn't another agent's to keep private, and an
 * agent who manually creates one needs to see it before the queue picks it
 * back up. Only *acting* on a lead (call logging, follow-ups) stays
 * restricted to leads actually assigned to the agent.
 */
export function buildLeadVisibilityFilter(session: Session): Prisma.LeadWhereInput {
  if (session.role === Role.AGENT) {
    return { OR: [{ assignedEmployeeId: session.employeeId ?? "__none__" }, { assignedEmployeeId: null }] };
  }
  return {};
}
