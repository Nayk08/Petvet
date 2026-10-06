import { z } from "zod";

// Multipart form fields arrive as strings (the picture is a separate file).
export const announcementSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  caption: z.string().trim().max(1000).optional().or(z.literal("")),
  is_published: z
    .enum(["true", "false"], { error: "is_published must be true or false" })
    .optional(),
  // "true" = drop the current picture (edit only).
  remove_image: z.enum(["true", "false"]).optional(),
});

export const announcementIdParamSchema = z.object({
  announcement_id: z.coerce.number({ error: "Invalid announcement ID" }).int().positive(),
});

export const clinicAddressSchema = z.object({
  clinic_address: z.string().trim().min(3, "Enter the clinic address").max(300),
});
