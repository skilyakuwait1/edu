import { getSessionOrThrow } from "@/lib/auth/session";
import { DashboardShell } from "@/components/nav/DashboardShell";
import { NAV_ITEMS } from "@/components/nav/navItems";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionOrThrow();
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(session.role));

  return (
    <DashboardShell email={session.email} role={session.role} items={items}>
      {children}
    </DashboardShell>
  );
}
