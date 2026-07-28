import { getSessionOrThrow } from "@/lib/auth/session";
import { getManagerDashboard } from "@/lib/services/report.service";

export default async function ManagerDashboardPage() {
  const session = await getSessionOrThrow();
  const data = await getManagerDashboard(session);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">لوحة التحكم</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="عملاء جدد اليوم" value={data.todaysLeads} />
        <StatCard label="مكالمات اليوم" value={data.todaysCalls} />
        <StatCard label="مواعيد اليوم" value={data.todaysAppointments} />
        <StatCard label="تسجيلات اليوم" value={data.registrationsToday} />
        <StatCard label="نسبة التحويل" value={`${data.conversionRate.toFixed(0)}%`} />
        <StatCard label="متابعات معلقة" value={data.pendingFollowUps} />
        <StatCard label="لم يردوا اليوم" value={data.noAnswerToday} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div>
          <h2 className="mb-2 text-sm font-semibold">المكالمات حسب الموظف (اليوم)</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.callsPerEmployee.map((row) => (
                <tr key={row.name}>
                  <td className="py-1.5">{row.name}</td>
                  <td className="py-1.5 text-left font-medium">{row.count}</td>
                </tr>
              ))}
              {data.callsPerEmployee.length === 0 && (
                <tr>
                  <td className="py-1.5 text-gray-400">لا توجد مكالمات بعد</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold">أفضل الموظفين (تسجيلات)</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.topEmployees.map((row) => (
                <tr key={row.name}>
                  <td className="py-1.5">{row.name}</td>
                  <td className="py-1.5 text-left font-medium">{row.convertedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold">العملاء حسب المصدر</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.leadsBySource.map((row) => (
                <tr key={row.name}>
                  <td className="py-1.5">{row.name}</td>
                  <td className="py-1.5 text-left font-medium">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
