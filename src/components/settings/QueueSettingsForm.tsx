"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function QueueSettingsForm({
  queueSize,
  inactivityTimeoutHours,
}: {
  queueSize: number;
  inactivityTimeoutHours: number;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      queueSize: Number(formData.get("queueSize")),
      inactivityTimeoutHours: Number(formData.get("inactivityTimeoutHours")),
    };

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "تعذر الحفظ");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-400">
          تم الحفظ بنجاح
        </p>
      )}

      <div>
        <label className="text-sm font-medium">حجم طابور كل موظف (عدد العملاء النشطين)</label>
        <input
          type="number"
          name="queueSize"
          min={1}
          max={200}
          required
          defaultValue={queueSize}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
      </div>

      <div>
        <label className="text-sm font-medium">مهلة عدم النشاط قبل إرجاع العملاء للطابور (ساعات)</label>
        <input
          type="number"
          name="inactivityTimeoutHours"
          min={1}
          max={720}
          required
          defaultValue={inactivityTimeoutHours}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-brand-hover"
      >
        {submitting ? "..." : "حفظ الإعدادات"}
      </button>
    </form>
  );
}
