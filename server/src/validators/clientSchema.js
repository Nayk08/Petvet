import { z } from "zod";

const EMAIL_MSG = "Invalid email format";
// Matches "+63 917 555-0123" (with optional spaces/dashes) or "09XXXXXXXXX" (11 digits)
const MOBILE_REGEX = /^(\+63[\s-]?9\d{2}[\s-]?\d{3}[\s-]?\d{4}|09\d{9})$/;

export const addClientSchema = z.object({
  client_name: z.string().trim().min(1, "Name is required").max(255),
  client_email: z.string().trim().email(EMAIL_MSG),
  contact_no: z
    .string()
    .trim()
    .regex(MOBILE_REGEX, "Invalid mobile number format"),
  emergency_contact_name: z.string().trim().max(100).optional().or(z.literal("")),
  emergency_contact_number: z
    .string()
    .trim()
    .regex(MOBILE_REGEX, "Invalid mobile number format")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
});

// Client self-registration after Google sign-in — the email comes from the
// signed registration token, not the body.
export const clientPortalRegisterSchema = addClientSchema
  .pick({ client_name: true, contact_no: true })
  .extend({ registration_token: z.string().min(1, "Registration expired") });

// Sign-in OTP (see ClientPortal_Service.js): the emailed 6-digit code.
const otpTokenSchema = z.string().min(1, "Your sign-in code expired. Please sign in again.");
export const clientPortalVerifyOtpSchema = z.object({
  otp_token: otpTokenSchema,
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});
export const clientPortalResendOtpSchema = z.object({ otp_token: otpTokenSchema });

export const editClientBodySchema = addClientSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const clientIdParamSchema = z.object({
  client_id: z.coerce
    .number({ error: "Invalid client ID" })
    .int()
    .positive("Invalid client ID"),
});

// Alias kept for the edit route, since the client_id comes from req.params there too
export const editClientParamsSchema = clientIdParamSchema;
