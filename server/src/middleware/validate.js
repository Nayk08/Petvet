// middleware/validate.js
import { productImageSchema } from "../validators/productSchema.js";

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ errors: result.error.flatten().fieldErrors });
    }
    req.body = result.data;
    next();
  };
}

export function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res
        .status(400)
        .json({ errors: result.error.flatten().fieldErrors });
    }
    req.params = result.data;
    next();
  };
}

export function validateImage({ required = false } = {}) {
  return (req, res, next) => {
    if (!req.file) {
      if (required) {
        return res
          .status(400)
          .json({ errors: { product_image: ["Product image is required"] } });
      }
      return next(); // no file uploaded, and that's allowed
    }

    const result = productImageSchema.safeParse({
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    if (!result.success) {
      return res
        .status(400)
        .json({ errors: result.error.flatten().fieldErrors });
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
        return res
          .status(400)
          .json({ errors: { [fieldName]: [`${fieldName} is required`] } });
      }
      return next(); // no file uploaded, and that's allowed
    }

    const result = schema.safeParse({
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    if (!result.success) {
      return res
        .status(400)
        .json({ errors: result.error.flatten().fieldErrors });
    }

    next();
  };
}
