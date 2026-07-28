import type { PrismaClient } from "@/generated/tenant-client/client";
import { getTenantContext } from "@/lib/tenant/context";

// Every existing `prisma.lead.findMany(...)`-shaped call site across all
// service files and API routes keeps working unmodified: the `get` trap
// fires once for `prisma.lead` (returns the real client's already-correctly-
// bound `lead` delegate), and `.findMany(...)` is then called directly on
// that real object.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getTenantContext().prisma;
    const value = Reflect.get(client as object, prop, client);
    // Prisma's generated client relies on internal state via `this` — an
    // unbound trapped function would be called with `this` = the Proxy
    // object, not the real client, breaking anything beyond the
    // `prisma.lead.findMany(...)`-shaped calls (e.g. `$disconnect`).
    // Always rebind to the real client.
    return typeof value === "function" ? value.bind(client) : value;
  },
}) as PrismaClient;
