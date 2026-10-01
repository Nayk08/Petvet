import { z } from "zod";

// Free-text medical/behavioral notes — kept short enough to stay readable
// on the pet's record card, not a full chart (see the Maintenance module's
// EMR doc for where detailed visit-by-visit notes actually belong).
const medicalNoteFields = {
  allergies: z.string().trim().max(500).optional().or(z.literal("")),
  medical_conditions: z.string().trim().max(500).optional().or(z.literal("")),
  temperament: z.string().trim().max(30).optional().or(z.literal("")),
};

export const addPetSchema = z.object({
  pets_name: z.string().trim().min(1, "Pet name is required").max(255),
  breed: z.string().trim().max(255).optional().or(z.literal("")),
  is_spayed_neutered: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true"),
  date_of_birth: z.coerce.date({ error: "Enter a valid date of birth" }),
  weight_kg: z.coerce
    .number({ error: "Weight must be a valid number" })
    .positive("Weight must be greater than 0")
    .max(999.99, "Weight must be 999.99 kg or less"),
  pet_status_id: z.coerce
    .number({ error: "Please select a pet status" })
    .int()
    .positive("Please select a pet status"),
  species_id: z.coerce
    .number({ error: "Please select a species" })
    .int()
    .positive("Please select a species"),
  gender_id: z.coerce
    .number({ error: "Please select a gender" })
    .int()
    .positive("Please select a gender"),
  ...medicalNoteFields,
});

export const editPetSchema = z.object({
  pets_name: z.string().trim().min(1, "Pet name is required").max(255),
  breed: z.string().trim().max(255).optional().or(z.literal("")),
  is_spayed_neutered: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true"),
  date_of_birth: z.coerce.date({ error: "Enter a valid date of birth" }),
  weight_kg: z.coerce
    .number({ error: "Weight must be a valid number" })
    .positive("Weight must be greater than 0")
    .max(999.99, "Weight must be 999.99 kg or less"),
  pet_status_id: z.coerce
    .number({ error: "Please select a pet status" })
    .int()
    .positive("Please select a pet status"),
  species_id: z.coerce
    .number({ error: "Please select a species" })
    .int()
    .positive("Please select a species"),
  gender_id: z.coerce
    .number({ error: "Please select a gender" })
    .int()
    .positive("Please select a gender"),
  ...medicalNoteFields,
});

export const transferPetOwnerSchema = z.object({
  new_client_id: z.coerce
    .number({ error: "Please select the new owner" })
    .int()
    .positive("Please select the new owner"),
});

export const petIdParamSchema = z.object({
  pets_id: z.coerce
    .number({ error: "Invalid pet ID" })
    .int()
    .positive("Invalid pet ID"),
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
