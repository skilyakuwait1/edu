import { NextRequest, NextResponse } from "next/server";
import { getSessionOrThrow, requireRole } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { previewImport } from "@/lib/services/import.service";
import { Role } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.SUPER_ADMIN, Role.MANAGER]);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "الملف مطلوب" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { rows, summary } = await previewImport(buffer);
    return NextResponse.json({ rows, summary });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
