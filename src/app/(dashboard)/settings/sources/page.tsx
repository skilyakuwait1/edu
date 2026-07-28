import { getSessionOrThrow, requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/tenant-client/client";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { SimpleEntityForm } from "@/components/settings/SimpleEntityForm";
import { EditableEntityList } from "@/components/settings/EditableEntityList";
import { withTenantContext } from "@/lib/tenant/withTenantContext";

export default withTenantContext(async function SourcesSettingsPage() {
  const session = await getSessionOrThrow();
  requireRole(session, [Role.SUPER_ADMIN]);
  const sources = await prisma.source.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">الإعدادات</h1>
      <SettingsNav />
      <h2 className="mb-2 text-sm font-semibold">مصادر العملاء</h2>
      <SimpleEntityForm endpoint="/api/sources" placeholder="اسم المصدر" />
      <EditableEntityList items={sources} endpoint="/api/sources" />
    </div>
  );
});
