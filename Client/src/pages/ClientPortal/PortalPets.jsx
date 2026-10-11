import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Plus, History, Pencil } from "lucide-react";
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

// Clients add and edit their own pets (details only — the photo and status
// stay staff-managed) and view each pet's visit history.
export function Component() {
  const [search, setSearch] = useState("");
  const { page, limit, setPage, setLimit } = usePagination({ defaultLimit: 10 });
  const debouncedSearch = useDebouncedValue(search, 400);
  const [showAddPet, setShowAddPet] = useState(false);
  const [historyPet, setHistoryPet] = useState(null);
  const [editPetId, setEditPetId] = useState(null);

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
            On file with the clinic. Tap Edit to update a pet's details.
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
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditPetId(pet.pet_id)}
                      className="gap-1 min-h-11"
                    >
                      <Pencil size={14} />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPet({ id: pet.pet_id, name: pet.pet_name })}
                      className="gap-1 min-h-11"
                    >
                      <History size={14} />
                      History
                    </Button>
                  </div>
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
                label: "Edit",
                icon: Pencil,
                className:
                  "text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40",
                onClick: (row) => setEditPetId(row.pet_id),
              },
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

      {editPetId && (
        <PortalAddPetModal petId={editPetId} onClose={() => setEditPetId(null)} />
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
