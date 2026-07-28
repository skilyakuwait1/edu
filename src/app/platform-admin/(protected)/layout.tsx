import { redirect } from "next/navigation";
import { getPlatformSession } from "@/lib/platformSession";
import { PlatformSignOutButton } from "@/components/platformAdmin/PlatformSignOutButton";

export default async function PlatformAdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPlatformSession();
  if (!session) {
    redirect("/platform-admin/login");
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-3 dark:border-gray-800 dark:bg-gray-950">
        <div>
          <p className="font-semibold">لوحة تحكم المنصة</p>
          <p className="text-xs text-gray-500">{session.email}</p>
        </div>
        <PlatformSignOutButton />
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
