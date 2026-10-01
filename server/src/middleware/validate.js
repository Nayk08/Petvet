// middleware/validate.js
import { productImageSchema } from "../validators/productSchema.js";

// Every validator schema in this app already writes its own human-readable
// message (e.g. "Product name is required") — this just surfaces the FIRST
// one as a top-level `message` too, so a plain toast showing `body.message`
// says something specific instead of a generic "failed to save" fallback.
// `errors` (the full field->message map) stays available for forms that
// want to highlight individual fields.
function firstFieldError(flatError) {
  return Object.values(flatError.fieldErrors)[0]?.[0];
}

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const flat = result.error.flatten();
      return res.status(400).json({
        message: firstFieldError(flat) || "Please check your input and try again.",
        errors: flat.fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}

export function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const flat = result.error.flatten();
      return res.status(400).json({
        message: firstFieldError(flat) || "Please check your input and try again.",
        errors: flat.fieldErrors,
      });
    }
    req.params = result.data;
    next();
  };
}

export function validateImage({ required = false } = {}) {
  return (req, res, next) => {
    if (!req.file) {
      if (required) {
        return res.status(400).json({
          message: "Product image is required",
          errors: { product_image: ["Product image is required"] },
        });
      }
      return next(); // no file uploaded, and that's allowed
    }

    const result = productImageSchema.safeParse({
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    if (!result.success) {
      const flat = result.error.flatten();
      return res.status(400).json({
        message: firstFieldError(flat) || "That image can't be used.",
        errors: flat.fieldErrors,
      });
    }

    next();
  };
}

// Generic version for any resource (pet photos, avatars, etc.)
// Existing calls to validateImage() above are untouched — use this one for anything new.
export function validateFileImage(
  schema,
  { required = false, fieldName = "image" } = {},
) {
  return (req, res, next) => {
    if (!req.file) {
      if (required) {
        const message = `${fieldName} is required`;
        return res.status(400).json({ message, errors: { [fieldName]: [message] } });
      }
      return next(); // no file uploaded, and that's allowed
    }

    const result = schema.safeParse({
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    if (!result.success) {
      const flat = result.error.flatten();
      return res.status(400).json({
        message: firstFieldError(flat) || "That image can't be used.",
        errors: flat.fieldErrors,
      });
    }

    next();
  };
}
