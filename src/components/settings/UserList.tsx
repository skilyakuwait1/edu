"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; name: string };
type UserRow = {
  id: string;
  email: string;
  role: "SUPER_ADMIN" | "MANAGER" | "AGENT";
  isActive: boolean;
  employeeId: string | null;
  employeeName: string | null;
};

export function UserList({
  items,
  employees,
  currentUserId,
}: {
  items: UserRow[];
  employees: Option[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<UserRow["role"]>("AGENT");
  const [editEmployeeId, setEditEmployeeId] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startEdit(item: UserRow) {
    setEditingId(item.id);
    setEditEmail(item.email);
    setEditRole(item.role);
    setEditEmployeeId(item.employeeId ?? "");
    setEditPassword("");
    setError(null);
  }

  async function saveEdit(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: editEmail,
        role: editRole,
        employeeId: editEmployeeId || null,
        ...(editPassword ? { password: editPassword } : {}),
      }),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "تعذر الحفظ");
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function reactivate(item: UserRow) {
    setBusyId(item.id);
    setError(null);
    const res = await fetch(`/api/users/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "تعذر التنفيذ");
      return;
    }
    router.refresh();
  }

  // DELETE deactivates rather than removing the row — see the API route for why.
  async function handleDelete(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "تعذر الحذف");
      return;
    }
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      {error && (
        <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500">
            <th className="py-1.5 text-right font-medium">البريد الإلكتروني</th>
            <th className="py-1.5 text-right font-medium">الصلاحية</th>
            <th className="py-1.5 text-right font-medium">الموظف</th>
            <th className="py-1.5 text-right font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((item) =>
            editingId === item.id ? (
              <tr key={item.id}>
                <td className="py-1.5">
                  <input
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    dir="ltr"
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </td>
                <td className="py-1.5">
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRow["role"])}
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    <option value="AGENT">Agent</option>
                    <option value="MANAGER">Manager</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </td>
                <td className="py-1.5">
                  <select
                    value={editEmployeeId}
                    onChange={(e) => setEditEmployeeId(e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    <option value="">—</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="flex items-center gap-2 py-1.5">
                  <input
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    type="password"
                    placeholder="كلمة مرور جديدة (اختياري)"
                    dir="ltr"
                    className="w-40 rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                  />
                  <button
                    onClick={() => saveEdit(item.id)}
                    disabled={busyId === item.id}
                    className="text-xs font-medium hover:underline"
                  >
                    حفظ
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:underline">
                    إلغاء
                  </button>
                </td>
              </tr>
            ) : (
              <tr key={item.id}>
                <td className={`py-1.5 ${item.isActive ? "" : "text-gray-400 line-through"}`} dir="ltr">
                  {item.email}
                </td>
                <td className="py-1.5">{item.role}</td>
                <td className="py-1.5">{item.employeeName ?? "—"}</td>
                <td className="py-1.5">
                  <div className="flex justify-end gap-2 text-xs">
                    <button onClick={() => startEdit(item)} className="text-gray-500 hover:underline">
                      تعديل
                    </button>
                    {item.id !== currentUserId &&
                      (item.isActive ? (
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={busyId === item.id}
                          className="text-red-600 hover:underline dark:text-red-400"
                        >
                          حذف
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivate(item)}
                          disabled={busyId === item.id}
                          className="text-gray-500 hover:underline"
                        >
                          تفعيل
                        </button>
                      ))}
                  </div>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
