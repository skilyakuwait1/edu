"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";

export function TenantStatusToggle({ tenantId, status }: { tenantId: string; status: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const isActive = status === "ACTIVE";

  async function toggle() {
    setSaving(true);
    const res = await fetch(`/api/platform-admin/tenants/${tenantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: isActive ? "SUSPENDED" : "ACTIVE" }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast("error", data.error ?? "تعذر تنفيذ العملية");
      return;
    }

    showToast("success", isActive ? "تم إيقاف العميل" : "تم تفعيل العميل");
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className={`rounded-md border px-3 py-1 text-xs disabled:opacity-50 ${
        isActive
          ? "border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          : "border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
      }`}
    >
      {isActive ? "إيقاف" : "تفعيل"}
    </button>
  );
}
