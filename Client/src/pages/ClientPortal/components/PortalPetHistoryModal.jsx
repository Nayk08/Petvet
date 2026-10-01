import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { fetchMyPetHistory } from "@/api/clientPortal.js";
import PetHistoryList from "@/components/ui/PetHistoryList.jsx";

export default function PortalPetHistoryModal({ petId, petName, onClose }) {
  const { data: history, isPending, isError, error } = useQuery({
    queryKey: ["clientPortal", "pet-history", petId],
    queryFn: ({ signal }) => fetchMyPetHistory(petId, { signal }),
    enabled: Boolean(petId),
  });

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History size={18} className="text-indigo-600 dark:text-indigo-400" />
            {petName ?? "Pet"}'s History
          </DialogTitle>
          <DialogDescription>
            Past appointments on file for this pet.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {isPending ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
              Loading...
            </p>
          ) : isError ? (
            <p className="text-sm text-rose-500 dark:text-rose-400 py-6 text-center">
              {error?.message ?? "Failed to load history"}
            </p>
          ) : (
            <PetHistoryList history={history} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
