import { Pool } from "pg";

const globalForPg = globalThis as unknown as { pgPool?: Pool };

/**
 * A plain node-postgres pool, used only by the queue engine (queue.service.ts)
 * for its row-locking claim transaction. `prisma.$transaction()` combined
 * with `@prisma/adapter-pg` 7.9.1 was found to corrupt the wire protocol
 * ("bind message supplies N parameters, but prepared statement \"\" requires
 * 0") when a transaction overlaps in time with other concurrent Prisma
 * calls on the same client — reproducible, not a one-off. Plain concurrent
 * Prisma calls without `$transaction` are unaffected, so the rest of the
 * app keeps using `prisma` from `@/lib/prisma` normally; only the queue
 * engine's actual multi-statement transaction goes through this pool
 * instead.
 */
export const pgPool =
  globalForPg.pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pgPool;
}
