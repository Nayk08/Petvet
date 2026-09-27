import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// Every upload use case (product/pet/client images, payment proofs, the
// clinic's QR code) shares this one Cloudinary account — only the
// destination folder differs, so a small factory avoids repeating the
// multer/CloudinaryStorage boilerplate per feature.
export function makeUploader({ folder }) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder,
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
    },
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  });
}

// Existing product/pet/client image routes all use this default export —
// unchanged so none of those call sites need to change.
const upload = makeUploader({ folder: "products" });
export default upload;

export const uploadPaymentProof = makeUploader({ folder: "payment_proofs" });
export const uploadQrCode = makeUploader({ folder: "qr_codes" });
export const uploadProfilePicture = makeUploader({ folder: "profile_pictures" });
