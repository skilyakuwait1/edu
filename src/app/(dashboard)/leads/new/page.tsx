import { prisma } from "@/lib/prisma";
import { LeadForm } from "@/components/leads/LeadForm";
import { withTenantContext } from "@/lib/tenant/withTenantContext";

export default withTenantContext(async function NewLeadPage() {
  const sources = await prisma.source.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">عميل جديد</h1>
      <LeadForm sources={sources} />
    </div>
  );
});
