import { z } from "zod";

const EMAIL_MSG = "Invalid email format";
// Matches "+63 917 555-0123" (with optional spaces/dashes) or "09XXXXXXXXX" (11 digits)
const MOBILE_REGEX = /^(\+63[\s-]?9\d{2}[\s-]?\d{3}[\s-]?\d{4}|09\d{9})$/;

export const addClientPetSchema = z.object({
  // Owner / client contact info carried on the pet record
  client_id: z.coerce.number().int().positive("Invalid client ID"),
  name: z.string().trim().min(1, "Owner name is required").max(255),
  email: z.string().trim().email(EMAIL_MSG),
  mobile_no: z
    .string()
    .trim()
    .regex(MOBILE_REGEX, "Invalid mobile number format"),

  // Pet-specific fields
  pet_name: z.string().trim().min(1, "Pet name is required").max(255),
  species: z.string().trim().min(1, "Species is required").max(100),
  breed: z.string().trim().max(100).optional(),
  birth_date: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .refine((val) => {
      if (!val) return true;
      return new Date(val).getTime() <= Date.now();
    }, "Birth date cannot be in the future"),
  weight: z.coerce
    .number({ invalid_type_error: "Weight must be a number" })
    .positive("Weight must be greater than 0")
    .optional(),
});

export const updateClientPetSchema = addClientPetSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0,
     {
    message: "At least one field must be provided",
  });

export const clientPetIdParamSchema = z.object({
  pet_id: z.coerce.number().int().positive("Invalid pet ID"),
});
