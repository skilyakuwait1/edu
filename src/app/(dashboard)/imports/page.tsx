import Link from "next/link";
import { getSessionOrThrow, requireRole } from "@/lib/auth/session";
import { Role } from "@/generated/prisma/client";
import { ImportWizard } from "@/components/imports/ImportWizard";

export default async function ImportsPage() {
  const session = await getSessionOrThrow();
  requireRole(session, [Role.SUPER_ADMIN, Role.MANAGER]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">استيراد Excel</h1>
        <div className="flex gap-4 text-sm">
          <a href="/api/imports/template" className="text-gray-500 hover:underline">
            تحميل نموذج Excel
          </a>
          <Link href="/imports/history" className="text-gray-500 hover:underline">
            سجل الاستيراد
          </Link>
        </div>
      </div>
      <ImportWizard />
    </div>
  );
}
