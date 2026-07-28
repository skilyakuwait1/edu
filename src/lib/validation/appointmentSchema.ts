import { z } from "zod";

export const appointmentStatusSchema = z.object({
  status: z.enum(["BOOKED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
});

export type AppointmentStatusInput = z.infer<typeof appointmentStatusSchema>;
