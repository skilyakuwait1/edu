"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";

export function SimpleEntityForm({
  endpoint,
  placeholder,
}: {
  endpoint: string;
  placeholder: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "تعذر الحفظ");
      showToast("error", data.error ?? "تعذر الحفظ");
      return;
    }

    setName("");
    showToast("success", "تمت الإضافة");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        required
        className="max-w-sm flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-brand-hover"
      >
        إضافة
      </button>
      {error && <p className="self-center text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
