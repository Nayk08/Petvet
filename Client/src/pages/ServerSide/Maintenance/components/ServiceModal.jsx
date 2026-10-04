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
import { addMaintenanceService, updateMaintenanceService } from "@/api/http.js";

const ROLE_OPTIONS = ["Veterinarian", "Groomer", "Staff", "Admin"];

// `service` is null for "add", or the row being edited for "edit" — both
// paths share this one form/mutation, same as most other add/edit pairs in
// this app.
export default function ServiceModal({ service, categories, defaultCategoryId, onClose }) {
  const isEditMode = Boolean(service);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    appointment_services: service?.appointment_services ?? "",
    category_id: String(service?.category_id ?? defaultCategoryId ?? ""),
    description: service?.description ?? "",
    service_price: service?.service_price ?? "",
    duration_minutes: service?.duration_minutes ?? "",
  });
  const [selectedRoles, setSelectedRoles] = useState(
    service?.allowed_roles ?? [],
  );

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggleRole(role) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEditMode
        ? updateMaintenanceService(service.appointment_services_id, payload)
        : addMaintenanceService(payload),
    onSuccess: () => {
      toast.success(isEditMode ? "Sub-service updated" : "Sub-service added");
      queryClient.invalidateQueries({ queryKey: ["maintenance-services"] });
      // Booking dropdowns (staff + client portal) read the same catalog.
      queryClient.invalidateQueries({ queryKey: ["appointment-services"] });
      queryClient.invalidateQueries({ queryKey: ["portal-appointment-services"] });
      onClose();
    },
    onError: (error) => {
      toast.error(isEditMode ? "Could not update service" : "Could not add service", {
        description: error.message,
      });
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    mutation.mutate({
      appointment_services: form.appointment_services.trim(),
      category_id: Number(form.category_id),
      description: form.description.trim(),
      service_price: form.service_price,
      duration_minutes: Number(form.duration_minutes),
      allowed_roles: selectedRoles,
    });
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-md shadow-2xl transition-colors">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-950 dark:text-slate-100">
              {isEditMode ? "Edit Sub-service" : "Add Sub-service"}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
              Its duration sets the appointment end time when booking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Sub-service Name
              </label>
              <Input
                name="appointment_services"
                value={form.appointment_services}
                onChange={handleChange}
                required
                maxLength={50}
                className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Category
                </label>
                {/* The three fixed categories — a sub-service belongs to exactly one. */}
                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  required
                  className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2 text-sm text-slate-900 dark:text-slate-100"
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Duration (minutes)
                </label>
                <Input
                  name="duration_minutes"
                  type="number"
                  min={1}
                  max={540}
                  step={1}
                  required
                  value={form.duration_minutes}
                  onChange={handleChange}
                  placeholder="e.g. 30"
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
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Price (₱)
              </label>
              <Input
                name="service_price"
                type="number"
                min={0}
                step="0.01"
                value={form.service_price}
                onChange={handleChange}
                placeholder="Leave blank if priced at the clinic"
                className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Leave blank for a sub-service priced per case (e.g. surgery) —
                staff enter the amount when the client pays.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                Who can perform this service
              </label>
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((role) => {
                  const isSelected = selectedRoles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {role}
                    </button>
                  );
                })}
              </div>
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
                  : "Add Sub-service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
