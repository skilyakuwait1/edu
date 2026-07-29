"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";

export function WatiReminderButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [sending, setSending] = useState(false);

  async function handleClick() {
    setSending(true);
    const res = await fetch(`/api/leads/${leadId}/wati-reminder`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setSending(false);

    if (!res.ok) {
      showToast("error", data.error ?? "تعذر إرسال التذكير");
      return;
    }

    showToast("success", "تم إرسال تذكير واتساب عبر WATI");
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={sending}
      className="min-w-28 flex-1 rounded-md bg-amber-500 px-4 py-3 text-center text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
    >
      {sending ? "..." : "🔔 تذكير واتي"}
    </button>
  );
}
