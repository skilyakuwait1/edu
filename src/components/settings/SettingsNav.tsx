import Link from "next/link";

const ITEMS = [
  { href: "/settings/users", label: "المستخدمون" },
  { href: "/settings/employees", label: "الموظفون" },
  { href: "/settings/sources", label: "مصادر العملاء" },
  { href: "/settings/branches", label: "الفروع" },
  { href: "/settings/queue", label: "إعدادات الطابور" },
  { href: "/settings/integrations", label: "تكامل واتساب (WATI)" },
];

export function SettingsNav() {
  return (
    <div className="mb-4 flex gap-2 border-b border-gray-200 pb-2 dark:border-gray-800">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
