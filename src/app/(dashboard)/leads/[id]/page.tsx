import { notFound } from "next/navigation";
import { getSessionOrThrow } from "@/lib/auth/session";
import { getLeadForUser } from "@/lib/services/lead.service";
import { prisma } from "@/lib/prisma";
import { formatPhoneDisplay, phoneLocalDigits } from "@/lib/validation/phone";
import { INTEREST_LEVEL_LABELS } from "@/lib/constants/leadStatus";
import { StatusSelect } from "@/components/leads/StatusSelect";
import { LeadTimelineView } from "@/components/timeline/LeadTimelineView";
import { CallResultForm } from "@/components/calls/CallResultForm";
import { FollowUpForm } from "@/components/followups/FollowUpForm";
import { FollowUpTimeline } from "@/components/followups/FollowUpTimeline";
import { AppointmentStatusSelect } from "@/components/appointments/AppointmentStatusSelect";
import { withTenantContext } from "@/lib/tenant/withTenantContext";

export default withTenantContext(async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionOrThrow();
  const { id } = await params;
  const lead = await getLeadForUser(session, id);
  if (!lead) notFound();

  const branches = await prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });

  const canOverrideStatus = session.role === "SUPER_ADMIN" || session.role === "MANAGER";
  const waLink = `https://wa.me/${lead.phone}`;
  const telLink = `tel:${phoneLocalDigits(lead.phone)}`;

  return (
    <div className="grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{lead.fullName}</h1>
          {canOverrideStatus && <StatusSelect leadId={lead.id} status={lead.status} />}
        </div>

        <div className="mt-4 flex gap-2">
          <a
            href={telLink}
            className="flex-1 rounded-md bg-brand px-4 py-3 text-center text-sm font-medium text-white hover:bg-brand-hover"
          >
            📞 اتصال
          </a>
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-md bg-green-600 px-4 py-3 text-center text-sm font-medium text-white"
          >
            💬 واتساب
          </a>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <Row label="الهاتف" value={<span dir="ltr">{formatPhoneDisplay(lead.phone)}</span>} />
          <Row label="البريد الإلكتروني" value={lead.email ?? "—"} />
          <Row label="الصف الدراسي" value={lead.studyGrade ?? "—"} />
          <Row label="المنطقة" value={lead.area ?? "—"} />
          <Row label="المصدر" value={lead.source.name} />
          <Row
            label="درجة الاهتمام"
            value={lead.interestLevel ? INTEREST_LEVEL_LABELS[lead.interestLevel] : "—"}
          />
          <Row label="الموظف المسؤول" value={lead.assignedEmployee?.name ?? "—"} />
          <Row
            label="آخر تواصل"
            value={lead.lastContactDate ? new Date(lead.lastContactDate).toLocaleDateString("ar-KW") : "—"}
          />
          <Row
            label="موعد المتابعة القادمة"
            value={lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString("ar-KW") : "—"}
          />
          <Row label="الملاحظات" value={lead.notes ?? "—"} />
        </dl>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="mb-2 text-sm font-semibold">تسجيل مكالمة</h2>
          <CallResultForm leadId={lead.id} branches={branches} />
        </div>

        {lead.appointments.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold">المواعيد</h2>
            <ul className="space-y-2">
              {lead.appointments.map((apt) => (
                <li
                  key={apt.id}
                  className="flex items-center justify-between rounded-md border border-gray-200 p-3 text-sm dark:border-gray-800"
                >
                  <span>
                    {new Date(apt.date).toLocaleDateString("ar-KW")} — {apt.time}
                    {apt.branch ? ` (${apt.branch.name})` : ""}
                  </span>
                  <AppointmentStatusSelect appointmentId={apt.id} status={apt.status} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h2 className="mb-2 text-sm font-semibold">جدولة متابعة</h2>
          <FollowUpForm leadId={lead.id} />
          <div className="mt-3">
            <FollowUpTimeline followUps={lead.followUps} />
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold">السجل الزمني</h2>
          <LeadTimelineView entries={lead.timeline} />
        </div>
      </div>
    </div>
  );
});

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 pb-1 dark:border-gray-800">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
