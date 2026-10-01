import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input.jsx";
import {
  addMyPet,
  fetchPortalSpecies,
  fetchPortalGender,
} from "@/api/clientPortal.js";

const TEMPERAMENT_OPTIONS = ["Calm", "Friendly", "Anxious", "Aggressive", "Fearful"];

export default function PortalAddPetModal({ onClose }) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const { data: species } = useQuery({
    queryKey: ["clientPortal", "species"],
    queryFn: ({ signal }) => fetchPortalSpecies({ signal }),
  });
  const { data: gender } = useQuery({
    queryKey: ["clientPortal", "gender"],
    queryFn: ({ signal }) => fetchPortalGender({ signal }),
  });

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setError(null);
    setIsSubmitting(true);
    try {
      await addMyPet({
        pets_name: formData.get("pets_name"),
        breed: formData.get("breed"),
        is_spayed_neutered: formData.get("is_spayed_neutered") === "true",
        date_of_birth: formData.get("date_of_birth"),
        weight_kg: formData.get("weight_kg"),
        species_id: formData.get("species_id"),
        gender_id: formData.get("gender_id"),
        allergies: formData.get("allergies"),
        medical_conditions: formData.get("medical_conditions"),
        temperament: formData.get("temperament"),
      });
      await queryClient.invalidateQueries({ queryKey: ["clientPortal", "pets"] });
      toast.success("Pet added", {
        description: "Your new pet is now on file with the clinic.",
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to add pet.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a Pet</DialogTitle>
          <DialogDescription>
            Tell us about your pet — a staff member can add a photo next time
            you visit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Pet Name
            </label>
            <Input name="pets_name" placeholder="e.g. Bella" required autoComplete="off" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Breed
            </label>
            <Input name="breed" placeholder="e.g. Golden Retriever" autoComplete="off" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Date of Birth
              </label>
              <Input name="date_of_birth" type="date" required className="[color-scheme:light] dark:[color-scheme:dark]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Weight (kg)
              </label>
              <Input name="weight_kg" type="number" step="0.01" min="0" max="999.99" placeholder="0.00" required />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_spayed_neutered"
              id="portal-is-spayed-neutered"
              value="true"
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-700"
            />
            <label
              htmlFor="portal-is-spayed-neutered"
              className="text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Spayed / Neutered
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Species
              </label>
              <select
                name="species_id"
                required
                className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-2 text-slate-900 dark:text-slate-100"
              >
                <option value="">Select</option>
                {species?.map((s) => (
                  <option key={s.species_id} value={s.species_id}>
                    {s.species}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Gender
              </label>
              <select
                name="gender_id"
                required
                className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-2 text-slate-900 dark:text-slate-100"
              >
                <option value="">Select</option>
                {gender?.map((g) => (
                  <option key={g.gender_id} value={g.gender_id}>
                    {g.gender}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Temperament
            </label>
            <select
              name="temperament"
              className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-2 text-slate-900 dark:text-slate-100"
            >
              <option value="">Not specified</option>
              {TEMPERAMENT_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Allergies
            </label>
            <textarea
              name="allergies"
              rows={2}
              placeholder="e.g. Chicken, pollen — leave blank if none known"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Medical Conditions
            </label>
            <textarea
              name="medical_conditions"
              rows={2}
              placeholder="Leave blank if none known"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Pet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
