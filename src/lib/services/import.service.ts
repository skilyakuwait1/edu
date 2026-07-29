import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/validation/phone";
import { appendTimelineEvent } from "@/lib/services/timeline.service";
import type { Session } from "@/lib/auth/session";
import { LeadStatus, type ImportStrategy } from "@/generated/tenant-client/client";

export type RawImportRow = {
  rowNumber: number;
  fullName: string;
  phoneRaw: string;
  sourceName: string;
  studyGrade: string;
  area: string;
  notes: string;
};

export type ImportRowClassification = "new" | "duplicate" | "invalid";

export type ClassifiedImportRow = RawImportRow & {
  phoneNormalized: string | null;
  sourceId: string | null;
  classification: ImportRowClassification;
  existingLeadId?: string;
  invalidReason?: string;
};

const HEADER_ALIASES: Record<keyof Omit<RawImportRow, "rowNumber">, string[]> = {
  fullName: ["name", "fullname", "full name", "الاسم", "الاسم الكامل"],
  phoneRaw: ["phone", "phone number", "رقم الهاتف", "رقم_الهاتف"],
  sourceName: ["source", "المصدر"],
  studyGrade: ["study grade", "grade", "الصف الدراسي", "الصف"],
  area: ["area", "المنطقة"],
  notes: ["notes", "ملاحظات", "الملاحظات"],
};

function resolveHeaderKey(header: string): keyof Omit<RawImportRow, "rowNumber"> | null {
  const normalized = header.trim().toLowerCase();
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some((alias) => alias.toLowerCase() === normalized)) {
      return key as keyof Omit<RawImportRow, "rowNumber">;
    }
  }
  return null;
}

export function extractRawRows(buffer: Buffer): RawImportRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  return raw.map((row, index) => {
    const mapped: RawImportRow = {
      rowNumber: index + 2, // +1 for 1-based, +1 for header row
      fullName: "",
      phoneRaw: "",
      sourceName: "",
      studyGrade: "",
      area: "",
      notes: "",
    };
    for (const [header, value] of Object.entries(row)) {
      const key = resolveHeaderKey(header);
      if (key) mapped[key] = String(value ?? "").trim();
    }
    return mapped;
  });
}

export async function classifyRows(rawRows: RawImportRow[]): Promise<ClassifiedImportRow[]> {
  const sources = await prisma.source.findMany();
  const sourceByName = new Map(sources.map((s) => [s.name.trim().toLowerCase(), s.id]));

  const candidatePhones = rawRows
    .map((r) => normalizePhone(r.phoneRaw))
    .filter((r) => r.valid)
    .map((r) => (r as { valid: true; normalized: string }).normalized);

  const existingLeads = await prisma.lead.findMany({
    where: { phone: { in: candidatePhones } },
    select: { id: true, phone: true },
  });
  const existingByPhone = new Map(existingLeads.map((l) => [l.phone, l.id]));

  const seenInFile = new Set<string>();
  const result: ClassifiedImportRow[] = [];

  for (const row of rawRows) {
    if (!row.fullName || !row.phoneRaw) {
      result.push({
        ...row,
        phoneNormalized: null,
        sourceId: null,
        classification: "invalid",
        invalidReason: "الاسم أو رقم الهاتف مفقود",
      });
      continue;
    }

    const phoneResult = normalizePhone(row.phoneRaw);
    if (!phoneResult.valid) {
      result.push({
        ...row,
        phoneNormalized: null,
        sourceId: null,
        classification: "invalid",
        invalidReason: phoneResult.reason,
      });
      continue;
    }

    const sourceId = row.sourceName ? sourceByName.get(row.sourceName.trim().toLowerCase()) ?? null : null;
    if (!sourceId) {
      result.push({
        ...row,
        phoneNormalized: phoneResult.normalized,
        sourceId: null,
        classification: "invalid",
        invalidReason: row.sourceName ? `المصدر غير معروف: "${row.sourceName}"` : "المصدر مفقود",
      });
      continue;
    }

    const existingLeadId = existingByPhone.get(phoneResult.normalized);
    if (existingLeadId || seenInFile.has(phoneResult.normalized)) {
      result.push({
        ...row,
        phoneNormalized: phoneResult.normalized,
        sourceId,
        classification: "duplicate",
        existingLeadId,
      });
      continue;
    }

    seenInFile.add(phoneResult.normalized);
    result.push({
      ...row,
      phoneNormalized: phoneResult.normalized,
      sourceId,
      classification: "new",
    });
  }

  return result;
}

export async function previewImport(buffer: Buffer) {
  const rawRows = extractRawRows(buffer);
  const rows = await classifyRows(rawRows);
  const summary = {
    totalRows: rows.length,
    newCount: rows.filter((r) => r.classification === "new").length,
    duplicateCount: rows.filter((r) => r.classification === "duplicate").length,
    invalidCount: rows.filter((r) => r.classification === "invalid").length,
  };
  return { rows, summary };
}

/**
 * Deliberately not wrapped in `prisma.$transaction` — see pgPool.ts: that
 * API was found to corrupt the connection when it overlaps with other
 * concurrent Prisma calls, a real risk here since imports run while agents
 * are actively working the phones. Rows are processed one at a time; a
 * crash mid-import leaves the already-committed rows in place (each is its
 * own atomic write) rather than losing the whole batch.
 */
export async function commitImport(
  session: Session,
  fileName: string,
  rawRows: RawImportRow[],
  strategy: ImportStrategy,
) {
  // Never trust client-sent classification — re-validate against current DB state.
  const rows = await classifyRows(rawRows);

  let addedCount = 0;
  let duplicateCount = 0;
  const errorCount = rows.filter((r) => r.classification === "invalid").length;

  for (const row of rows) {
    if (row.classification === "invalid") continue;

    if (row.classification === "new") {
      const lead = await prisma.lead.create({
        data: {
          fullName: row.fullName,
          phone: row.phoneNormalized!,
          phoneRaw: row.phoneRaw,
          sourceId: row.sourceId!,
          studyGrade: row.studyGrade || null,
          area: row.area || null,
          notes: row.notes || null,
          status: LeadStatus.AVAILABLE,
        },
      });
      await appendTimelineEvent(prisma, {
        leadId: lead.id,
        type: "IMPORTED",
        summary: `تم استيراد العميل من ملف ${fileName}`,
      });
      addedCount++;
      continue;
    }

    // duplicate
    duplicateCount++;
    if (strategy === "ADD_NEW_ONLY") continue;

    const existing = await prisma.lead.findUnique({ where: { id: row.existingLeadId! } });
    if (!existing) continue;

    const fillIfEmpty: Record<string, unknown> = {};
    if (!existing.studyGrade && row.studyGrade) fillIfEmpty.studyGrade = row.studyGrade;
    if (!existing.area && row.area) fillIfEmpty.area = row.area;
    if (!existing.notes && row.notes) fillIfEmpty.notes = row.notes;

    if (strategy === "MERGE" && existing.notes && row.notes) {
      fillIfEmpty.notes = `${existing.notes}\n${row.notes}`;
    }

    if (Object.keys(fillIfEmpty).length > 0) {
      await prisma.lead.update({ where: { id: existing.id }, data: fillIfEmpty });
      await appendTimelineEvent(prisma, {
        leadId: existing.id,
        type: "IMPORTED",
        summary: `تم تحديث بيانات العميل من ملف ${fileName}`,
      });
    }
  }

  await prisma.importLog.create({
    data: {
      fileName,
      userId: session.userId,
      rowCount: rows.length,
      addedCount,
      duplicateCount,
      errorCount,
      strategy,
    },
  });

  return { addedCount, duplicateCount, errorCount, totalRows: rows.length };
}

export async function listImportLogs() {
  return prisma.importLog.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
}
