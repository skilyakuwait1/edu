"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Employee = { id: string; name: string; phone: string | null; isActive: boolean };

export function EmployeeList({ items }: { items: Employee[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startEdit(item: Employee) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPhone(item.phone ?? "");
    setError(null);
  }

  async function saveEdit(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, phone: editPhone || null }),
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

  async function reactivate(item: Employee) {
    setBusyId(item.id);
    await fetch(`/api/employees/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    setBusyId(null);
    router.refresh();
  }

  // DELETE deactivates rather than removing the row — see the API route for why.
  async function handleDelete(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "تعذر الحذف");
      return;
    }
    router.refresh();
  }

  return (
    <div className="max-w-lg">
      {error && (
        <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}
      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 text-sm dark:divide-gray-800 dark:border-gray-800">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 px-3 py-2">
            {editingId === item.id ? (
              <>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="الهاتف"
                  dir="ltr"
                  className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
                <button
                  onClick={() => saveEdit(item.id)}
                  disabled={busyId === item.id}
                  className="text-xs font-medium text-gray-900 hover:underline dark:text-white"
                >
                  حفظ
                </button>
                <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:underline">
                  إلغاء
                </button>
              </>
            ) : (
              <>
                <span className={item.isActive ? "" : "text-gray-400 line-through"}>
                  {item.name}
                  {item.phone && (
                    <span className="mr-2 text-xs text-gray-400" dir="ltr">
                      {item.phone}
                    </span>
                  )}
                </span>
                <div className="flex shrink-0 gap-2 text-xs">
                  <button onClick={() => startEdit(item)} className="text-gray-500 hover:underline">
                    تعديل
                  </button>
                  {item.isActive ? (
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
                  )}
                </div>
              </>
            )}
          </li>
        ))}
        {items.length === 0 && <li className="px-3 py-4 text-center text-gray-400">لا يوجد</li>}
      </ul>
    </div>
  );
}
