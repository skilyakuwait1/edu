import { NextRequest, NextResponse } from "next/server";
import { getSessionOrThrow } from "@/lib/auth/session";
import { apiErrorResponse } from "@/lib/api/errors";
import { createLead, listLeadsForUser } from "@/lib/services/lead.service";
import { leadCreateSchema } from "@/lib/validation/leadSchema";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrThrow();
    const { searchParams } = new URL(request.url);
    const result = await listLeadsForUser(session, {
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      page: Number(searchParams.get("page")) || undefined,
      pageSize: Number(searchParams.get("pageSize")) || undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await getSessionOrThrow();
    const body = await request.json();
    const input = leadCreateSchema.parse(body);
    const lead = await createLead(input);
    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
