import { z } from "zod";

const EMAIL_MSG = "Invalid email format";

// level_ids arrives as an array from the Roles multi-select — coerced items
// so a stray string ID (from a raw JSON body) still validates cleanly.
const levelIdsSchema = z
  .array(z.coerce.number({ error: "Invalid role" }).int().positive("Invalid role"))
  .min(1, "At least one role is required");

export const addUserSchema = z.object({
  user_name: z.string().trim().min(1, "Name is required").max(100),
  user_email: z.string().trim().email(EMAIL_MSG).max(100),
  user_password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"), // bcrypt silently truncates beyond 72 bytes
  level_ids: levelIdsSchema,
});

// Editing leaves the password field blank/omitted to mean "keep the current
// one" (see Users_Service.js:updateUser) — so unlike addUserSchema, an empty
// password here is valid; only a NON-empty one is length-checked, since a
// short "new" password should still be rejected.
export const updateUserSchema = z.object({
  user_name: z.string().trim().min(1, "Name is required").max(100),
  user_email: z.string().trim().email(EMAIL_MSG).max(100),
  user_password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long")
    .optional()
    .or(z.literal("")),
  level_ids: levelIdsSchema,
});

export const userIdParamSchema = z.object({
  user_id: z.coerce.number({ error: "Invalid user ID" }).int().positive("Invalid user ID"),
});
