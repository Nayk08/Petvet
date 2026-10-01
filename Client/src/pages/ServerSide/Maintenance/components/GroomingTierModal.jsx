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

export default function GroomingTierModal({ tier, onClose }) {
  const isEditMode = Boolean(tier);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    tier_name: tier?.tier_name ?? "",
    max_weight_kg: tier?.max_weight_kg ?? "",
    price: tier?.price ?? "",
    description: tier?.description ?? "",
    duration_minutes: tier?.duration_minutes ?? "",
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
      queryClient.invalidateQueries({ queryKey: ["grooming-price-tiers"] });
      queryClient.invalidateQueries({ queryKey: ["portal-grooming-price-tiers"] });
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
      max_weight_kg: form.max_weight_kg,
      price: form.price,
      description: form.description.trim(),
      duration_minutes: form.duration_minutes || undefined,
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
              Weight-based pricing for the Grooming service.
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
                placeholder="e.g. Small, Medium, Large"
                required
                maxLength={20}
                className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Max Weight (kg)
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
                  min={0}
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
                Estimated Duration (minutes)
              </label>
              <Input
                name="duration_minutes"
                type="number"
                min={1}
                value={form.duration_minutes}
                onChange={handleChange}
                placeholder="e.g. 60"
                className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
              />
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
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
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
              {mutation.isPending
                ? "Saving..."
                : isEditMode
                  ? "Save Changes"
                  : "Add Tier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
