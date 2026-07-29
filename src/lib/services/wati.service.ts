import { prisma } from "@/lib/prisma";

export class WatiNotConfiguredError extends Error {
  constructor() {
    super("لم يتم إعداد WATI بعد — من الإعدادات > تكامل واتساب (WATI)، أدخل بيانات الحساب");
  }
}

export class WatiRequestError extends Error {}

/**
 * Sends a reminder via WATI's WhatsApp Business API using a pre-approved
 * template (business-initiated messages outside an active 24h customer
 * session require an approved template, not freeform text). The template
 * must exist in the tenant's own WATI/Meta account with a single
 * placeholder for the customer's name.
 *
 * Untested against a live WATI account as of writing — the tenant hadn't
 * signed up yet. Response field names (`result`/`info`) follow WATI's
 * published API docs; confirm against a real response on first use and
 * adjust here if their contract has since changed.
 */
export async function sendWatiReminder(phone: string, fullName: string) {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  if (!settings?.watiApiEndpoint || !settings?.watiApiKey || !settings?.watiTemplateName) {
    throw new WatiNotConfiguredError();
  }

  const endpoint = settings.watiApiEndpoint.replace(/\/+$/, "");
  const url = `${endpoint}/api/v1/sendTemplateMessage?whatsappNumber=${phone}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.watiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_name: settings.watiTemplateName,
        broadcast_name: settings.watiTemplateName,
        parameters: [{ name: "name", value: fullName }],
      }),
    });
  } catch {
    throw new WatiRequestError("تعذر الاتصال بخادم WATI — تحقق من رابط الـ API");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok || data?.result === false) {
    throw new WatiRequestError(data?.info ?? data?.message ?? "تعذر إرسال التذكير عبر WATI");
  }

  return data;
}
