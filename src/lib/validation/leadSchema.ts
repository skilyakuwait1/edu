import { z } from "zod";

// Leads are never assigned manually at creation time — assignment happens
// exclusively through the queue engine (see queue.service.ts). A lead always
// starts life as AVAILABLE and gets pulled into an agent's active set by the
// queue's own claim logic.
export const leadCreateSchema = z.object({
  fullName: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().min(1, "رقم الهاتف مطلوب"),
  email: z.string().email().optional().nullable().or(z.literal("")),
  studyGrade: z.string().optional().nullable(),
  area: z.string().optional().nullable(),
  sourceId: z.string().min(1, "المصدر مطلوب"),
  interestLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;

export const leadStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "ASSIGNED", "FOLLOW_UP", "COMPLETED", "CONVERTED", "LOST"]),
});
