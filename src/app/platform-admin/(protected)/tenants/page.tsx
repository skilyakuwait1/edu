import { platformPrisma } from "@/lib/platformPrisma";
import { TenantStatusToggle } from "@/components/platformAdmin/TenantStatusToggle";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "نشط",
  SUSPENDED: "موقوف",
};

export default async function TenantsPage() {
  const tenants = await platformPrisma.tenant.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">العملاء (المؤسسات)</h1>
      </div>

      <p className="mb-4 max-w-2xl text-sm text-gray-500">
        إضافة عميل جديد بتتم حاليًا من سطر الأوامر (<code>npm run db:tenant:provision</code>) —
        بعد التنفيذ هيظهر هنا تلقائيًا. الجدول ده بس لعرض العملاء الحاليين وإيقاف/تفعيل أي واحد
        منهم.
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-2 text-right font-medium">الاسم</th>
              <th className="px-4 py-2 text-right font-medium">الحالة</th>
              <th className="px-4 py-2 text-right font-medium">تاريخ الإنشاء</th>
              <th className="px-4 py-2 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {tenants.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-2 font-medium">{t.name}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      t.status === "ACTIVE"
                        ? "text-green-700 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }
                  >
                    {STATUS_LABELS[t.status]}
                  </span>
                </td>
                <td className="px-4 py-2">{new Date(t.createdAt).toLocaleDateString("ar-KW")}</td>
                <td className="px-4 py-2">
                  <TenantStatusToggle tenantId={t.id} status={t.status} />
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  لا يوجد عملاء بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
