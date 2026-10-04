import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Plus, History } from "lucide-react";
import DynamicGrid from "@/components/ui/DynamicGrid";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            My Pets
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            On file with the clinic. Contact us to update existing details.
          </p>
        </div>
        <Button
          onClick={() => setShowAddPet(true)}
          className="flex items-center justify-center gap-1.5 w-full sm:w-auto"
        >
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
          {/* Phones: one card per pet instead of a sideways-scrolling table. */}
          <div className="sm:hidden space-y-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pets..."
              className="h-10 bg-white dark:bg-slate-900"
            />
            {(data?.rows ?? []).length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic text-center py-6">
                No pets found.
              </p>
            ) : (
              (data?.rows ?? []).map((pet) => (
                <div
                  key={pet.pet_id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
                >
                  {pet.pet_image ? (
                    <img
                      src={pet.pet_image}
                      alt={pet.pet_name}
                      className="h-14 w-14 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 shrink-0">
                      No photo
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {pet.pet_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {[pet.species_name, pet.breed, pet.gender_name].filter(Boolean).join(" · ")}
                    </p>
                    {pet.weight_kg != null && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {pet.weight_kg} kg
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPet({ id: pet.pet_id, name: pet.pet_name })}
                    className="shrink-0 gap-1"
                  >
                    <History size={14} />
                    History
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="hidden sm:block">
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
            subtitle="Your pets on file with the clinic."
          />
          </div>
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
