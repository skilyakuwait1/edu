import { NextResponse } from "next/server";
import { getSessionOrThrow } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { getLeadForUser } from "@/lib/services/lead.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionOrThrow();
    const { id } = await params;
    const lead = await getLeadForUser(session, id);
    if (!lead) {
      return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    }
    return NextResponse.json({ lead });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
