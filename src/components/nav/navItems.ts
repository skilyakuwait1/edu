import type { Role } from "@/generated/prisma/client";

export type NavItem = {
  href: string;
  label: string;
  roles?: Role[]; // omit for "all roles"
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "شاشة العمل اليومي" },
  { href: "/leads", label: "العملاء" },
  { href: "/appointments", label: "المواعيد" },
  { href: "/dashboard", label: "لوحة التحكم", roles: ["SUPER_ADMIN", "MANAGER"] },
  { href: "/reports", label: "التقارير", roles: ["SUPER_ADMIN", "MANAGER"] },
  { href: "/imports", label: "استيراد Excel", roles: ["SUPER_ADMIN", "MANAGER"] },
  { href: "/settings/users", label: "الإعدادات", roles: ["SUPER_ADMIN"] },
];
