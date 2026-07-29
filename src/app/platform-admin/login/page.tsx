import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/platformAuth";
import { Logo } from "@/components/brand/Logo";

export default async function PlatformAdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  async function handleLogin(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/platform-admin/tenants",
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect("/platform-admin/login?error=1");
      }
      throw error;
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <form
        action={handleLogin}
        className="w-full max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <div>
            <h1 className="text-lg font-semibold">لوحة تحكم المنصة</h1>
            <p className="text-sm text-gray-500">تسجيل دخول مالك المنصة</p>
          </div>
        </div>

        {params.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            البريد الإلكتروني أو كلمة المرور غير صحيحة
          </p>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="email">
            البريد الإلكتروني
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="password">
            كلمة المرور
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          دخول
        </button>
      </form>
    </div>
  );
}
