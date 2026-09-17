import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button.jsx";
import { fetchGcashQrCode, updateGcashQrCode } from "@/api/http";

export default function ManageQrCodeModal({ onClose }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const { data: qrCode, isPending } = useQuery({
    queryKey: ["GcashQrCode"],
    queryFn: ({ signal }) => fetchGcashQrCode({ signal }),
  });

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("qr_code_image", file);
      await updateGcashQrCode(formData);
      await queryClient.invalidateQueries({ queryKey: ["GcashQrCode"] });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update QR code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Manage GCash QR Code</DialogTitle>
          <DialogDescription>
            Clients scan this in the portal when paying for an appointment
            remotely.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center">
            {isPending ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Loading...
              </p>
            ) : qrCode?.gcash_qr_code_url ? (
              <img
                src={qrCode.gcash_qr_code_url}
                alt="Current GCash QR code"
                className="w-40 h-40 object-contain rounded-lg border border-slate-200 dark:border-slate-800"
              />
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                No QR code uploaded yet.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              {qrCode?.gcash_qr_code_url ? "Replace QR Code" : "Upload QR Code"}
            </label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
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
