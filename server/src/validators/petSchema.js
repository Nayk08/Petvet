import { z } from "zod";

export const addPetSchema = z.object({
  pets_name: z.string().trim().min(1, "Pet name is required").max(255),
  breed: z.string().trim().max(255).optional().or(z.literal("")),
  is_spayed_neutered: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true"),
  date_of_birth: z.coerce.date({
    errorMap: () => ({ message: "Invalid date of birth" }),
  }),
  weight_kg: z.coerce
    .number()
    .positive("Weight must be greater than 0")
    .max(999.99, "Weight must be 999.99 kg or less"),
  pet_status_id: z.coerce.number().int().positive(),
  species_id: z.coerce.number().int().positive(),
  gender_id: z.coerce.number().int().positive(),
});

export const editPetSchema = z.object({
  pets_name: z.string().trim().min(1, "Pet name is required").max(255),
  breed: z.string().trim().max(255).optional().or(z.literal("")),
  is_spayed_neutered: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true"),
  date_of_birth: z.coerce.date({
    errorMap: () => ({ message: "Invalid date of birth" }),
  }),
  weight_kg: z.coerce
    .number()
    .positive("Weight must be greater than 0")
    .max(999.99, "Weight must be 999.99 kg or less"),
  pet_status_id: z.coerce.number().int().positive(),
  species_id: z.coerce.number().int().positive(),
  gender_id: z.coerce.number().int().positive(),
});

export const petIdParamSchema = z.object({
  pets_id: z.coerce.number().int().positive(),
});

const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB, matches the multer limit

export const petImageSchema = z.object({
  mimetype: z
    .string()
    .refine(
      (type) => ALLOWED_IMAGE_MIME_TYPES.includes(type),
      "Image must be JPG, PNG, or WEBP",
    ),
  size: z.number().max(MAX_IMAGE_SIZE_BYTES, "Image must be 5MB or smaller"),
});
