import { NextResponse } from "next/server";
import { PlatformUnauthorizedError } from "@/lib/platformSession";

export function platformApiErrorResponse(error: unknown): NextResponse {
  if (error instanceof PlatformUnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  console.error(error);
  return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
}
