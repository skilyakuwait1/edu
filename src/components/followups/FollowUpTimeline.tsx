type FollowUpItem = {
  id: string;
  notes: string | null;
  followUpDate: Date;
  followUpTime: string | null;
  employee: { name: string };
};

export function FollowUpTimeline({ followUps }: { followUps: FollowUpItem[] }) {
  if (followUps.length === 0) {
    return <p className="text-sm text-gray-400">لا توجد متابعات مجدولة</p>;
  }

  return (
    <ol className="space-y-3">
      {followUps.map((f) => (
        <li key={f.id} className="rounded-md border border-gray-200 p-3 text-sm dark:border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {new Date(f.followUpDate).toLocaleDateString("ar-KW")}
              {f.followUpTime ? ` — ${f.followUpTime}` : ""}
            </span>
            <span>{f.employee.name}</span>
          </div>
          {f.notes && <p className="mt-1 text-gray-600 dark:text-gray-400">{f.notes}</p>}
        </li>
      ))}
    </ol>
  );
}
