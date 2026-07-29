"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ClassifiedRow = {
  rowNumber: number;
  fullName: string;
  phoneRaw: string;
  sourceName: string;
  studyGrade: string;
  area: string;
  notes: string;
  classification: "new" | "duplicate" | "invalid";
  invalidReason?: string;
};

type Summary = { totalRows: number; newCount: number; duplicateCount: number; invalidCount: number };

const CLASSIFICATION_LABELS: Record<string, string> = {
  new: "جديد",
  duplicate: "مكرر",
  invalid: "خطأ",
};

const CLASSIFICATION_STYLES: Record<string, string> = {
  new: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400",
  duplicate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400",
  invalid: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400",
};

export function ImportWizard() {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ClassifiedRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [strategy, setStrategy] = useState<"ADD_NEW_ONLY" | "UPDATE_EXISTING" | "MERGE">(
    "ADD_NEW_ONLY",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ addedCount: number; duplicateCount: number; errorCount: number } | null>(
    null,
  );

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);
    setLoading(true);
    setFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/imports/preview", { method: "POST", body: formData });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "تعذر معالجة الملف");
      return;
    }

    const data = await res.json();
    setRows(data.rows);
    setSummary(data.summary);
  }

  async function handleCommit() {
    if (!fileName) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/imports/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName,
        strategy,
        rows: rows.map((r) => ({
          rowNumber: r.rowNumber,
          fullName: r.fullName,
          phoneRaw: r.phoneRaw,
          sourceName: r.sourceName,
          studyGrade: r.studyGrade,
          area: r.area,
          notes: r.notes,
        })),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "تعذر تنفيذ الاستيراد");
      return;
    }

    const data = await res.json();
    setResult(data.result);
    setRows([]);
    setSummary(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">اختر ملف Excel أو CSV</label>
        <input
          type="file"
          accept=".xlsx,.csv"
          onChange={handleFileChange}
          className="mt-1 block text-sm"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {loading && <p className="text-sm text-gray-400">جاري المعالجة...</p>}

      {result && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm dark:bg-green-950">
          <p className="font-medium text-green-800 dark:text-green-400">تم الاستيراد بنجاح</p>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            تمت الإضافة: {result.addedCount} — مكرر: {result.duplicateCount} — أخطاء: {result.errorCount}
          </p>
        </div>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-4 gap-3">
            <SummaryStat label="الإجمالي" value={summary.totalRows} />
            <SummaryStat label="جديد" value={summary.newCount} />
            <SummaryStat label="مكرر" value={summary.duplicateCount} />
            <SummaryStat label="أخطاء" value={summary.invalidCount} />
          </div>

          <div>
            <label className="text-sm font-medium">خيار الاستيراد</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as typeof strategy)}
              className="mt-1 w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="ADD_NEW_ONLY">إضافة العملاء الجدد فقط</option>
              <option value="UPDATE_EXISTING">تحديث العملاء الموجودين</option>
              <option value="MERGE">دمج البيانات</option>
            </select>
          </div>

          <div className="max-h-96 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-3 py-2 text-right font-medium">#</th>
                  <th className="px-3 py-2 text-right font-medium">الاسم</th>
                  <th className="px-3 py-2 text-right font-medium">الهاتف</th>
                  <th className="px-3 py-2 text-right font-medium">المصدر</th>
                  <th className="px-3 py-2 text-right font-medium">الحالة</th>
                  <th className="px-3 py-2 text-right font-medium">السبب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td className="px-3 py-1.5 text-gray-400">{row.rowNumber}</td>
                    <td className="px-3 py-1.5">{row.fullName}</td>
                    <td className="px-3 py-1.5 font-mono text-xs" dir="ltr">
                      {row.phoneRaw}
                    </td>
                    <td className="px-3 py-1.5">{row.sourceName}</td>
                    <td className="px-3 py-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${CLASSIFICATION_STYLES[row.classification]}`}
                      >
                        {CLASSIFICATION_LABELS[row.classification]}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400">
                      {row.invalidReason ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleCommit}
            disabled={loading}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-brand-hover"
          >
            تنفيذ الاستيراد
          </button>
        </>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-gray-200 p-3 text-center dark:border-gray-800">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
