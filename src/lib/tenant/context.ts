import { AsyncLocalStorage } from "node:async_hooks";
import type { PrismaClient } from "@/generated/tenant-client/client";
import type { Pool } from "pg";

export type TenantContextValue = {
  tenantId: string;
  prisma: PrismaClient;
  pgPool: Pool;
};

// A bare module-level variable would be a cross-request data race — Node can
// interleave concurrent requests within one process. AsyncLocalStorage gives
// each withTenantContext(...) call its own isolated store per async
// continuation, so concurrent requests for different tenants never cross wires.
export const tenantContext = new AsyncLocalStorage<TenantContextValue>();

/**
 * The only way service code (lead.service.ts, queue.service.ts, ...) reaches
 * the current tenant's clients — via the `prisma`/`pgPool` Proxies in
 * @/lib/prisma and @/lib/pgPool, which both call this internally.
 *
 * Throws loudly rather than returning a default: there is no safe default
 * in a physically-isolated-per-tenant model. A silent fallback here is the
 * one failure mode that could leak data across tenants instead of just
 * crashing, so any occurrence of this error in logs should be treated as a
 * P0, not a shrug — it means some entry point (a route handler or a
 * Server Component page) queried the database without being wrapped in
 * withTenantContext(...).
 */
export function getTenantContext(): TenantContextValue {
  const ctx = tenantContext.getStore();
  if (!ctx) {
    throw new Error(
      "No tenant context in scope — this code path ran outside withTenantContext(). " +
        "Every Route Handler and Server Component page that touches the database must be wrapped.",
    );
  }
  return ctx;
}
