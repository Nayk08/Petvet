import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { fetchMyPetHistory, fetchMyPetMedicalRecords } from "@/api/clientPortal.js";
import PetHistoryList from "@/components/ui/PetHistoryList.jsx";
import MedicalRecordsList from "@/components/ui/MedicalRecordsList.jsx";
import ModuleTabs from "@/components/ui/ModuleTabs.jsx";

const TABS = [
  { value: "appointments", label: "Appointments" },
  { value: "medical", label: "Medical Records" },
];

export default function PortalPetHistoryModal({ petId, petName, onClose }) {
  const [tab, setTab] = useState("appointments");

  const historyQuery = useQuery({
    queryKey: ["clientPortal", "pet-history", petId],
    queryFn: ({ signal }) => fetchMyPetHistory(petId, { signal }),
    enabled: Boolean(petId) && tab === "appointments",
  });

  const recordsQuery = useQuery({
    queryKey: ["clientPortal", "pet-medical-records", petId],
    queryFn: ({ signal }) => fetchMyPetMedicalRecords(petId, { signal }),
    enabled: Boolean(petId) && tab === "medical",
  });

  const { data, isPending, isError, error } =
    tab === "appointments" ? historyQuery : recordsQuery;

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History size={18} className="text-indigo-600 dark:text-indigo-400" />
            {petName ?? "Pet"}'s History
          </DialogTitle>
          <DialogDescription>
            Appointments and medical records on file for this pet.
          </DialogDescription>
        </DialogHeader>

        <ModuleTabs tabs={TABS} active={tab} onChange={setTab} />

        <div className="max-h-[55vh] overflow-y-auto pr-1 pt-2">
          {isPending ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
              Loading...
            </p>
          ) : isError ? (
            <p role="alert" className="text-sm text-rose-500 dark:text-rose-400 py-6 text-center">
              {error?.message ?? "Failed to load"}
            </p>
          ) : tab === "appointments" ? (
            <PetHistoryList history={data} />
          ) : (
            <MedicalRecordsList records={data} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
