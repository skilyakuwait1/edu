"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NextCustomerButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/queue/next", { method: "POST" });
    setLoading(false);

    if (!res.ok) {
      setError("تعذر جلب العميل التالي");
      return;
    }

    const { lead } = await res.json();
    if (!lead) {
      setError("لا يوجد عملاء في الطابور حالياً");
      return;
    }
    router.push(`/leads/${lead.id}`);
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-md bg-brand px-4 py-4 text-base font-semibold text-white disabled:opacity-50 hover:bg-brand-hover"
      >
        {loading ? "..." : "⏭️ العميل التالي"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
