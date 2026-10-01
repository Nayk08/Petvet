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
export default function ServiceModal({ service, onClose }) {
  const isEditMode = Boolean(service);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    appointment_services: service?.appointment_services ?? "",
    category: service?.category ?? "",
    description: service?.description ?? "",
    service_price: service?.service_price ?? "",
    min_price: service?.min_price ?? "",
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
      toast.success(isEditMode ? "Service updated" : "Service added");
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
      category: form.category.trim(),
      description: form.description.trim(),
      service_price: form.service_price,
      min_price: form.min_price,
      duration_minutes: form.duration_minutes || undefined,
      allowed_roles: selectedRoles,
    });
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-md shadow-2xl transition-colors">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-950 dark:text-slate-100">
              {isEditMode ? "Edit Service" : "Add Service"}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
              Service details shown to staff and clients when booking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Service Name
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
                <Input
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  placeholder="e.g. Medical, Grooming"
                  maxLength={50}
                  className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Duration (minutes)
                </label>
                <Input
                  name="duration_minutes"
                  type="number"
                  min={1}
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Fixed Price (₱)
                </label>
                <Input
                  name="service_price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.service_price}
                  onChange={handleChange}
                  placeholder="Leave blank if variable"
                  className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Minimum Price (₱)
                </label>
                <Input
                  name="min_price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.min_price}
                  onChange={handleChange}
                  placeholder="Floor for a variable price"
                  className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-1">
              Leave Fixed Price blank for a service priced per case at
              booking (e.g. surgery) — Minimum Price then sets the lowest
              amount staff can charge for it.
            </p>

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
                  : "Add Service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
