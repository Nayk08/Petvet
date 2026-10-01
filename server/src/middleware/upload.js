import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

// FIXED: CloudinaryStorage streams the file to Cloudinary as part of
// Multer's own upload processing — that used to happen BEFORE the app's
// validateImage/validateFileImage middleware ever got a chance to check
// mimetype/size, so a request that later failed validation still left the
// file sitting in Cloudinary storage forever (nothing deletes it). Multer's
// fileFilter runs synchronously on the incoming file BEFORE it's ever piped
// into the storage engine, so rejecting the wrong type here stops it from
// touching Cloudinary at all, instead of only rejecting the DB write after
// the fact.
function fileFilter(req, file, cb) {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    return cb(null, false);
  }
  cb(null, true);
}

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
    fileFilter,
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
