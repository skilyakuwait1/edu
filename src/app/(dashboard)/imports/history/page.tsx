import { getSessionOrThrow, requireRole } from "@/lib/auth/session";
import { listImportLogs } from "@/lib/services/import.service";
import { Role } from "@/generated/tenant-client/client";
import { withTenantContext } from "@/lib/tenant/withTenantContext";

const STRATEGY_LABELS: Record<string, string> = {
  ADD_NEW_ONLY: "إضافة الجدد فقط",
  UPDATE_EXISTING: "تحديث الموجودين",
  MERGE: "دمج البيانات",
};

export default withTenantContext(async function ImportHistoryPage() {
  const session = await getSessionOrThrow();
  requireRole(session, [Role.SUPER_ADMIN, Role.MANAGER]);
  const logs = await listImportLogs();

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">سجل استيراد Excel</h1>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-2 text-right font-medium">اسم الملف</th>
              <th className="px-4 py-2 text-right font-medium">المستخدم</th>
              <th className="px-4 py-2 text-right font-medium">الصفوف</th>
              <th className="px-4 py-2 text-right font-medium">تمت الإضافة</th>
              <th className="px-4 py-2 text-right font-medium">التكرار</th>
              <th className="px-4 py-2 text-right font-medium">الأخطاء</th>
              <th className="px-4 py-2 text-right font-medium">الخيار</th>
              <th className="px-4 py-2 text-right font-medium">التاريخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-2">{log.fileName}</td>
                <td className="px-4 py-2">{log.user.email}</td>
                <td className="px-4 py-2">{log.rowCount}</td>
                <td className="px-4 py-2">{log.addedCount}</td>
                <td className="px-4 py-2">{log.duplicateCount}</td>
                <td className="px-4 py-2">{log.errorCount}</td>
                <td className="px-4 py-2">{STRATEGY_LABELS[log.strategy]}</td>
                <td className="px-4 py-2">{new Date(log.createdAt).toLocaleDateString("ar-KW")}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  لا يوجد سجل استيراد بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});
