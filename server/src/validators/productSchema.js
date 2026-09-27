import { z } from "zod";

const productExpiryDateSchema = z
  .string()
  .optional()
  .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
  .refine((val) => {
    if (!val) return true;
    const year = new Date(val).getFullYear();
    const currentYear = new Date().getFullYear();
    return year >= currentYear && year <= currentYear + 50;
  }, "Expiry date year looks invalid");

export const addProductSchema = z.object({
  product_name: z.string().trim().min(1, "Product name is required").max(255),
  product_quantity: z.coerce
    .number()
    .int()
    .min(0, "Quantity must be 0 or more"),
  product_price: z.coerce.number().min(0, "Price must be 0 or more"),
  product_expiry_date: productExpiryDateSchema,
});

export const updateProductSchema = addProductSchema.partial();

// Dedicated "restock" action — adds to an existing batch's quantity and
// always overwrites its price/expiry with whatever's submitted (both
// pre-filled with the batch's current values on the form, so leaving them
// untouched is a no-op).
export const addQuantitySchema = z.object({
  quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
  product_price: z.coerce.number().min(0, "Price must be 0 or more"),
  product_expiry_date: productExpiryDateSchema,
});

export const productIdParamSchema = z.object({
  product_id: z.coerce.number().int().positive("Invalid product ID"),
});

const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB, matches your multer limit

export const productImageSchema = z.object({
  mimetype: z
    .string()
    .refine(
      (type) => ALLOWED_IMAGE_MIME_TYPES.includes(type),
      "Image must be JPG, PNG, or WEBP",
    ),
  size: z.number().max(MAX_IMAGE_SIZE_BYTES, "Image must be 5MB or smaller"),
});
