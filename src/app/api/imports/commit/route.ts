import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionOrThrow, requireRole } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { commitImport } from "@/lib/services/import.service";
import { Role } from "@/generated/prisma/client";

const commitSchema = z.object({
  fileName: z.string().min(1),
  strategy: z.enum(["ADD_NEW_ONLY", "UPDATE_EXISTING", "MERGE"]),
  rows: z.array(
    z.object({
      rowNumber: z.number(),
      fullName: z.string(),
      phoneRaw: z.string(),
      sourceName: z.string(),
      studyGrade: z.string(),
      area: z.string(),
      notes: z.string(),
    }),
  ),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    requireRole(session, [Role.SUPER_ADMIN, Role.MANAGER]);

    const body = await request.json();
    const { fileName, strategy, rows } = commitSchema.parse(body);
    const result = await commitImport(session, fileName, rows, strategy);
    return NextResponse.json({ result });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
