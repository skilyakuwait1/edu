import { getSessionOrThrow, requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/tenant-client/client";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { UserForm } from "@/components/settings/UserForm";
import { UserList } from "@/components/settings/UserList";
import { withTenantContext } from "@/lib/tenant/withTenantContext";

export default withTenantContext(async function UsersSettingsPage() {
  const session = await getSessionOrThrow();
  requireRole(session, [Role.SUPER_ADMIN]);

  const [users, employees] = await Promise.all([
    prisma.user.findMany({ include: { employee: true }, orderBy: { createdAt: "desc" } }),
    prisma.employee.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">الإعدادات</h1>
      <SettingsNav />
      <h2 className="mb-2 text-sm font-semibold">المستخدمون</h2>
      <UserForm employees={employees} />

      <UserList
        items={users.map((u) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          employeeId: u.employeeId,
          employeeName: u.employee?.name ?? null,
        }))}
        employees={employees}
        currentUserId={session.userId}
      />
    </div>
  );
});
