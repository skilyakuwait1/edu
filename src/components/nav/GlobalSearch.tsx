"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LEAD_STATUS_LABELS } from "@/lib/constants/leadStatus";
import { formatPhoneDisplay } from "@/lib/validation/phone";
import type { LeadStatus } from "@/generated/tenant-client/client";

type SearchResult = {
  id: string;
  fullName: string;
  phone: string;
  status: LeadStatus;
};

export function GlobalSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/leads?search=${encodeURIComponent(trimmed)}&pageSize=8`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.leads);
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goTo(id: string) {
    setOpen(false);
    setQuery("");
    router.push(`/leads/${id}`);
  }

  return (
    <div ref={containerRef} className="relative mb-4">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="بحث سريع عن عميل..."
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
      />

      {open && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
          {loading && <p className="px-3 py-2 text-xs text-gray-400">جاري البحث...</p>}
          {!loading && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">لا توجد نتائج</p>
          )}
          {!loading &&
            results.map((lead) => (
              <button
                key={lead.id}
                onClick={() => goTo(lead.id)}
                className="flex w-full items-center justify-between px-3 py-2 text-right text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <span className="font-medium">{lead.fullName}</span>
                <span className="flex items-center gap-2 text-xs text-gray-400">
                  <span dir="ltr">{formatPhoneDisplay(lead.phone)}</span>
                  <span>{LEAD_STATUS_LABELS[lead.status]}</span>
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
