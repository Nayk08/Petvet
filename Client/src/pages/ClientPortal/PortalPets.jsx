import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Plus, History } from "lucide-react";
import DynamicGrid from "@/components/ui/DynamicGrid";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/button.jsx";
import { PetRecordsColumns } from "@/utils/COLUMNS";
import { usePagination } from "@/hooks/usePagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { fetchMyPets } from "@/api/clientPortal.js";
import PortalAddPetModal from "./components/PortalAddPetModal.jsx";
import PortalPetHistoryModal from "./components/PortalPetHistoryModal.jsx";

// Editing an existing pet (with the Cloudinary image upload the staff side
// uses) is a reasonable follow-up but was left out of this pass to ship a
// working slice rather than block on rebuilding that upload flow for a
// second, ownership-checked endpoint — adding a new pet and viewing
// history don't need it.
export function Component() {
  const [search, setSearch] = useState("");
  const { page, limit, setPage, setLimit } = usePagination({ defaultLimit: 10 });
  const debouncedSearch = useDebouncedValue(search, 400);
  const [showAddPet, setShowAddPet] = useState(false);
  const [historyPet, setHistoryPet] = useState(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, setPage]);

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["clientPortal", "pets", page, limit, debouncedSearch],
    queryFn: ({ signal }) =>
      fetchMyPets({ page, limit, search: debouncedSearch, signal }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            My Pets
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            On file with the clinic. Contact us to update existing details.
          </p>
        </div>
        <Button onClick={() => setShowAddPet(true)} className="flex items-center gap-1.5">
          <Plus size={16} />
          Add Pet
        </Button>
      </div>

      {isPending ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
      ) : isError ? (
        <p className="text-sm text-rose-500 dark:text-rose-400">
          {error?.message ?? "Failed to load pets"}
        </p>
      ) : (
        <>
          <DynamicGrid
            data={data?.rows ?? []}
            columnsConfig={PetRecordsColumns}
            title="Pets"
            limit={limit}
            search={search}
            onSearchChange={setSearch}
            onLimitChange={setLimit}
            actions={[
              {
                label: "View History",
                icon: History,
                className:
                  "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40",
                onClick: (row) =>
                  setHistoryPet({ id: row.pet_id, name: row.pet_name }),
              },
            ]}
          />
          <Pagination
            page={page}
            totalPages={limit === "all" ? 1 : (data?.pagination?.totalPages ?? 1)}
            onPageChange={setPage}
            disabled={isPending}
            total={data?.pagination?.total}
            limit={limit === "all" ? data?.pagination?.total : limit}
          />
        </>
      )}

      {showAddPet && (
        <PortalAddPetModal onClose={() => setShowAddPet(false)} />
      )}

      {historyPet && (
        <PortalPetHistoryModal
          petId={historyPet.id}
          petName={historyPet.name}
          onClose={() => setHistoryPet(null)}
        />
      )}
    </div>
  );
}
