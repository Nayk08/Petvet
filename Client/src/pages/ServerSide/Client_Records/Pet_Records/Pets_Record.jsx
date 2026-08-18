import DynamicGrid from "@/components/ui/DynamicGrid";
import { useQuery } from "@tanstack/react-query";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { fetchPetRecordsByClientId } from "@/api/http";
import { PetRecordsColumns } from "@/utils/COLUMNS";
import { ArrowLeft, User, PawPrint } from "lucide-react";

export function Component() {
  const { client_id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["pet-records", client_id],
    queryFn: ({ signal }) => fetchPetRecordsByClientId(client_id, { signal }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-2)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <User className="w-3.5 h-3.5" /> Client Profile
            </div>
            {isLoading ? (
              <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mt-1" />
            ) : (
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                {data?.client_name ?? "Unknown Client"}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/60">
                  <PawPrint className="w-3 h-3" />
                  {data?.pets?.length ?? 0}{" "}
                  {data?.pets?.length === 1 ? "Pet" : "Pets"}
                </span>
              </h1>
            )}
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <DynamicGrid
        title="Pet Records"
        columnsConfig={PetRecordsColumns}
        data={data?.pets ?? []}
        isLoading={isLoading}
        buttonText="Add Pet"
        buttonLink="add-pet"
        onEdit={(row) => navigate(`pets/${row.pet_id}/edit-pet`)}
        onDelete={(row) => navigate(`pets/${row.pet_id}/delete-pet`)}
      />

      <Outlet />
    </div>
  );
}
