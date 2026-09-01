import { z } from "zod";

const BOOKING_START_HOUR = 9; // 9 AM
const BOOKING_LAST_START_HOUR = 17; // 5 PM start → 6 PM end is the last slot

function validateSlot(data, ctx) {
  const { start_time, end_time } = data;

  if (start_time.getMinutes() !== 0 || start_time.getSeconds() !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Appointments can only start on the hour (e.g. 9:00 AM)",
      path: ["start_time"],
    });
    return;
  }

  const startHour = start_time.getHours();
  if (startHour < BOOKING_START_HOUR || startHour > BOOKING_LAST_START_HOUR) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Appointments can only be booked between 9:00 AM and 6:00 PM",
      path: ["start_time"],
    });
    return;
  }

  const expectedEnd = new Date(start_time.getTime() + 60 * 60 * 1000);
  if (end_time.getTime() !== expectedEnd.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Appointments are booked in fixed one-hour slots (e.g. 9-10 AM)",
      path: ["end_time"],
    });
    return;
  }

  if (start_time.getTime() < Date.now()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Cannot book an appointment in the past",
      path: ["start_time"],
    });
  }
}

export const addAppointmentSchema = z
  .object({
    client_id: z.coerce.number().int().positive(),
    pets_id: z.coerce.number().int().positive(),
    appointment_services_id: z.coerce.number().int().positive(),
    assigned_staff_id: z.coerce.number().int().positive(),
    appointment_date: z.coerce.date({
      errorMap: () => ({ message: "Invalid appointment date" }),
    }),
    start_time: z.coerce.date({
      errorMap: () => ({ message: "Invalid start time" }),
    }),
    end_time: z.coerce.date({
      errorMap: () => ({ message: "Invalid end time" }),
    }),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .superRefine(validateSlot);

export const editAppointmentSchema = z
  .object({
    pets_id: z.coerce.number().int().positive(),
    appointment_services_id: z.coerce.number().int().positive(),
    assigned_staff_id: z.coerce.number().int().positive(),
    appointment_date: z.coerce.date({
      errorMap: () => ({ message: "Invalid appointment date" }),
    }),
    start_time: z.coerce.date({
      errorMap: () => ({ message: "Invalid start time" }),
    }),
    end_time: z.coerce.date({
      errorMap: () => ({ message: "Invalid end time" }),
    }),
    status_name: z.enum(["Pending", "Confirmed", "Completed"], {
      errorMap: () => ({ message: "Invalid status" }),
    }),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .superRefine(validateSlot);

export const appointmentIdParamSchema = z.object({
  appointment_id: z.coerce.number().int().positive(),
});