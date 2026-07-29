"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";

type Option = { id: string; name: string };

const RESULT_LABELS: Record<string, string> = {
  INTERESTED: "مهتم",
  NEED_FOLLOW_UP: "يحتاج متابعة",
  NO_ANSWER: "لم يرد",
  BUSY: "مشغول",
  WRONG_NUMBER: "رقم خاطئ",
  NOT_INTERESTED: "غير مهتم",
  APPOINTMENT_BOOKED: "تم حجز موعد",
  REGISTERED: "تم التسجيل",
  CALL_BACK_LATER: "معاودة الاتصال لاحقاً",
};

const RESULT_ORDER = [
  "INTERESTED",
  "NO_ANSWER",
  "BUSY",
  "NEED_FOLLOW_UP",
  "CALL_BACK_LATER",
  "APPOINTMENT_BOOKED",
  "REGISTERED",
  "WRONG_NUMBER",
  "NOT_INTERESTED",
];

const RESULTS_WITH_DEFAULT_FOLLOW_UP = new Set(["INTERESTED", "NO_ANSWER", "BUSY"]);
const RESULTS_REQUIRING_FOLLOW_UP_DATE = new Set(["NEED_FOLLOW_UP", "CALL_BACK_LATER"]);

export function CallResultForm({ leadId, branches }: { leadId: string; branches: Option[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [result, setResult] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showFollowUpDate =
    RESULTS_WITH_DEFAULT_FOLLOW_UP.has(result) || RESULTS_REQUIRING_FOLLOW_UP_DATE.has(result);
  const followUpRequired = RESULTS_REQUIRING_FOLLOW_UP_DATE.has(result);
  const showAppointment = result === "APPOINTMENT_BOOKED";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const durationMinutes = formData.get("durationMinutes");

    const payload: Record<string, unknown> = {
      leadId,
      result,
      notes: formData.get("notes") || null,
      durationSeconds: durationMinutes ? Number(durationMinutes) * 60 : null,
    };

    if (showFollowUpDate) {
      payload.nextFollowUpDate = formData.get("nextFollowUpDate") || null;
    }

    if (showAppointment) {
      payload.appointment = {
        date: formData.get("appointmentDate"),
        time: formData.get("appointmentTime"),
        branchId: formData.get("appointmentBranchId") || null,
      };
    }

    const res = await fetch("/api/call-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "تعذر حفظ نتيجة المكالمة");
      showToast("error", data.error ?? "تعذر حفظ نتيجة المكالمة");
      return;
    }

    setResult("");
    (document.getElementById("call-result-form") as HTMLFormElement | null)?.reset();
    showToast("success", "تم حفظ نتيجة المكالمة");
    router.refresh();
  }

  return (
    <form id="call-result-form" onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      <div>
        <label className="text-sm font-medium">نتيجة المكالمة</label>
        <select
          value={result}
          onChange={(e) => setResult(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="">— اختر النتيجة —</option>
          {RESULT_ORDER.map((r) => (
            <option key={r} value={r}>
              {RESULT_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      {showFollowUpDate && (
        <div>
          <label className="text-sm font-medium">
            موعد المتابعة القادم {followUpRequired ? "*" : "(افتراضي: بعد 5 أيام)"}
          </label>
          <input
            type="date"
            name="nextFollowUpDate"
            required={followUpRequired}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </div>
      )}

      {showAppointment && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm font-medium">تاريخ الموعد *</label>
            <input
              type="date"
              name="appointmentDate"
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="text-sm font-medium">وقت الموعد *</label>
            <input
              type="time"
              name="appointmentTime"
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium">الفرع</label>
            <select
              name="appointmentBranchId"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="">—</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="text-sm font-medium">مدة المكالمة (دقائق)</label>
        <input
          type="number"
          name="durationMinutes"
          min={0}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
      </div>

      <div>
        <label className="text-sm font-medium">ملاحظات</label>
        <textarea
          name="notes"
          rows={2}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
      </div>

      <button
        type="submit"
        disabled={submitting || !result}
        className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-brand-hover"
      >
        {submitting ? "..." : "حفظ نتيجة المكالمة"}
      </button>
    </form>
  );
}
