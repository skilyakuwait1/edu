import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/tenant-client/client";
import { refillQueue } from "../src/lib/services/queue.service";
import { tenantContext } from "../src/lib/tenant/context";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

// queue.service.ts reaches the DB through the @/lib/prisma and @/lib/pgPool
// Proxies, which resolve from AsyncLocalStorage — this script isn't running
// inside withTenantContext (no HTTP request, no session), so it establishes
// the same context directly, exactly as the multi-tenant docs describe.
function runInTenantContext<T>(fn: () => Promise<T>): Promise<T> {
  return tenantContext.run({ tenantId: "verify-queue-script", prisma, pgPool }, fn);
}

async function main() {
  const source = await prisma.source.findFirstOrThrow();

  await prisma.leadTimeline.deleteMany({});
  await prisma.callLog.deleteMany({});
  await prisma.followUp.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.lead.deleteMany({ where: { phone: { startsWith: "9990" } } });
  await prisma.employee.deleteMany({ where: { name: { startsWith: "TestAgent" } } });

  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: { queueSize: 5 },
    create: { id: "singleton", queueSize: 5, inactivityTimeoutHours: 48 },
  });

  const agentA = await prisma.employee.create({ data: { name: "TestAgentA" } });
  const agentB = await prisma.employee.create({ data: { name: "TestAgentB" } });

  const leads = await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      prisma.lead.create({
        data: {
          fullName: `Test Lead ${i}`,
          phone: `9990000${String(i).padStart(3, "0")}`,
          sourceId: source.id,
        },
      }),
    ),
  );
  console.log(`Created ${leads.length} AVAILABLE leads, queueSize=5, 2 agents (demand 10 > supply 8).`);

  const [resA, resB] = await runInTenantContext(() =>
    Promise.all([refillQueue(agentA.id), refillQueue(agentB.id)]),
  );
  console.log("Agent A refill result:", resA);
  console.log("Agent B refill result:", resB);

  const assignedToA = await prisma.lead.count({ where: { assignedEmployeeId: agentA.id, status: "ASSIGNED" } });
  const assignedToB = await prisma.lead.count({ where: { assignedEmployeeId: agentB.id, status: "ASSIGNED" } });
  const stillAvailable = await prisma.lead.count({ where: { status: "AVAILABLE", phone: { startsWith: "9990" } } });

  console.log(`Assigned to A: ${assignedToA}, Assigned to B: ${assignedToB}, still AVAILABLE: ${stillAvailable}`);

  const total = assignedToA + assignedToB + stillAvailable;
  if (total !== 8) {
    console.error(`FAIL: total leads accounted for (${total}) != 8 — leads were lost or duplicated!`);
    process.exitCode = 1;
  } else if (assignedToA + assignedToB !== 8) {
    console.error("FAIL: expected all 8 leads claimed (demand 10 > supply 8).");
    process.exitCode = 1;
  } else {
    console.log("PASS: no lead double-assigned, all 8 leads claimed exactly once across the two agents.");
  }

  const leadIds = leads.map((l) => l.id);
  await prisma.leadTimeline.deleteMany({ where: { leadId: { in: leadIds } } });
  await prisma.lead.deleteMany({ where: { id: { in: leadIds } } });
  await prisma.employee.deleteMany({ where: { id: { in: [agentA.id, agentB.id] } } });
  await prisma.settings.update({ where: { id: "singleton" }, data: { queueSize: 20 } });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pgPool.end();
  });
