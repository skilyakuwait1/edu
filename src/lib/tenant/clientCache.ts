import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/tenant-client/client";
import { Pool } from "pg";
import { platformPrisma } from "@/lib/platformPrisma";

export class TenantNotFoundError extends Error {
  constructor(tenantId: string) {
    super(`Tenant ${tenantId} not found or not active`);
  }
}

type CachedTenantClients = { prisma: PrismaClient; pgPool: Pool };

const globalForTenants = globalThis as unknown as {
  tenantClients?: Map<string, CachedTenantClients>;
};

// Create-on-first-use, capped Map keyed by tenantId. Degrades gracefully on
// a cold process start (empty Map, first request per tenant pays one
// platform-DB lookup + client construction) — no code path here assumes
// persistence across restarts, it just benefits from it when available.
const cache = globalForTenants.tenantClients ?? new Map<string, CachedTenantClients>();
globalForTenants.tenantClients = cache;

// Each cached tenant holds a PrismaPg-adapter-backed pool *and* a 3-connection
// pg.Pool for the queue engine. Size this against the DB provider's actual
// per-project/per-branch connection ceiling and how many tenants are
// realistically simultaneously active — not the total tenant count.
const MAX_CACHED_TENANTS = 50;

async function disposeClients(clients: CachedTenantClients) {
  await clients.prisma.$disconnect().catch(() => {});
  await clients.pgPool.end().catch(() => {});
}

export async function getTenantClients(tenantId: string): Promise<CachedTenantClients> {
  const existing = cache.get(tenantId);
  if (existing) {
    // Re-insert to move to the "most recently used" end for the eviction below.
    cache.delete(tenantId);
    cache.set(tenantId, existing);
    return existing;
  }

  const tenant = await platformPrisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant || tenant.status !== "ACTIVE") {
    throw new TenantNotFoundError(tenantId);
  }

  const adapter = new PrismaPg({ connectionString: tenant.databaseUrl });
  const clients: CachedTenantClients = {
    prisma: new PrismaClient({ adapter }),
    pgPool: new Pool({ connectionString: tenant.databaseUrl, max: 3 }),
  };

  if (cache.size >= MAX_CACHED_TENANTS) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) {
      const evicted = cache.get(oldestKey);
      cache.delete(oldestKey);
      if (evicted) await disposeClients(evicted);
    }
  }

  cache.set(tenantId, clients);
  return clients;
}
