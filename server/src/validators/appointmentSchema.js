import { z } from "zod";
import { GCASH_REFERENCE_PATTERN } from "../../utils/validatePaymentMethod.js";

const BOOKING_START_HOUR = 9; // 9 AM
const BOOKING_LAST_START_HOUR = 17; // 5 PM start → 6 PM end is the last slot

// start_time/end_time travel as bare "HH:mm" or "HH:mm:ss" wall-clock
// strings, never a coercible date (see Appointment_Model.js's
// toTimestampString and the FIXED comment in AddAppointmentModal.jsx) — so
// this parses hour/minute directly instead of calling Date methods on them.
const TIME_STRING_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

function parseTimeString(value) {
  const match = TIME_STRING_PATTERN.exec(value ?? "");
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function validateSlot(data, ctx) {
  const { appointment_date, start_time, end_time } = data;

  const start = parseTimeString(start_time);
  if (!start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid start time",
      path: ["start_time"],
    });
    return;
  }

  const end = parseTimeString(end_time);
  if (!end) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid end time",
      path: ["end_time"],
    });
    return;
  }

  if (start.minute !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Appointments can only start on the hour (e.g. 9:00 AM)",
      path: ["start_time"],
    });
    return;
  }

  if (
    start.hour < BOOKING_START_HOUR ||
    start.hour > BOOKING_LAST_START_HOUR
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Appointments can only be booked between 9:00 AM and 6:00 PM",
      path: ["start_time"],
    });
    return;
  }

  if (end.hour !== start.hour + 1 || end.minute !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Appointments are booked in fixed one-hour slots (e.g. 9-10 AM)",
      path: ["end_time"],
    });
    return;
  }

  // Compare the requested civil date+time against "now" using UTC
  // components on both sides — matches how appointment_date is treated as
  // UTC-midnight everywhere else in this flow (toTimestampString), so this
  // stays consistent with what actually gets written to the DB instead of
  // drifting through local-timezone Date math.
  const requested = new Date(appointment_date);
  requested.setUTCHours(start.hour, start.minute, 0, 0);
  if (requested.getTime() < Date.now()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Cannot book an appointment in the past",
      path: ["start_time"],
    });
  }
}

// Format itself is checked in validateSlot (via parseTimeString) so the
// error path/message stays identical whether the string is malformed or
// just outside business hours — this only needs to be a string here.
const timeOfDaySchema = z.string();

// Cash payments don't render a reference-number field at all, so the client
// submits it as JSON `null` rather than omitting the key — .optional()
// alone only tolerates the key being absent (undefined), not an explicit
// null, so .nullable() must be kept here too. (This has already regressed
// once from a schema edit that dropped it — don't remove it again.)
const gcashReferenceNumberSchema = z
  .string()
  .trim()
  .max(50)
  .nullable()
  .optional()
  .or(z.literal(""));

export const addAppointmentSchema = z
  .object({
    client_id: z.coerce.number().int().positive(),
    pets_id: z.coerce.number().int().positive(),
    appointment_services_id: z.coerce.number().int().positive(),
    assigned_staff_id: z.coerce.number().int().positive(),
    appointment_date: z.coerce.date({
      error: "Invalid appointment date",
    }),
    start_time: timeOfDaySchema,
    end_time: timeOfDaySchema,
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .superRefine(validateSlot);

export const editAppointmentSchema = z
  .object({
    pets_id: z.coerce.number().int().positive(),
    appointment_services_id: z.coerce.number().int().positive(),
    assigned_staff_id: z.coerce.number().int().positive(),
    appointment_date: z.coerce.date({
      error: "Invalid appointment date",
    }),
    start_time: timeOfDaySchema,
    end_time: timeOfDaySchema,
    status_name: z.enum(["Pending", "In Queue", "Completed"], {
      error: "Invalid status",
    }),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .superRefine(validateSlot);

function validatePaymentFields(data, ctx) {
  const needsReference =
    data.payment_method === "GCash" || data.payment_method === "Split";
  if (!needsReference) return;

  const reference = data.gcash_reference_number?.trim();
  if (!reference) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `A GCash reference number is required for ${data.payment_method} payments.`,
      path: ["gcash_reference_number"],
    });
    return;
  }

  if (!GCASH_REFERENCE_PATTERN.test(reference)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "GCash reference number must be exactly 13 digits.",
      path: ["gcash_reference_number"],
    });
  }
}

export const bookAppointmentWithPaymentSchema = z
  .object({
    client_id: z.coerce.number().int().positive(),
    pets_id: z.coerce.number().int().positive(),
    appointment_services_id: z.coerce.number().int().positive(),
    assigned_staff_id: z.coerce.number().int().positive(),
    appointment_date: z.coerce.date({
      error: "Invalid appointment date",
    }),
    start_time: timeOfDaySchema,
    end_time: timeOfDaySchema,
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    amount: z.coerce.number().positive().optional(),
    payment_method: z.enum(["Cash", "GCash", "Split"], {
      error: "Invalid payment method",
    }),
    gcash_reference_number: gcashReferenceNumberSchema,
    cash_received: z.coerce.number().min(0).optional(),
    gcash_received: z.coerce.number().min(0).optional(),
  })
  .superRefine(validateSlot)
  .superRefine(validatePaymentFields);

export const completeAppointmentPaymentSchema = z
  .object({
    amount: z.coerce.number().positive().optional(),
    payment_method: z.enum(["Cash", "GCash", "Split"], {
      error: "Invalid payment method",
    }),
    gcash_reference_number: gcashReferenceNumberSchema,
    cash_received: z.coerce.number().min(0).optional(),
    gcash_received: z.coerce.number().min(0).optional(),
  })
  .superRefine(validatePaymentFields);

export const appointmentIdParamSchema = z.object({
  appointment_id: z.coerce.number().int().positive(),
});
