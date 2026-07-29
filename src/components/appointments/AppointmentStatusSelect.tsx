"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_ORDER } from "@/lib/constants/appointmentStatus";
import { useToast } from "@/components/ui/ToastProvider";

export function AppointmentStatusSelect({
  appointmentId,
  status,
}: {
  appointmentId: string;
  status: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSaving(true);
    const res = await fetch(`/api/appointments/${appointmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: e.target.value }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast("error", data.error ?? "تعذر تحديث حالة الموعد");
      return;
    }

    showToast("success", "تم تحديث حالة الموعد");
    router.refresh();
  }

  return (
    <select
      defaultValue={status}
      onChange={handleChange}
      disabled={saving}
      className="rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
    >
      {APPOINTMENT_STATUS_ORDER.map((s) => (
        <option key={s} value={s}>
          {APPOINTMENT_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
