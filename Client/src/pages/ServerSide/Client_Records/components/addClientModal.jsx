import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
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
import {
  queryClient,
  fetchClientById,
  addClient,
  editClient,
} from "@/api/http";

export function Component() {
  const submit = useSubmit();
  const navigate = useNavigate();
  const { state } = useNavigation();
  const params = useParams();
  const isEditMode = Boolean(params.client_id);
  const actionData = useActionData();
  const isActionError = Boolean(actionData?.error);
  const actionError = actionData?.error;

  // Track image preview state for a better UX
  const [imagePreview, setImagePreview] = useState(null);

  function closeModal() {
    navigate(`..${location.search}`);
  }

  const { data, isPending } = useQuery({
    queryKey: ["client", params.client_id],
    queryFn: ({ signal }) =>
      fetchClientById({ client_id: params.client_id, signal }),
    staleTime: 5000,
    enabled: isEditMode,
  });

  // Set initial image preview if editing
  useEffect(() => {
    if (data?.client_image) {
      setImagePreview(data.client_image);
    }
  }, [data]);

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

  function handleSubmit(event) {
    event.preventDefault();
    submit(event.currentTarget, {
      method: isEditMode ? "PUT" : "POST",
      encType: "multipart/form-data",
    });
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-md shadow-xl rounded-xl overflow-hidden p-6 transition-colors">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
            {isEditMode ? "Edit Client" : "Add New Client"}
          </DialogTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isEditMode
              ? "Update this client's details and contact info."
              : "Fill in the details below to add a new client."}
          </p>
        </DialogHeader>

        {isPending && isEditMode ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Loading client data...
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            encType="multipart/form-data"
            className="space-y-5"
          >
            {/* Image Upload Area */}
            {/* <div className="space-y-2">
              <label
                htmlFor="client_image"
                className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400"
              >
                Client Photo
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
                    <svg
                      className="w-6 h-6 text-slate-400 dark:text-slate-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 002-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {imagePreview ? "Change photo" : "Upload client photo"}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    PNG, JPG or WEBP up to 5MB
                  </span>
                </div>
                <input
                  id="client_image"
                  name="client_image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div> */}

            {/* Client Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="client_name"
                className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400"
              >
                Client Name
              </label>
              <Input
                id="client_name"
                name="client_name"
                placeholder="e.g. Jeff Galicia"
                autoComplete="off"
                required
                defaultValue={data?.name}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 h-10 rounded-lg"
              />
            </div>

            {/* Contact Number */}
            <div className="space-y-1.5">
              <label
                htmlFor="contact_no"
                className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400"
              >
                Contact Number
              </label>
              <Input
                id="contact_no"
                name="contact_no"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                placeholder="09171234567"
                defaultValue={data?.mobile_no}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 h-10 rounded-lg"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="client_email"
                className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400"
              >
                Email
              </label>
              <Input
                id="client_email"
                name="client_email"
                type="email"
                placeholder="LebronJames23@gmail.com"
                required
                defaultValue={data?.email}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 h-10 rounded-lg"
              />
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <label
                htmlFor="address"
                className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400"
              >
                Address
              </label>
              <Input
                id="address"
                name="address"
                placeholder="House/Street, Barangay, City"
                autoComplete="off"
                defaultValue={data?.address}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 h-10 rounded-lg"
              />
            </div>

            {/* Emergency Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="emergency_contact_name"
                  className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400"
                >
                  Emergency Contact Name
                </label>
                <Input
                  id="emergency_contact_name"
                  name="emergency_contact_name"
                  placeholder="Optional"
                  autoComplete="off"
                  defaultValue={data?.emergency_contact_name}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 h-10 rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="emergency_contact_number"
                  className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400"
                >
                  Emergency Contact No.
                </label>
                <Input
                  id="emergency_contact_number"
                  name="emergency_contact_number"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="09171234567"
                  defaultValue={data?.emergency_contact_number}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 h-10 rounded-lg"
                />
              </div>
            </div>

            {/* Error Message Section */}
            {isActionError && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg border border-red-500/20 dark:border-red-500/30 bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-xs leading-relaxed">
                <svg
                  className="w-4 h-4 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1">
                  <span className="font-semibold block mb-0.5">
                    Failed to save client
                  </span>
                  <span className="opacity-90">
                    {actionError || "An unexpected network error occurred."}
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
                  className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 h-10 rounded-lg"
                >
                  Cancel
                </Button>
              )}

              <Button
                type="submit"
                disabled={state === "submitting"}
                className="bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 font-medium h-10 px-5 rounded-lg transition-colors duration-150 shadow-sm"
              >
                {state === "submitting" ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </div>
                ) : isEditMode ? (
                  "Save changes"
                ) : (
                  "Create client"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function loader({ params }) {
  if (!params.client_id) return null;
  return queryClient.fetchQuery({
    queryKey: ["client", params.client_id],
    queryFn: ({ signal }) =>
      fetchClientById({ client_id: params.client_id, signal }),
  });
}

export async function action({ request, params }) {
  const formData = await request.formData();
  const isEditMode = Boolean(params.client_id);

  try {
    if (isEditMode) {
      await editClient(params.client_id, formData);
    } else {
      await addClient(formData);
    }
  } catch (error) {
    const errorMessage = error.message || "Failed to save client.";

    toast.error("Failed to save client", {
      className:
        "bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg",
      description: errorMessage,
      descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
      duration: 2000,
      icon: <XCircle className="h-5 w-5 text-destructive" />,
    });

    return { error: errorMessage };
  }

  await queryClient.invalidateQueries({ queryKey: ["clients"] });

  if (isEditMode) {
    await queryClient.invalidateQueries({
      queryKey: ["client", params.client_id],
    });
  }

  const url = new URL(request.url);

  toast.success(isEditMode ? "Client updated" : "Client added", {
    className:
      "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 flex items-center gap-3 p-4 rounded-lg shadow-lg",
    description: `"${formData.get("client_name")}" was ${isEditMode ? "updated" : "added"} successfully.`,
    descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
    duration: 2000,
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  });

  return redirect(`../${url.search}`);
}
