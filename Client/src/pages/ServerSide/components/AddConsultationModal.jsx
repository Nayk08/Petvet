import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Plus, Trash2, Syringe, Pill } from "lucide-react";
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
import { addConsultation } from "@/api/http";

const LABEL =
  "text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400";
const TEXTAREA =
  "w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500";

function updateRow(setRows, index, field, value) {
  setRows((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
}

function emptyVaccination() {
  return { vaccine_name: "", batch_lot_number: "", date_administered: "", next_due_date: "" };
}

function emptyPrescription() {
  return { medication_name: "", dosage: "", frequency: "", duration: "", instructions: "" };
}

// Vet-only — the backend further restricts this to whichever vet is
// actually assigned to the appointment (or Admin), same identity scoping
// as "Mark Completed". One form covers the whole visit: exam vitals +
// diagnosis/treatment, plus any vaccines given and meds prescribed during
// the same visit, all saved together as one consultation record.
export default function AddConsultationModal({ appointment, onClose }) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [vaccinations, setVaccinations] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);

  const updateVaccination = (...args) => updateRow(setVaccinations, ...args);
  const updatePrescription = (...args) => updateRow(setPrescriptions, ...args);

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setError(null);
    setIsSubmitting(true);
    try {
      await addConsultation(appointment.appointment_id, {
        chief_complaint: formData.get("chief_complaint"),
        symptoms: formData.get("symptoms"),
        temperature_c: formData.get("temperature_c") || undefined,
        weight_kg: formData.get("weight_kg") || undefined,
        heart_rate: formData.get("heart_rate") || undefined,
        respiratory_rate: formData.get("respiratory_rate") || undefined,
        diagnosis: formData.get("diagnosis"),
        treatment: formData.get("treatment"),
        notes: formData.get("notes"),
        follow_up_date: formData.get("follow_up_date") || undefined,
        vaccinations: vaccinations.map((v) => ({
          ...v,
          next_due_date: v.next_due_date || undefined,
        })),
        prescriptions,
      });
      await queryClient.invalidateQueries({ queryKey: ["pet-medical-records"] });
      toast.success("Consultation record saved", {
        description: `${appointment.pets_name}'s medical record has been updated.`,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save consultation record.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-xl shadow-xl rounded-xl overflow-hidden p-6 transition-colors duration-200">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
            Add Consultation Record
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            {appointment?.pets_name} · {appointment?.client_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <label className={LABEL}>
              Chief Complaint
            </label>
            <Input name="chief_complaint" placeholder="Reason for visit" required autoComplete="off" />
          </div>

          <div className="space-y-1.5">
            <label className={LABEL}>
              Symptoms
            </label>
            <textarea
              name="symptoms"
              rows={2}
              className={TEXTAREA}
            />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className={LABEL}>
                Temp (°C)
              </label>
              <Input name="temperature_c" type="number" step="0.1" min="20" max="50" placeholder="38.5" />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL}>
                Weight (kg)
              </label>
              <Input name="weight_kg" type="number" step="0.01" min="0" placeholder="12.5" />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL}>
                Heart Rate
              </label>
              <Input name="heart_rate" type="number" min="1" placeholder="bpm" />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL}>
                Resp. Rate
              </label>
              <Input name="respiratory_rate" type="number" min="1" placeholder="br/min" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={LABEL}>
              Diagnosis
            </label>
            <textarea
              name="diagnosis"
              rows={2}
              className={TEXTAREA}
            />
          </div>

          <div className="space-y-1.5">
            <label className={LABEL}>
              Treatment
            </label>
            <textarea
              name="treatment"
              rows={2}
              className={TEXTAREA}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={LABEL}>
                Notes
              </label>
              <textarea
                name="notes"
                rows={2}
                className={TEXTAREA}
              />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL}>
                Follow-up Date
              </label>
              <Input name="follow_up_date" type="date" className="scheme-light dark:scheme-dark" />
            </div>
          </div>

          {/* Vaccinations */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Syringe size={13} /> Vaccinations Given
              </label>
              <button
                type="button"
                onClick={() => setVaccinations((v) => [...v, emptyVaccination()])}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-2 py-1 rounded-md"
              >
                <Plus size={12} /> Add
              </button>
            </div>
            {vaccinations.map((v, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 items-center">
                <Input
                  placeholder="Vaccine name"
                  required
                  aria-label="Vaccine name"
                  value={v.vaccine_name}
                  onChange={(e) => updateVaccination(i, "vaccine_name", e.target.value)}
                  className="col-span-1"
                />
                <Input
                  placeholder="Batch/Lot #"
                  value={v.batch_lot_number}
                  onChange={(e) => updateVaccination(i, "batch_lot_number", e.target.value)}
                />
                <Input
                  type="date"
                  value={v.date_administered}
                  required
                  aria-label="Date administered"
                  onChange={(e) => updateVaccination(i, "date_administered", e.target.value)}
                  className="scheme-light dark:scheme-dark"
                />
                <Input
                  type="date"
                  placeholder="Next due"
                  value={v.next_due_date}
                  aria-label="Next due date"
                  onChange={(e) => updateVaccination(i, "next_due_date", e.target.value)}
                  className="scheme-light dark:scheme-dark"
                />
                <button
                  type="button"
                  onClick={() => setVaccinations((rows) => rows.filter((_, idx) => idx !== i))}
                  aria-label="Remove vaccination"
                  className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md p-1.5 justify-self-start"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Prescriptions */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Pill size={13} /> Prescriptions
              </label>
              <button
                type="button"
                onClick={() => setPrescriptions((p) => [...p, emptyPrescription()])}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-2 py-1 rounded-md"
              >
                <Plus size={12} /> Add
              </button>
            </div>
            {prescriptions.map((p, i) => (
              <div key={i} className="space-y-1.5 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Medication name"
                    required
                    aria-label="Medication name"
                    value={p.medication_name}
                    onChange={(e) => updatePrescription(i, "medication_name", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setPrescriptions((rows) => rows.filter((_, idx) => idx !== i))}
                    aria-label="Remove prescription"
                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md p-1.5 shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Dosage"
                    value={p.dosage}
                    onChange={(e) => updatePrescription(i, "dosage", e.target.value)}
                  />
                  <Input
                    placeholder="Frequency"
                    value={p.frequency}
                    onChange={(e) => updatePrescription(i, "frequency", e.target.value)}
                  />
                  <Input
                    placeholder="Duration"
                    value={p.duration}
                    onChange={(e) => updatePrescription(i, "duration", e.target.value)}
                  />
                </div>
                <Input
                  placeholder="Instructions"
                  value={p.instructions}
                  onChange={(e) => updatePrescription(i, "instructions", e.target.value)}
                />
              </div>
            ))}
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          <DialogFooter className="pt-2 sm:space-x-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Consultation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
