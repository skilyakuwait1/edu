import { signOut } from "@/lib/platformAuth";

export function PlatformSignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/platform-admin/login" });
      }}
    >
      <button type="submit" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">
        تسجيل الخروج
      </button>
    </form>
  );
}
