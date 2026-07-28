import { LeadStatus } from "@/generated/prisma/client";

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  AVAILABLE: "متاح بالطابور",
  ASSIGNED: "قيد المتابعة",
  FOLLOW_UP: "متابعة لاحقة",
  COMPLETED: "مكتمل",
  CONVERTED: "تم التسجيل",
  LOST: "خسرنا العميل",
};

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "AVAILABLE",
  "ASSIGNED",
  "FOLLOW_UP",
  "COMPLETED",
  "CONVERTED",
  "LOST",
];

export const INTEREST_LEVEL_LABELS: Record<string, string> = {
  LOW: "منخفضة",
  MEDIUM: "متوسطة",
  HIGH: "عالية",
};
