import { getSessionOrThrow } from "@/lib/auth/session";
import { listAppointmentsForUser } from "@/lib/services/appointment.service";
import { AppointmentStatusSelect } from "@/components/appointments/AppointmentStatusSelect";

export default async function AppointmentsPage() {
  const session = await getSessionOrThrow();
  const appointments = await listAppointmentsForUser(session);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">المواعيد</h1>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-2 text-right font-medium">العميل</th>
              <th className="px-4 py-2 text-right font-medium">التاريخ</th>
              <th className="px-4 py-2 text-right font-medium">الوقت</th>
              <th className="px-4 py-2 text-right font-medium">الفرع</th>
              <th className="px-4 py-2 text-right font-medium">الموظف</th>
              <th className="px-4 py-2 text-right font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {appointments.map((apt) => (
              <tr key={apt.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                <td className="px-4 py-2 font-medium">{apt.lead.fullName}</td>
                <td className="px-4 py-2">{new Date(apt.date).toLocaleDateString("ar-KW")}</td>
                <td className="px-4 py-2" dir="ltr">
                  {apt.time}
                </td>
                <td className="px-4 py-2">{apt.branch?.name ?? "—"}</td>
                <td className="px-4 py-2">{apt.employee?.name ?? "—"}</td>
                <td className="px-4 py-2">
                  <AppointmentStatusSelect appointmentId={apt.id} status={apt.status} />
                </td>
              </tr>
            ))}
            {appointments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  لا توجد مواعيد بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
