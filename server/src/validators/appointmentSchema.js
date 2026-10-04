import { z } from "zod";
import { GCASH_REFERENCE_PATTERN } from "../../utils/validatePaymentMethod.js";
import { manilaInstant } from "../../utils/manilaTime.js";

// Clinic day, in minutes after midnight (Manila wall clock). Shared with the
// model, which also checks that start + the sub-service's duration ends
// by CLINIC_CLOSE_MINUTE and lands on that sub-service's slot grid.
export const CLINIC_OPEN_MINUTE = 9 * 60; // 9:00 AM
export const CLINIC_CLOSE_MINUTE = 18 * 60; // 6:00 PM

// start_time travels as a bare "HH:mm" or "HH:mm:ss" wall-clock
// strings, never a coercible date (see Appointment_Model.js's
// toTimestampString and the FIXED comment in AddAppointmentModal.jsx) — so
// this parses hour/minute directly instead of calling Date methods on them.
const TIME_STRING_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

export function parseTimeString(value) {
  const match = TIME_STRING_PATTERN.exec(value ?? "");
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

// allowPast: an edit may keep a slot that has already started (e.g. adding
// notes to an in-progress visit) — the service only rejects a past slot when
// the edit actually MOVES the appointment there.
function validateSlot(data, ctx, { allowPast = false } = {}) {
  const { appointment_date, start_time } = data;

  // end_time is never taken from the client: the model computes it from
  // the selected sub-service's CURRENT duration.
  const start = parseTimeString(start_time);
  if (!start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid start time",
      path: ["start_time"],
    });
    return;
  }

  const startMinute = start.hour * 60 + start.minute;
  if (startMinute < CLINIC_OPEN_MINUTE || startMinute >= CLINIC_CLOSE_MINUTE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Appointments can only be booked between 9:00 AM and 6:00 PM",
      path: ["start_time"],
    });
    return;
  }

  // The slot is Manila wall-clock time. Treating it as UTC (as this used
  // to) let anyone book a slot up to 8 hours in the past — e.g. 10 AM at
  // 3 PM the same day.
  if (!allowPast && manilaInstant(new Date(appointment_date), start.hour, start.minute) < Date.now()) {
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

// Shared by the staff-side schema (adds client_id below) and the
// client-portal booking schema (client_id comes from the JWT instead, never
// the body) — so both get the exact same business-hour/slot enforcement
// instead of the portal route having none at all.
const baseAppointmentSlotFields = {
  pets_id: z.coerce
    .number({ error: "Please select a pet" })
    .int()
    .positive("Please select a pet"),
  appointment_services_id: z.coerce
    .number({ error: "Please select a service" })
    .int()
    .positive("Please select a service"),
  assigned_staff_id: z.coerce
    .number({ error: "Please select a staff member" })
    .int()
    .positive("Please select a staff member"),
  appointment_date: z.coerce.date({
    error: "Invalid appointment date",
  }),
  start_time: timeOfDaySchema,
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
};

export const addAppointmentSchema = z
  .object({
    client_id: z.coerce
      .number({ error: "Please select a client" })
      .int()
      .positive("Please select a client"),
    ...baseAppointmentSlotFields,
  })
  .superRefine(validateSlot);

// Client-portal equivalent of addAppointmentSchema — same slot/business-hour
// rules, just without client_id (the controller injects that from the
// authenticated JWT, never trusting the request body for it).
export const clientPortalBookAppointmentSchema = z
  .object(baseAppointmentSlotFields)
  .superRefine(validateSlot);

export const editAppointmentSchema = z
  .object({
    pets_id: z.coerce
      .number({ error: "Please select a pet" })
      .int()
      .positive("Please select a pet"),
    appointment_services_id: z.coerce
      .number({ error: "Please select a service" })
      .int()
      .positive("Please select a service"),
    assigned_staff_id: z.coerce
      .number({ error: "Please select a staff member" })
      .int()
      .positive("Please select a staff member"),
    appointment_date: z.coerce.date({
      error: "Invalid appointment date",
    }),
    start_time: timeOfDaySchema,
    status_name: z.enum(["Pending", "In Queue", "Completed", "No Show"], {
      error: "Invalid status",
    }).optional(),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => validateSlot(data, ctx, { allowPast: true }));

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

// An optional add-on charge (de-matting, handling an aggressive pet,
// after-hours service) layered on top of the service's own price — both
// fields travel together so a bare amount with no label (or vice versa)
// never ends up on a receipt.
const additionalFeeFields = {
  additional_fee_label: z.string().trim().max(100).optional().or(z.literal("")),
  additional_fee_amount: z.coerce
    .number({ error: "Additional fee amount must be a valid number" })
    .min(0, "Additional fee amount must be 0 or more")
    .optional(),
};

function validateAdditionalFee(data, ctx) {
  const hasLabel = Boolean(data.additional_fee_label?.trim());
  const hasAmount = data.additional_fee_amount != null;
  if (hasLabel && !hasAmount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "An amount is required for the additional fee.",
      path: ["additional_fee_amount"],
    });
  }
  if (hasAmount && !hasLabel) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A label is required for the additional fee.",
      path: ["additional_fee_label"],
    });
  }
}

export const bookAppointmentWithPaymentSchema = z
  .object({
    client_id: z.coerce
      .number({ error: "Please select a client" })
      .int()
      .positive("Please select a client"),
    pets_id: z.coerce
      .number({ error: "Please select a pet" })
      .int()
      .positive("Please select a pet"),
    appointment_services_id: z.coerce
      .number({ error: "Please select a service" })
      .int()
      .positive("Please select a service"),
    assigned_staff_id: z.coerce
      .number({ error: "Please select a staff member" })
      .int()
      .positive("Please select a staff member"),
    appointment_date: z.coerce.date({
      error: "Invalid appointment date",
    }),
    start_time: timeOfDaySchema,
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    amount: z.coerce
      .number({ error: "Amount must be a valid number" })
      .positive("Amount must be greater than 0")
      .optional(),
    payment_method: z.enum(["Cash", "GCash", "Split"], {
      error: "Invalid payment method",
    }),
    gcash_reference_number: gcashReferenceNumberSchema,
    cash_received: z.coerce
      .number({ error: "Cash received must be a valid number" })
      .min(0, "Cash received must be 0 or more")
      .optional(),
    gcash_received: z.coerce
      .number({ error: "GCash received must be a valid number" })
      .min(0, "GCash received must be 0 or more")
      .optional(),
    ...additionalFeeFields,
  })
  .superRefine(validateSlot)
  .superRefine(validatePaymentFields)
  .superRefine(validateAdditionalFee);

export const completeAppointmentPaymentSchema = z
  .object({
    amount: z.coerce
      .number({ error: "Amount must be a valid number" })
      .positive("Amount must be greater than 0")
      .optional(),
    payment_method: z.enum(["Cash", "GCash", "Split"], {
      error: "Invalid payment method",
    }),
    gcash_reference_number: gcashReferenceNumberSchema,
    cash_received: z.coerce
      .number({ error: "Cash received must be a valid number" })
      .min(0, "Cash received must be 0 or more")
      .optional(),
    gcash_received: z.coerce
      .number({ error: "GCash received must be a valid number" })
      .min(0, "GCash received must be 0 or more")
      .optional(),
    ...additionalFeeFields,
  })
  .superRefine(validatePaymentFields)
  .superRefine(validateAdditionalFee);

export const appointmentIdParamSchema = z.object({
  appointment_id: z.coerce
    .number({ error: "Invalid appointment ID" })
    .int()
    .positive("Invalid appointment ID"),
});

// Real instant a slot starts at (Manila wall-clock date + "HH:mm[:ss]").
export function slotStartInstant(appointment_date, start_time) {
  const start = parseTimeString(start_time);
  return manilaInstant(new Date(appointment_date), start.hour, start.minute);
}
