import { getSessionOrThrow, requireRole } from "@/lib/auth/session";
import { getSettings } from "@/lib/services/queue.service";
import { Role } from "@/generated/prisma/client";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { QueueSettingsForm } from "@/components/settings/QueueSettingsForm";

export default async function QueueSettingsPage() {
  const session = await getSessionOrThrow();
  requireRole(session, [Role.SUPER_ADMIN]);
  const settings = await getSettings();

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">الإعدادات</h1>
      <SettingsNav />
      <h2 className="mb-2 text-sm font-semibold">إعدادات الطابور</h2>
      <p className="mb-4 max-w-sm text-sm text-gray-500">
        يتحكم هذا في عدد العملاء النشطين لكل موظف، وفي متى يُرجع النظام عملاء الموظف غير النشط
        تلقائياً إلى الطابور.
      </p>
      <QueueSettingsForm queueSize={settings.queueSize} inactivityTimeoutHours={settings.inactivityTimeoutHours} />
    </div>
  );
}
