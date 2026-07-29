"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DuplicateLeadDialog, type ExistingLeadInfo } from "./DuplicateLeadDialog";

type Option = { id: string; name: string };

export function LeadForm({ sources }: { sources: Option[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<ExistingLeadInfo | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      fullName: formData.get("fullName"),
      phone: formData.get("phone"),
      email: formData.get("email") || null,
      studyGrade: formData.get("studyGrade") || null,
      area: formData.get("area") || null,
      sourceId: formData.get("sourceId"),
      interestLevel: formData.get("interestLevel") || null,
      notes: formData.get("notes") || null,
    };

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (res.status === 409) {
      const data = await res.json();
      setDuplicate(data.existing);
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "تعذر حفظ العميل");
      return;
    }

    const { lead } = await res.json();
    router.push(`/leads/${lead.id}`);
    router.refresh();
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
        )}

        <Field label="الاسم الكامل" name="fullName" required />
        <Field label="رقم الهاتف" name="phone" required dir="ltr" placeholder="+965 5000 0000" />
        <Field label="البريد الإلكتروني" name="email" type="email" dir="ltr" />
        <Field label="الصف الدراسي" name="studyGrade" placeholder="مثال: Grade 8, IGCSE, A Level" />
        <Field label="المنطقة" name="area" />

        <Select label="المصدر" name="sourceId" required options={sources} />

        <div>
          <label className="text-sm font-medium">درجة الاهتمام</label>
          <select
            name="interestLevel"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            defaultValue=""
          >
            <option value="">—</option>
            <option value="LOW">منخفضة</option>
            <option value="MEDIUM">متوسطة</option>
            <option value="HIGH">عالية</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">ملاحظات</label>
          <textarea
            name="notes"
            rows={3}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-brand-hover"
        >
          {submitting ? "..." : "حفظ العميل"}
        </button>
      </form>

      {duplicate && <DuplicateLeadDialog existing={duplicate} onClose={() => setDuplicate(null)} />}
    </>
  );
}

function Field({
  label,
  name,
  required,
  type = "text",
  dir,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  dir?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        dir={dir}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
      />
    </div>
  );
}

function Select({
  label,
  name,
  options,
  required,
  defaultValue,
  disabled,
}: {
  label: string;
  name: string;
  options: Option[];
  required?: boolean;
  defaultValue?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium" htmlFor={name}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        disabled={disabled}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800"
      >
        <option value="">—</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  );
}
