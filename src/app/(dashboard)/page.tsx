import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionOrThrow } from "@/lib/auth/session";
import { getDailyWorkScreenData } from "@/lib/services/report.service";
import { formatPhoneDisplay } from "@/lib/validation/phone";
import { NextCustomerButton } from "@/components/dailywork/NextCustomerButton";
import { Role } from "@/generated/prisma/client";

export default async function DailyWorkScreenPage() {
  const session = await getSessionOrThrow();

  if (session.role === Role.SUPER_ADMIN || session.role === Role.MANAGER) {
    redirect("/dashboard");
  }

  const { activeQueue, completedCallsToday, todaysAppointments, todaysFollowUps } =
    await getDailyWorkScreenData(session);

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold">شاشة العمل اليومي</h1>
      <p className="mb-4 text-sm text-gray-500">مرحباً {session.email}</p>

      <div className="mb-4">
        <NextCustomerButton />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="العملاء المتبقين" value={activeQueue.length} />
        <StatCard label="المكالمات المكتملة اليوم" value={completedCallsToday} />
        <StatCard label="مواعيد اليوم" value={todaysAppointments.length} />
        <StatCard label="متابعات اليوم" value={todaysFollowUps.length} />
      </div>

      <Section title="طابور اليوم" count={activeQueue.length}>
        {activeQueue.map((lead) => (
          <LeadRow
            key={lead.id}
            id={lead.id}
            name={lead.fullName}
            sub={formatPhoneDisplay(lead.phone)}
          />
        ))}
      </Section>

      <div className="mt-4">
        <Section title="متابعات اليوم" count={todaysFollowUps.length}>
          {todaysFollowUps.map((lead) => (
            <LeadRow key={lead.id} id={lead.id} name={lead.fullName} sub={formatPhoneDisplay(lead.phone)} />
          ))}
        </Section>
      </div>

      <div className="mt-4">
        <Section title="مواعيد اليوم" count={todaysAppointments.length}>
          {todaysAppointments.map((apt) => (
            <LeadRow key={apt.id} id={apt.leadId} name={apt.lead.fullName} sub={apt.time} />
          ))}
        </Section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-gray-400">{count}</span>
      </div>
      <div className="space-y-1">{count === 0 ? <p className="text-sm text-gray-400">لا يوجد</p> : children}</div>
    </div>
  );
}

function LeadRow({ id, name, sub }: { id: string; name: string; sub: string }) {
  return (
    <Link
      href={`/leads/${id}`}
      className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-900"
    >
      <span className="font-medium">{name}</span>
      <span className="text-xs text-gray-400" dir="ltr">
        {sub}
      </span>
    </Link>
  );
}
