import { z } from "zod";

export const followUpCreateSchema = z.object({
  leadId: z.string().min(1),
  followUpDate: z.string().min(1, "تاريخ المتابعة مطلوب"),
  followUpTime: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type FollowUpCreateInput = z.infer<typeof followUpCreateSchema>;
