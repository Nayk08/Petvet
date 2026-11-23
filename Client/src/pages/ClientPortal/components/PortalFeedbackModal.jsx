import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ImagePlus, Star, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button.jsx";
import { submitMyFeedback } from "@/api/clientPortal.js";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

// 1-5 stars as a radio group, so it works with the keyboard and screen readers.
function StarPicker({ name, label, value, onChange }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
        {label}
      </legend>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer p-0.5" title={LABELS[n]}>
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only peer"
              aria-label={`${n} star${n === 1 ? "" : "s"} (${LABELS[n]})`}
            />
            <Star
              className={`size-8 transition-colors rounded-sm peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 ${
                n <= value
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-300 dark:text-slate-600 hover:text-amber-300"
              }`}
            />
          </label>
        ))}
        <span className="ml-2 text-sm text-slate-600 dark:text-slate-300 min-w-20">
          {LABELS[value]}
        </span>
      </div>
    </fieldset>
  );
}

// Rate a completed visit: the service, and the groomer/vet who handled it
// (when one was assigned). One rating per visit.
export default function PortalFeedbackModal({ appointment, onClose }) {
  const queryClient = useQueryClient();
  const hasStaff = Boolean(appointment.staff_name);
  const [serviceRating, setServiceRating] = useState(0);
  const [staffRating, setStaffRating] = useState(0);
  const [comment, setComment] = useState("");
  const [showOnWebsite, setShowOnWebsite] = useState(true);
  const [photo, setPhoto] = useState(null); // { file, preview }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = serviceRating > 0 && (!hasStaff || staffRating > 0);

  function handlePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = ""; // picking the same file again still fires
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Photo must be a JPG, PNG or WEBP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be 5MB or smaller.");
      return;
    }
    setError(null);
    if (photo) URL.revokeObjectURL(photo.preview);
    setPhoto({ file, preview: URL.createObjectURL(file) });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("service_rating", serviceRating);
      if (hasStaff) formData.append("staff_rating", staffRating);
      formData.append("comment", comment.trim());
      formData.append("show_on_website", showOnWebsite);
      if (photo) formData.append("feedback_image", photo.file);
      await submitMyFeedback(appointment.appointment_id, formData);
      await queryClient.invalidateQueries({ queryKey: ["clientPortal", "appointments"] });
      toast.success("Thanks for your feedback!", {
        description: "It helps our team keep improving.",
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to send your feedback.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate your visit</DialogTitle>
          <DialogDescription>
            {appointment.pets_name}'s {appointment.service_name}
            {hasStaff ? ` with ${appointment.staff_name}` : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <StarPicker
            name="service_rating"
            label="How was the service?"
            value={serviceRating}
            onChange={setServiceRating}
          />
          {hasStaff && (
            <StarPicker
              name="staff_rating"
              label={`How was ${appointment.staff_name}?`}
              value={staffRating}
              onChange={setStaffRating}
            />
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="feedback-comment"
              className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400"
            >
              Comment (optional)
            </label>
            <textarea
              id="feedback-comment"
              rows={3}
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us about your visit"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <p className="text-[11px] text-slate-400 text-right">{comment.length}/500</p>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Photo (optional)
            </p>
            {photo ? (
              <div className="relative w-28 h-28">
                <img
                  src={photo.preview}
                  alt="Your photo"
                  className="w-full h-full object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                />
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(photo.preview);
                    setPhoto(null);
                  }}
                  aria-label="Remove photo"
                  className="absolute -top-2 -right-2 size-7 grid place-items-center rounded-full bg-slate-900 text-white shadow"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-indigo-500">
                <ImagePlus className="size-5 text-slate-500 dark:text-slate-400" />
                <span className="text-xs text-slate-700 dark:text-slate-200">
                  Add a photo of your pet
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                    JPG, PNG or WEBP up to 5MB
                  </span>
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhoto}
                  className="sr-only"
                />
              </label>
            )}
          </div>

          <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={showOnWebsite}
              onChange={(e) => setShowOnWebsite(e.target.checked)}
              className="h-4 w-4 mt-0.5 rounded border-slate-300 dark:border-slate-700"
            />
            Show my rating, comment and photo on the PetVet website (first name only)
          </label>

          {error && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Sending..." : "Submit Feedback"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
