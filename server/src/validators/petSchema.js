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
  weight_kg: z.coerce.number().positive("Weight must be greater than 0"),
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
  weight_kg: z.coerce.number().positive("Weight must be greater than 0"),
  pet_status_id: z.coerce.number().int().positive(),
  species_id: z.coerce.number().int().positive(),
  gender_id: z.coerce.number().int().positive(),
});

export const petIdParamSchema = z.object({
  pets_id: z.coerce.number().int().positive(),
});
