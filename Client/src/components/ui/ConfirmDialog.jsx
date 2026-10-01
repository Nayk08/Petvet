import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// A small, self-contained confirm step for a destructive action that
// doesn't warrant its own nested route + modal (e.g. permanently deleting
// an already-archived record) — open/onOpenChange/onConfirm are all the
// caller needs to wire up.
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  isConfirming = false,
  onConfirm,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-sm shadow-2xl transition-colors">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-950 dark:text-slate-100">
            {title}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isConfirming}
            className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600/90 dark:hover:bg-red-600 transition-colors"
          >
            {isConfirming ? "Deleting..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
