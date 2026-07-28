import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSessionOrThrow, requireRole } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { Role } from "@/generated/tenant-client/client";

const TEMPLATE_ROWS = [
  {
    الاسم: "أحمد سالم",
    "رقم الهاتف": "50000000",
    المصدر: "WhatsApp",
    "الصف الدراسي": "Grade 10",
    المنطقة: "السالمية",
    الملاحظات: "مهتم بالتسجيل للفصل القادم",
  },
];

export async function GET() {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.SUPER_ADMIN, Role.MANAGER]);

    const worksheet = XLSX.utils.json_to_sheet(TEMPLATE_ROWS);
    worksheet["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 30 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

    // Content-Disposition header values must be ASCII — use filename* (RFC 5987) for the
    // Arabic name, with a plain ASCII filename as a fallback for older clients.
    const encodedName = encodeURIComponent("نموذج_استيراد_العملاء.xlsx");

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="leads_import_template.xlsx"; filename*=UTF-8''${encodedName}`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
