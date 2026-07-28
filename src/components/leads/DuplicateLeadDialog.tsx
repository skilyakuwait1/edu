"use client";

import Link from "next/link";
import { LEAD_STATUS_LABELS } from "@/lib/constants/leadStatus";
import type { LeadStatus } from "@/generated/prisma/client";

export type ExistingLeadInfo = {
  id: string;
  fullName: string;
  status: string;
  assignedEmployeeName: string | null;
  lastContactDate: string | null;
  lastFollowUpNote: string | null;
  lastFollowUpDate: string | null;
};

export function DuplicateLeadDialog({
  existing,
  onClose,
}: {
  existing: ExistingLeadInfo;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
          العميل موجود مسبقاً
        </h2>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">الاسم</dt>
            <dd className="font-medium">{existing.fullName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">آخر حالة</dt>
            <dd className="font-medium">
              {LEAD_STATUS_LABELS[existing.status as LeadStatus] ?? existing.status}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">الموظف المسؤول</dt>
            <dd className="font-medium">{existing.assignedEmployeeName ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">آخر تواصل</dt>
            <dd className="font-medium">
              {existing.lastContactDate
                ? new Date(existing.lastContactDate).toLocaleDateString("ar-KW")
                : "—"}
            </dd>
          </div>
          {existing.lastFollowUpNote && (
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-gray-500">آخر متابعة</dt>
              <dd className="text-right font-medium">{existing.lastFollowUpNote}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
          >
            إغلاق
          </button>
          <Link
            href={`/leads/${existing.id}`}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-gray-900"
          >
            عرض العميل
          </Link>
        </div>
      </div>
    </div>
  );
}
