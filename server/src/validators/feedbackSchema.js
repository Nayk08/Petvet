import { z } from "zod";

// Sent as multipart/form-data (it can carry a photo), so every field
// arrives as a string: "" means "not given".
const emptyToNull = (v) => (v === "" || v === "null" || v === undefined ? null : v);

const rating = (label) =>
  z.coerce
    .number({ error: `${label} is required` })
    .int(`${label} must be 1 to 5 stars`)
    .min(1, `${label} must be 1 to 5 stars`)
    .max(5, `${label} must be 1 to 5 stars`);

// Client portal: rate a completed visit. staff_rating is optional because a
// visit with no assigned staff has no one to rate (the service checks that).
export const clientPortalFeedbackSchema = z.object({
  service_rating: rating("Service rating"),
  staff_rating: z.preprocess(emptyToNull, rating("Staff rating").nullable()),
  comment: z.preprocess(
    emptyToNull,
    z.string().trim().max(500, "Comment must be 500 characters or less").nullable(),
  ).transform((v) => v || null),
  show_on_website: z.preprocess(
    (v) => (v === undefined || v === "" ? true : v === true || v === "true"),
    z.boolean(),
  ),
});
