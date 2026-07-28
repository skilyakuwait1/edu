import { z } from "zod";

export const callLogCreateSchema = z.object({
  leadId: z.string().min(1),
  result: z.enum([
    "INTERESTED",
    "NEED_FOLLOW_UP",
    "NO_ANSWER",
    "BUSY",
    "WRONG_NUMBER",
    "NOT_INTERESTED",
    "APPOINTMENT_BOOKED",
    "REGISTERED",
    "CALL_BACK_LATER",
  ]),
  durationSeconds: z.number().int().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
  /** ISO date string. Required for NEED_FOLLOW_UP/CALL_BACK_LATER; optional
   * (defaults to +5 days) for INTERESTED/NO_ANSWER/BUSY; ignored otherwise. */
  nextFollowUpDate: z.string().optional().nullable(),
  appointment: z
    .object({
      date: z.string().min(1, "تاريخ الموعد مطلوب"),
      time: z.string().min(1, "وقت الموعد مطلوب"),
      branchId: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
});

export type CallLogCreateInput = z.infer<typeof callLogCreateSchema>;
