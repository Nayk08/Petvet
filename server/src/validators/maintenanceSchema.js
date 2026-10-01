import { z } from "zod";

const ALLOWED_ROLE_VALUES = ["Veterinarian", "Groomer", "Staff", "Admin"];

// Sent as a JSON array from the frontend (a multi-select of staff roles).
// Empty is allowed at the schema level — the service just won't be
// assignable to anyone until at least one role is added, same as leaving
// any other optional field blank.
const allowedRolesSchema = z
  .array(z.enum(ALLOWED_ROLE_VALUES, { error: "Invalid role" }))
  .max(ALLOWED_ROLE_VALUES.length);

// Kept as a plain optional string, not z.coerce.number() — an empty price
// input means "no fixed price / priced manually at booking", and coercion
// would turn "" into 0 before that distinction ever reaches the model.
const priceSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0), {
    message: "Price must be 0 or more",
  })
  .optional()
  .or(z.literal(""));

export const addServiceSchema = z.object({
  appointment_services: z.string().trim().min(1, "Service name is required").max(50),
  category: z.string().trim().max(50).optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  service_price: priceSchema,
  min_price: priceSchema,
  duration_minutes: z.coerce
    .number({ error: "Duration must be a valid number" })
    .int()
    .positive("Duration must be at least 1 minute")
    .optional(),
  allowed_roles: allowedRolesSchema,
});

export const updateServiceSchema = addServiceSchema.partial();

export const serviceIdParamSchema = z.object({
  service_id: z.coerce
    .number({ error: "Invalid service ID" })
    .int()
    .positive("Invalid service ID"),
});

export const addGroomingTierSchema = z.object({
  tier_name: z.string().trim().min(1, "Tier name is required").max(20),
  max_weight_kg: z
    .string()
    .trim()
    .refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) > 0), {
      message: "Max weight must be greater than 0",
    })
    .optional()
    .or(z.literal("")), // blank = "no upper limit" (the largest tier)
  price: z.coerce
    .number({ error: "Price must be a valid number" })
    .min(0, "Price must be 0 or more"),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  duration_minutes: z.coerce
    .number({ error: "Duration must be a valid number" })
    .int()
    .positive("Duration must be at least 1 minute")
    .optional(),
});

export const updateGroomingTierSchema = addGroomingTierSchema.partial();

export const tierIdParamSchema = z.object({
  tier_id: z.coerce
    .number({ error: "Invalid tier ID" })
    .int()
    .positive("Invalid tier ID"),
});
