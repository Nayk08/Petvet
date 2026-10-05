import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import {
  addMaintenanceGroomingTier,
  updateMaintenanceGroomingTier,
} from "@/api/http.js";

// `tier` is null for "add", or the row being edited.
export default function GroomingTierModal({ tier, onClose }) {
  const isEditMode = Boolean(tier);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    tier_name: tier?.tier_name ?? "",
    max_weight_kg: tier?.max_weight_kg ?? "",
    price: tier?.price ?? "",
    description: tier?.description ?? "",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEditMode
        ? updateMaintenanceGroomingTier(tier.tier_id, payload)
        : addMaintenanceGroomingTier(payload),
    onSuccess: () => {
      toast.success(isEditMode ? "Grooming tier updated" : "Grooming tier added");
      queryClient.invalidateQueries({ queryKey: ["maintenance-grooming-tiers"] });
      // Booking screens get the tiers with the services list.
      queryClient.invalidateQueries({ queryKey: ["appointment-services"] });
      queryClient.invalidateQueries({ queryKey: ["portal-appointment-services"] });
      onClose();
    },
    onError: (error) => {
      toast.error(
        isEditMode ? "Could not update grooming tier" : "Could not add grooming tier",
        { description: error.message },
      );
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    mutation.mutate({
      tier_name: form.tier_name.trim(),
      max_weight_kg: String(form.max_weight_kg ?? ""),
      price: form.price,
      description: form.description.trim(),
    });
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-sm shadow-2xl transition-colors">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-950 dark:text-slate-100">
              {isEditMode ? "Edit Grooming Tier" : "Add Grooming Tier"}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
              Grooming is priced by the pet's weight: the smallest tier that
              covers it applies.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Tier Name
              </label>
              <Input
                name="tier_name"
                value={form.tier_name}
                onChange={handleChange}
                placeholder="e.g. 1kg - 7kg"
                required
                maxLength={20}
                className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Up to (kg)
                </label>
                <Input
                  name="max_weight_kg"
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={form.max_weight_kg}
                  onChange={handleChange}
                  placeholder="Blank = no limit"
                  className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Price (₱)
                </label>
                <Input
                  name="price"
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  required
                  className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={2}
                maxLength={1000}
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
            >
              {mutation.isPending ? "Saving..." : isEditMode ? "Save Changes" : "Add Tier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
