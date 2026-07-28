import { auth } from "@/auth";
import { tenantContext } from "@/lib/tenant/context";
import { getTenantClients } from "@/lib/tenant/clientCache";
import { UnauthorizedError } from "@/lib/auth/session";

/**
 * Wrap every Route Handler export (`GET`/`POST`/`PATCH`/`DELETE`) and every
 * DB-touching Server Component page's default export with this. It decodes
 * the session (JWT only, no DB), resolves the tenant's cached clients, and
 * runs the wrapped function inside the AsyncLocalStorage context that
 * `@/lib/prisma` and `@/lib/pgPool` read from.
 *
 * Deliberately NOT applied at the (dashboard) layout level — see
 * src/lib/tenant/context.ts and the plan doc: React/Next's rendering of a
 * layout's `children` isn't guaranteed to run inside the same async-
 * causality chain as the layout's own function body, so context set there
 * can silently fail to reach a nested page's Prisma calls. Wrap each real
 * entry point directly instead.
 */
export function withTenantContext<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>,
) {
  return async (...args: Args): Promise<R> => {
    const session = await auth();
    if (!session?.user?.tenantId) {
      throw new UnauthorizedError();
    }
    const clients = await getTenantClients(session.user.tenantId);
    return tenantContext.run(
      { tenantId: session.user.tenantId, prisma: clients.prisma, pgPool: clients.pgPool },
      () => fn(...args),
    );
  };
}
