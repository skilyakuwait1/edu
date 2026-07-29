"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";

type WatiSettings = { watiApiEndpoint: string; watiTemplateName: string; watiApiKeySet: boolean };

export function WatiSettingsForm({ initial }: { initial: WatiSettings }) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [apiKeySet, setApiKeySet] = useState(initial.watiApiKeySet);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const watiApiKey = String(formData.get("watiApiKey") ?? "").trim();
    const payload = {
      watiApiEndpoint: formData.get("watiApiEndpoint"),
      watiTemplateName: formData.get("watiTemplateName"),
      ...(watiApiKey ? { watiApiKey } : {}),
    };

    const res = await fetch("/api/settings/wati", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast("error", data.error ?? "تعذر الحفظ");
      return;
    }

    const data = await res.json();
    setApiKeySet(data.watiApiKeySet);
    (e.currentTarget.elements.namedItem("watiApiKey") as HTMLInputElement).value = "";
    showToast("success", "تم حفظ إعدادات WATI");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div>
        <label className="text-sm font-medium">رابط API الخاص بـ WATI</label>
        <input
          type="text"
          name="watiApiEndpoint"
          required
          dir="ltr"
          placeholder="https://live-mt-server.wati.io/xxxxx"
          defaultValue={initial.watiApiEndpoint}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
      </div>

      <div>
        <label className="text-sm font-medium">مفتاح API (Access Token)</label>
        <input
          type="password"
          name="watiApiKey"
          dir="ltr"
          placeholder={apiKeySet ? "•••••••• (محفوظ — اتركه فارغاً للإبقاء عليه)" : "الصق المفتاح هنا"}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
      </div>

      <div>
        <label className="text-sm font-medium">اسم قالب التذكير (Template Name)</label>
        <input
          type="text"
          name="watiTemplateName"
          required
          dir="ltr"
          placeholder="reminder_template"
          defaultValue={initial.watiTemplateName}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
        <p className="mt-1 text-xs text-gray-400">
          يجب أن يكون هذا القالب معتمداً مسبقاً في حساب WATI، وبه متغيّر واحد لاسم العميل.
        </p>
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
