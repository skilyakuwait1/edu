import type { TimelineEventType } from "@/generated/tenant-client/client";

export type TimelineEntry = {
  id: string;
  type: TimelineEventType;
  summary: string;
  createdAt: Date | string;
};

const TYPE_ICON: Record<TimelineEventType, string> = {
  LEAD_CREATED: "✨",
  STATUS_CHANGED: "🔄",
  CALL_LOGGED: "📞",
  NOTE_ADDED: "📝",
  FOLLOW_UP_SCHEDULED: "⏰",
  APPOINTMENT_BOOKED: "📅",
  APPOINTMENT_UPDATED: "📅",
  ASSIGNED_TO_EMPLOYEE: "👤",
  RELEASED_TO_QUEUE: "↩️",
  IMPORTED: "📥",
  WATI_REMINDER_SENT: "🔔",
};

/** Renders the lead's append-only timeline, newest first — nothing here is ever edited or removed. */
export function LeadTimelineView({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-400">لا يوجد نشاط بعد</p>;
  }

  return (
    <ol className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id} className="flex gap-3 text-sm">
          <span className="shrink-0">{TYPE_ICON[entry.type]}</span>
          <div className="min-w-0 flex-1">
            <p>{entry.summary}</p>
            <p className="text-xs text-gray-400">
              {new Date(entry.createdAt).toLocaleString("ar-KW")}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
