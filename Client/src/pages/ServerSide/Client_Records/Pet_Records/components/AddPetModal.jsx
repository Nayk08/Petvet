import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ImageIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import {
  redirect,
  useNavigate,
  useParams,
  useSubmit,
  useNavigation,
  useActionData,
} from "react-router-dom";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  queryClient,
  addPet,
  editPet,
  fetchPetById,
  selectSpecies,
  selectGender,
  selectPetStatus,
} from "@/api/http";

export function Component() {
  const submit = useSubmit();
  const navigate = useNavigate();
  const { state } = useNavigation();
  const params = useParams(); // expects :client_id, and :pets_id in edit mode
  const isEditMode = Boolean(params.pets_id);
  const actionData = useActionData();
  const isActionError = Boolean(actionData?.error);
  const actionError = actionData?.error;

  const [imagePreview, setImagePreview] = useState(null);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }

  const { data: gender } = useQuery({
    queryKey: ["gender"],
    queryFn: ({ signal }) => selectGender({ signal }),
  });
  const { data: species } = useQuery({
    queryKey: ["species"],
    queryFn: ({ signal }) => selectSpecies({ signal }),
  });
  const { data: status } = useQuery({
    queryKey: ["pet-status"],
    queryFn: ({ signal }) => selectPetStatus({ signal }),
  });
  const { data: petData, isPending: isPetPending } = useQuery({
    queryKey: ["pet", params.pets_id],
    queryFn: ({ signal }) => fetchPetById(params.pets_id, { signal }),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (petData?.pet_image) {
      setImagePreview(petData.pet_image);
    }
  }, [petData]);

  function closeModal() {
    navigate(`..${location.search}`);
  }

  function handleSubmit(event) {
    event.preventDefault();
    submit(event.currentTarget, {
      method: isEditMode ? "PUT" : "POST",
      encType: "multipart/form-data",
    });
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-md shadow-xl rounded-xl overflow-hidden p-6 transition-colors duration-200">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
            {isEditMode ? "Edit Pet" : "Add New Pet"}
          </DialogTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isEditMode
              ? "Update this pet's details."
              : "Fill in the details below to add a pet to this client's record."}
          </p>
        </DialogHeader>

        {isEditMode && isPetPending ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="w-6 h-6 border-2 border-indigo-500 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Loading pet data...
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            encType="multipart/form-data"
            className="space-y-5"
          >
            {/* Image Upload Area */}
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Pet Image
              </label>
              <div className="flex items-center gap-4 p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative group">
                <div className="w-16 h-16 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden flex items-center justify-center">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                  )}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {imagePreview ? "Change image file" : "Upload pet image"}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    PNG, JPG or WEBP up to 5MB
                  </span>
                </div>
                <input
                  name="pet_image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Pet Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Pet Name
              </label>
              <Input
                name="pets_name"
                placeholder="e.g. Bella"
                autoComplete="off"
                required
                defaultValue={petData?.pets_name}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400 focus-visible:border-indigo-500 dark:focus-visible:border-indigo-400 h-10 rounded-lg"
              />
            </div>

            {/* Breed */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Breed
              </label>
              <Input
                name="breed"
                placeholder="e.g. Golden Retriever"
                autoComplete="off"
                defaultValue={petData?.breed}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400 h-10 rounded-lg"
              />
            </div>

            {/* Split Row: Date of Birth & Weight */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Date of Birth
                </label>
                <Input
                  name="date_of_birth"
                  type="date"
                  required
                  defaultValue={
                    petData?.date_of_birth
                      ? petData.date_of_birth.split("T")[0]
                      : ""
                  }
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400 h-10 rounded-lg [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Weight (kg)
                </label>
                <Input
                  name="weight_kg"
                  type="number"
                  step="0.01"
                  min="0"
                  max="999.99"
                  required
                  placeholder="0.00"
                  defaultValue={petData?.weight_kg}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400 h-10 rounded-lg"
                />
              </div>
            </div>

            {/* Spayed / Neutered */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_spayed_neutered"
                id="is_spayed_neutered"
                value="true"
                defaultChecked={petData?.is_spayed_neutered}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700"
              />
              <label
                htmlFor="is_spayed_neutered"
                className="text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Spayed / Neutered
              </label>
            </div>

            {/* Species / Gender / Status */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Species
                </label>
                <select
                  name="species_id"
                  required
                  defaultValue={petData?.species_id ?? ""}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-2"
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
                  defaultValue={petData?.gender_id ?? ""}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-2"
                >
                  <option value="">Select</option>
                  {gender?.map((s) => (
                    <option key={s.gender_id} value={s.gender_id}>
                      {s.gender}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Status
                </label>
                <select
                  name="pet_status_id"
                  required
                  defaultValue={petData?.pet_status_id ?? ""}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-2"
                >
                  <option value="">Select</option>
                  {status?.map((s) => (
                    <option key={s.pet_status_id} value={s.pet_status_id}>
                      {s.pet_status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error Message Section */}
            {isActionError && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <div className="flex-1">
                  <span className="font-semibold block mb-0.5">
                    Failed to save pet
                  </span>
                  <span className="opacity-90">
                    {actionError?.message ||
                      "An unexpected network error occurred."}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <DialogFooter className="pt-2 sm:space-x-2">
              {state !== "submitting" && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeModal}
                  className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 h-10 rounded-lg"
                >
                  Cancel
                </Button>
              )}

              <Button
                type="submit"
                disabled={state === "submitting"}
                className="bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 font-medium h-10 px-5 rounded-lg transition-colors duration-150 shadow-sm"
              >
                {state === "submitting" ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </div>
                ) : isEditMode ? (
                  "Save changes"
                ) : (
                  "Create pet"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export async function action({ request, params }) {
  const formData = await request.formData();
  const client_id = params.client_id;
  const isEditMode = Boolean(params.pets_id);
  const pets_name = formData.get("pets_name");

  // Unchecked checkboxes are omitted from FormData entirely, so make sure
  // the field is always present as an explicit "true"/"false" string.
  formData.set(
    "is_spayed_neutered",
    formData.get("is_spayed_neutered") === "true" ? "true" : "false",
  );

  try {
    if (isEditMode) {
      await editPet(params.pets_id, formData);
    } else {
      await addPet(client_id, formData);
    }
  } catch (error) {
    const errorMessage = error.message || "Failed to save pet.";

    toast.error("Failed to save pet", {
      className:
        "bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg",
      description: errorMessage,
      descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
      duration: 2000,
      icon: <XCircle className="h-5 w-5 text-destructive" />,
    });

    return { error: errorMessage };
  }

  await queryClient.invalidateQueries({ queryKey: ["pet-records", client_id] });
  if (isEditMode) {
    await queryClient.invalidateQueries({ queryKey: ["pet", params.pets_id] });
  }

  toast.success(isEditMode ? "Pet updated" : "Pet added", {
    className:
      "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 flex items-center gap-3 p-4 rounded-lg shadow-lg",
    description: `"${pets_name}" was ${isEditMode ? "updated" : "added"} successfully.`,
    descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
    duration: 2000,
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  });

  return redirect("../");
}

export async function loader({ params }) {
  const queries = [
    queryClient.prefetchQuery({
      queryKey: ["species"],
      queryFn: ({ signal }) => selectSpecies({ signal }),
    }),
    queryClient.prefetchQuery({
      queryKey: ["gender"],
      queryFn: ({ signal }) => selectGender({ signal }),
    }),
    queryClient.prefetchQuery({
      queryKey: ["pet-status"],
      queryFn: ({ signal }) => selectPetStatus({ signal }),
    }),
  ];

  if (params.pets_id) {
    queries.push(
      queryClient.prefetchQuery({
        queryKey: ["pet", params.pets_id],
        queryFn: ({ signal }) => fetchPetById(params.pets_id, { signal }),
      }),
    );
  }

  await Promise.all(queries);
  return null;
}
