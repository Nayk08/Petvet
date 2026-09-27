import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, ImageIcon, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button.jsx";
import { updateMyProfilePicture } from "@/api/http";

export default function ProfilePictureModal({ user, onClose }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(user?.user_picture ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const userInitials = (user?.name || user?.email || "User")
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  function handleFileChange(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(selected);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("profile_picture", file);
      await updateMyProfilePicture(formData);

      await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      await queryClient.invalidateQueries({ queryKey: ["navData"] });

      toast.success("Profile picture updated", {
        className:
          "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 flex items-center gap-3 p-4 rounded-lg shadow-lg",
        descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
        duration: 2000,
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
      });
      onClose();
    } catch (err) {
      const message = err.message || "Failed to update profile picture.";
      setError(message);
      toast.error("Failed to update profile picture", {
        className:
          "bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg",
        description: message,
        descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
        duration: 2500,
        icon: <XCircle className="h-5 w-5 text-destructive" />,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-sm shadow-xl rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-950 dark:text-slate-50">
            Profile Picture
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
            This shows next to your name across the app.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 bg-indigo-600 flex items-center justify-center shrink-0">
              {preview ? (
                <img
                  src={preview}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-semibold text-white">
                  {userInitials}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              {user?.user_picture ? "Change Picture" : "Upload Picture"}
            </label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileChange}
              className="w-full text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 dark:file:bg-slate-800 dark:file:text-slate-200"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!file || isSubmitting}>
              {isSubmitting ? "Uploading..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
