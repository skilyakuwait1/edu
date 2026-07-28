import { getSessionOrThrow, requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/tenant-client/client";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { SimpleEntityForm } from "@/components/settings/SimpleEntityForm";
import { EmployeeList } from "@/components/settings/EmployeeList";

export default async function EmployeesSettingsPage() {
  const session = await getSessionOrThrow();
  requireRole(session, [Role.SUPER_ADMIN]);
  const employees = await prisma.employee.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">الإعدادات</h1>
      <SettingsNav />
      <h2 className="mb-2 text-sm font-semibold">الموظفون</h2>
      <SimpleEntityForm endpoint="/api/employees" placeholder="اسم الموظف" />
      <EmployeeList items={employees} />
    </div>
  );
}
