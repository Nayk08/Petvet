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
  fetchInventoryById,
  addProduct,
  updateProduct,
} from "@/api/http";

export function Component() {
  const submit = useSubmit();
  const navigate = useNavigate();
  const { state } = useNavigation();
  const params = useParams();
  const isEditMode = Boolean(params.product_id);
  const actionData = useActionData();
  const isActionError = Boolean(actionData?.error);
  const actionError = actionData?.error;

  // Track image preview state for a better UX
  const [imagePreview, setImagePreview] = useState(null);

  function closeModal() {
    navigate("..");
  }

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["product", params.product_id],
    queryFn: ({ signal }) =>
      fetchInventoryById({ product_id: params.product_id, signal }),
    staleTime: 5000,
    enabled: isEditMode,
  });

  // Set initial image preview if editing
  useEffect(() => {
    if (data?.product_image) {
      setImagePreview(data.product_image);
    }
  }, [data]);

  // const {
  //   mutate,
  //   isPending: actionPending,
  //   isError: isActionError,
  //   error: actionError,
  // } = useMutation({
  //   mutationFn: (formData) => {
  //     isEditMode
  //       ? updateProduct(params.product_id, formData)
  //       : addProduct(formData);
  //   },
  //   onMutate: (data) => {
  //     queryClient.setQueryData(["product", params.product_id]);
  //   },
  // });

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
      <DialogContent className="bg-slate-950 border border-slate-900 text-slate-100 sm:max-w-md shadow-2xl rounded-xl overflow-hidden p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold tracking-tight text-slate-50">
            {isEditMode ? "Edit Product" : "Add New Product"}
          </DialogTitle>
          <p className="text-xs text-slate-400 mt-0.5">
            {isEditMode
              ? "Update your product details and specifications."
              : "Fill in the details below to add an item to your inventory."}
          </p>
        </DialogHeader>

        {isPending && isEditMode ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading product data...</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            encType="multipart/form-data"
            className="space-y-5"
          >
            {/* Image Upload Area */}
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-400">
                Product Image
              </label>
              <div className="flex items-center gap-4 p-3 rounded-lg border border-dashed border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 transition-colors relative group">
                <div className="w-16 h-16 shrink-0 bg-slate-900 border border-slate-800 rounded-md overflow-hidden flex items-center justify-center">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg
                      className="w-6 h-6 text-slate-600"
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
                  <span className="text-xs font-medium text-slate-300 group-hover:text-indigo-400 transition-colors">
                    {imagePreview
                      ? "Change image file"
                      : "Upload product image"}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    PNG, JPG or WEBP up to 5MB
                  </span>
                </div>
                <input
                  name="product_image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Product Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-400">
                Product Name
              </label>
              <Input
                name="product_name"
                placeholder="e.g. Whiskas Cat Food 1kg"
                autoComplete="off"
                required
                defaultValue={data?.product_name}
                className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 h-10 rounded-lg"
              />
            </div>

            {/* Split Row for Quantity & Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-slate-400">
                  Quantity
                </label>
                <Input
                  name="product_quantity"
                  type="number"
                  min="0"
                  required
                  placeholder="0"
                  defaultValue={data?.product_quantity}
                  className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500 h-10 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-slate-400">
                  Price ($)
                </label>
                <Input
                  name="product_price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  defaultValue={data?.product_price}
                  className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500 h-10 rounded-lg"
                />
              </div>
            </div>

            {/* Expiry Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-400">
                Expiry Date
              </label>
              <Input
                name="product_expiry_date"
                type="date"
                defaultValue={
                  data?.product_expiry_date
                    ? data.product_expiry_date.split("T")[0]
                    : ""
                }
                className="bg-slate-900 border-slate-800 text-slate-100 focus-visible:ring-indigo-500 h-10 rounded-lg [color-scheme:dark]"
              />
            </div>

            {/* Error Message Section */}
            {isActionError && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xs leading-relaxed">
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
                    Failed to save product
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
                  className="text-slate-400 hover:text-slate-200 hover:bg-slate-900 h-10 rounded-lg"
                >
                  Cancel
                </Button>
              )}

              <Button
                type="submit"
                disabled={state === "submitting"}
                className="bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-slate-900 disabled:text-slate-500 font-medium h-10 px-5 rounded-lg transition-colors duration-150 shadow-lg shadow-indigo-600/10"
              >
                {state === "submitting" ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </div>
                ) : isEditMode ? (
                  "Save changes"
                ) : (
                  "Create product"
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
  if (!params.product_id) return null;
  return queryClient.fetchQuery({
    queryKey: ["product", params.product_id],
    queryFn: ({ signal }) =>
      fetchInventoryById({ product_id: params.product_id, signal }),
  });
}

export async function action({ request, params }) {
  const formData = await request.formData();
  const isEditMode = Boolean(params.product_id);

  try {
    if (isEditMode) {
      await updateProduct(params.product_id, formData);
    } else {
      await addProduct(formData);
    }
  } catch (error) {
    const errorMessage = error.message || "Failed to save product.";

    toast.error("Failed to save product", {
      className:
        "bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg",
      description: errorMessage,
      descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
      duration: 2000,
      icon: <XCircle className="h-5 w-5 text-destructive" />,
    });

    return { error: errorMessage };
  }

  await queryClient.invalidateQueries({ queryKey: ["inventory"] });

  if (isEditMode) {
    await queryClient.invalidateQueries({
      queryKey: ["product", params.product_id],
    });
  }

  toast.success(isEditMode ? "Product updated" : "Product added", {
    className:
      "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 flex items-center gap-3 p-4 rounded-lg shadow-lg",
    description: `"${formData.get("product_name")}" was ${isEditMode ? "updated" : "added"} successfully.`,
    descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
    duration: 2000,
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  });

  return redirect("../");
}
