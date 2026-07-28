import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/session";
import { DuplicateLeadError, InvalidPhoneError } from "@/lib/services/lead.service";
import { MissingFollowUpDateError, MissingAppointmentDetailsError } from "@/lib/services/call-log.service";
import { Prisma } from "@/generated/prisma/client";

export function apiErrorResponse(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof DuplicateLeadError) {
    return NextResponse.json(
      { error: error.message, existing: error.existing },
      { status: 409 },
    );
  }
  if (error instanceof InvalidPhoneError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof MissingFollowUpDateError || error instanceof MissingAppointmentDetailsError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "بيانات غير صالحة", issues: error.issues }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "هذه القيمة مستخدمة مسبقاً" }, { status: 409 });
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
    }
  }

  console.error(error);
  return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
}
