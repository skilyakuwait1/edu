import { getSessionOrThrow, requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/tenant-client/client";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { WatiSettingsForm } from "@/components/settings/WatiSettingsForm";
import { withTenantContext } from "@/lib/tenant/withTenantContext";

export default withTenantContext(async function IntegrationsSettingsPage() {
  const session = await getSessionOrThrow();
  requireRole(session, [Role.SUPER_ADMIN]);
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">الإعدادات</h1>
      <SettingsNav />
      <h2 className="mb-2 text-sm font-semibold">تكامل واتساب (WATI)</h2>
      <p className="mb-4 max-w-md text-sm text-gray-500">
        بعد ربط حسابكم في WATI، سيظهر زر &quot;تذكير واتي&quot; في صفحة كل عميل لإرسال رسالة تذكير
        عبر واتساب مباشرة من هنا.
      </p>
      <WatiSettingsForm
        initial={{
          watiApiEndpoint: settings?.watiApiEndpoint ?? "",
          watiTemplateName: settings?.watiTemplateName ?? "",
          watiApiKeySet: Boolean(settings?.watiApiKey),
        }}
      />
    </div>
  );
});
