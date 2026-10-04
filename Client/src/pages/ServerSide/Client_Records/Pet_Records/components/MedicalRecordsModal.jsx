import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Stethoscope } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { fetchPetById, fetchPetMedicalRecords } from "@/api/http";
import MedicalRecordsList from "@/components/ui/MedicalRecordsList.jsx";

export function Component() {
  const navigate = useNavigate();
  const params = useParams();

  const { data: pet } = useQuery({
    queryKey: ["pet", params.pets_id],
    queryFn: ({ signal }) => fetchPetById(params.pets_id, { signal }),
  });

  const { data: records, isPending, isError, error } = useQuery({
    queryKey: ["pet-medical-records", params.pets_id],
    queryFn: ({ signal }) => fetchPetMedicalRecords(params.pets_id, { signal }),
  });

  const closeModal = () => navigate(`..${location.search}`);

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-xl shadow-xl transition-colors">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-950 dark:text-slate-50 flex items-center gap-2">
            <Stethoscope size={18} className="text-indigo-600 dark:text-indigo-400" />
            {pet?.pets_name ?? "Pet"}'s Medical Records
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
            Consultations, vaccinations, and prescriptions on file.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto pr-1">
          {isPending ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
              Loading...
            </p>
          ) : isError ? (
            <p role="alert" className="text-sm text-rose-500 dark:text-rose-400 py-6 text-center">
              {error?.message ?? "Failed to load medical records"}
            </p>
          ) : (
            <MedicalRecordsList records={records} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
