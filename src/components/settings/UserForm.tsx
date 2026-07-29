"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; name: string };

export function UserForm({ employees }: { employees: Option[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      email: formData.get("email"),
      password: formData.get("password"),
      role: formData.get("role"),
      employeeId: formData.get("employeeId") || null,
    };

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "تعذر إنشاء المستخدم");
      return;
    }

    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 grid max-w-md grid-cols-2 gap-3">
      {error && (
        <p className="col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="col-span-2">
        <label className="text-xs font-medium">البريد الإلكتروني</label>
        <input
          name="email"
          type="email"
          required
          dir="ltr"
          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
      </div>
      <div className="col-span-2">
        <label className="text-xs font-medium">كلمة المرور</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          dir="ltr"
          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
      </div>
      <div>
        <label className="text-xs font-medium">الصلاحية</label>
        <select
          name="role"
          required
          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="AGENT">Agent</option>
          <option value="MANAGER">Manager</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium">ربط بموظف</label>
        <select
          name="employeeId"
          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="">—</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-brand-hover"
        >
          إنشاء مستخدم
        </button>
      </div>
    </form>
  );
}
