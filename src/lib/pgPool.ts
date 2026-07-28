import type { Pool } from "pg";
import { getTenantContext } from "@/lib/tenant/context";

/**
 * Used only by the queue engine (queue.service.ts) for its row-locking claim
 * transaction. Same Proxy pattern as @/lib/prisma — `pgPool.connect()`
 * resolves the current tenant's pool via AsyncLocalStorage, and everything
 * after `.connect()` (queries, BEGIN/COMMIT, `client.release()`) operates on
 * the real `PoolClient`, so `queue.service.ts` itself needs zero changes and
 * the existing `prisma.$transaction` + `@prisma/adapter-pg` corruption
 * mitigation (raw `pg` instead of Prisma's transaction API) stays exactly as
 * effective as it was single-tenant, per-tenant now.
 */
export const pgPool = new Proxy({} as Pool, {
  get(_target, prop) {
    const pool = getTenantContext().pgPool;
    const value = Reflect.get(pool as object, prop, pool);
    return typeof value === "function" ? value.bind(pool) : value;
  },
}) as Pool;
