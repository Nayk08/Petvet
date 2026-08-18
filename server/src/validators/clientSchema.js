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
});

export const editClientBodySchema = addClientSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const clientIdParamSchema = z.object({
  client_id: z.coerce.number().int().positive("Invalid client ID"),
});

// Alias kept for the edit route, since the client_id comes from req.params there too
export const editClientParamsSchema = clientIdParamSchema;
