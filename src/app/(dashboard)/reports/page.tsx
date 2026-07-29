import { getSessionOrThrow } from "@/lib/auth/session";
import { getReportSummary } from "@/lib/services/report.service";
import { withTenantContext } from "@/lib/tenant/withTenantContext";

const STRATEGY_LABELS: Record<string, string> = {
  ADD_NEW_ONLY: "إضافة الجدد فقط",
  UPDATE_EXISTING: "تحديث الموجودين",
  MERGE: "دمج البيانات",
};

export default withTenantContext(async function ReportsPage() {
  const session = await getSessionOrThrow();
  const report = await getReportSummary(session);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">التقارير</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="نسبة التحويل" value={`${report.conversionRate.toFixed(0)}%`} />
        <StatCard label="إجمالي المواعيد" value={report.appointmentsCount} />
        <StatCard label="التسجيلات" value={report.registrationsCount} />
        <StatCard label="عملاء مفقودون" value={report.lostCount} />
        <StatCard label="الالتزام بالمتابعات" value={`${report.followUpCompliance.toFixed(0)}%`} />
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">المكالمات اليومية (آخر 7 أيام)</h2>
        <div className="flex items-end gap-2">
          {report.dailyCalls.map((day) => (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-brand"
                style={{ height: `${Math.max(4, day.count * 8)}px` }}
                title={`${day.count}`}
              />
              <span className="text-xs text-gray-500">{day.count}</span>
              <span className="text-[10px] text-gray-400">{day.date}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-semibold">العملاء حسب المصدر</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {report.leadsBySource.map((row) => (
                <tr key={row.name}>
                  <td className="py-1.5">{row.name}</td>
                  <td className="py-1.5 text-left font-medium">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold">أداء الموظفين</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500">
                <th className="py-1.5 text-right font-medium">الموظف</th>
                <th className="py-1.5 text-right font-medium">العملاء</th>
                <th className="py-1.5 text-right font-medium">تسجيلات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {report.employeePerformance.map((row) => (
                <tr key={row.name}>
                  <td className="py-1.5">{row.name}</td>
                  <td className="py-1.5">{row.assignedCount}</td>
                  <td className="py-1.5">{row.convertedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold">آخر عمليات الاستيراد</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 text-right font-medium">الملف</th>
                <th className="px-4 py-2 text-right font-medium">الصفوف</th>
                <th className="px-4 py-2 text-right font-medium">تمت الإضافة</th>
                <th className="px-4 py-2 text-right font-medium">الخيار</th>
                <th className="px-4 py-2 text-right font-medium">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {report.importLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-2">{log.fileName}</td>
                  <td className="px-4 py-2">{log.rowCount}</td>
                  <td className="px-4 py-2">{log.addedCount}</td>
                  <td className="px-4 py-2">{STRATEGY_LABELS[log.strategy]}</td>
                  <td className="px-4 py-2">{new Date(log.createdAt).toLocaleDateString("ar-KW")}</td>
                </tr>
              ))}
              {report.importLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    لا يوجد سجل استيراد بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
