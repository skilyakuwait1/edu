"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/nav/SignOutButton";
import { Logo } from "@/components/brand/Logo";
import type { NavItem } from "@/components/nav/navItems";

export function DashboardShell({
  email,
  role,
  items,
  children,
}: {
  email: string;
  role: string;
  items: NavItem[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile drawer whenever the route changes (link click, back/forward, etc).
  // Adjusting state during render (React's documented pattern) instead of an effect.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden dark:border-gray-800 dark:bg-gray-950">
        <span className="flex items-center gap-2 font-semibold">
          <Logo size={26} />
          Education CRM
        </span>
        <button
          onClick={() => setOpen(true)}
          aria-label="فتح القائمة"
          className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Backdrop (mobile only, shown while drawer is open) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: off-canvas drawer on mobile, static column on desktop */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-64 shrink-0 flex-col border-l border-gray-200 bg-gray-50 p-4 transition-transform duration-200 md:static md:z-auto md:w-56 md:translate-x-0 dark:border-gray-800 dark:bg-gray-950 ${
          open ? "translate-x-0" : "translate-x-full md:translate-x-0"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <div>
              <p className="font-semibold">Education CRM</p>
              <p className="text-xs text-gray-500">{email}</p>
              <p className="text-xs text-gray-400">{role}</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="إغلاق القائمة"
            className="rounded-md p-1 hover:bg-gray-200 md:hidden dark:hover:bg-gray-800"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm ${
                  active
                    ? "bg-brand-light font-medium text-brand dark:bg-brand/20 dark:text-brand-hover"
                    : "hover:bg-gray-200 dark:hover:bg-gray-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <SignOutButton />
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
