import Link from "next/link";
import { getSessionOrThrow } from "@/lib/auth/session";
import { listLeadsForUser } from "@/lib/services/lead.service";
import { LEAD_STATUS_LABELS } from "@/lib/constants/leadStatus";
import { formatPhoneDisplay } from "@/lib/validation/phone";
import { withTenantContext } from "@/lib/tenant/withTenantContext";

export default withTenantContext(async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const session = await getSessionOrThrow();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 50;
  const { leads, total } = await listLeadsForUser(session, {
    search: params.search,
    status: params.status,
    page,
    pageSize,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  function pageHref(targetPage: number) {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.status) qs.set("status", params.status);
    qs.set("page", String(targetPage));
    return `/leads?${qs.toString()}`;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">العملاء</h1>
        <Link
          href="/leads/new"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          + عميل جديد
        </Link>
      </div>

      <form className="mb-4 flex gap-2" method="get">
        <input
          type="text"
          name="search"
          defaultValue={params.search}
          placeholder="بحث بالاسم أو رقم الهاتف أو الصف الدراسي"
          className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
        <button
          type="submit"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
        >
          بحث
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-2 text-right font-medium">الاسم</th>
              <th className="px-4 py-2 text-right font-medium">الهاتف</th>
              <th className="px-4 py-2 text-right font-medium">الصف الدراسي</th>
              <th className="px-4 py-2 text-right font-medium">المصدر</th>
              <th className="px-4 py-2 text-right font-medium">الحالة</th>
              <th className="px-4 py-2 text-right font-medium">الموظف المسؤول</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                <td className="px-4 py-2">
                  <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                    {lead.fullName}
                  </Link>
                </td>
                <td className="px-4 py-2 font-mono text-xs" dir="ltr">
                  {formatPhoneDisplay(lead.phone)}
                </td>
                <td className="px-4 py-2">{lead.studyGrade ?? "—"}</td>
                <td className="px-4 py-2">{lead.source.name}</td>
                <td className="px-4 py-2">{LEAD_STATUS_LABELS[lead.status]}</td>
                <td className="px-4 py-2">{lead.assignedEmployee?.name ?? "—"}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  لا يوجد عملاء بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <p className="text-gray-500">
            عرض {rangeStart}–{rangeEnd} من {total}
          </p>
          <div className="flex gap-2">
            <Link
              href={pageHref(page - 1)}
              aria-disabled={page <= 1}
              className={`rounded-md border border-gray-300 px-3 py-1.5 dark:border-gray-700 ${
                page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-gray-50 dark:hover:bg-gray-900"
              }`}
            >
              السابق
            </Link>
            <span className="px-2 py-1.5 text-gray-400">
              {page} / {totalPages}
            </span>
            <Link
              href={pageHref(page + 1)}
              aria-disabled={page >= totalPages}
              className={`rounded-md border border-gray-300 px-3 py-1.5 dark:border-gray-700 ${
                page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-gray-50 dark:hover:bg-gray-900"
              }`}
            >
              التالي
            </Link>
          </div>
        </div>
      )}
    </div>
  );
});
