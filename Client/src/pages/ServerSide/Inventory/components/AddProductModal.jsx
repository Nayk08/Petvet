import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  ImageIcon,
  AlertTriangle,
  Plus,
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
import {
  queryClient,
  fetchInventoryById,
  addProduct,
  updateProduct,
  fetchProductCategories,
  addProductCategory,
} from "@/api/http";

// A small inline "add a category" form, opened next to the Category select
// instead of navigating anywhere — categories are just a name, no reason to
// leave the product form to create one.
function AddCategoryInline({ onCreated, onCancel }) {
  const rqClient = useQueryClient();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleAdd(event) {
    event.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const category = await addProductCategory(name.trim());
      await rqClient.invalidateQueries({ queryKey: ["product-categories"] });
      onCreated(category);
    } catch (err) {
      setError(err.message || "Failed to add category.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleAdd} className="flex items-center gap-1.5 mt-1.5">
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New category name"
        className="h-8 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
      />
      <Button
        type="submit"
        size="sm"
        disabled={!name.trim() || isSubmitting}
        className="h-8 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
      >
        {isSubmitting ? "..." : "Add"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="h-8 px-2.5 text-xs text-slate-500 dark:text-slate-400"
      >
        Cancel
      </Button>
      {error && (
        <p className="text-[11px] text-red-500 dark:text-red-400 ml-1">
          {error}
        </p>
      )}
    </form>
  );
}

export function Component() {
  const submit = useSubmit();
  const navigate = useNavigate();
  const { state } = useNavigation();
  const params = useParams();
  const isEditMode = Boolean(params.product_id);
  const actionData = useActionData();
  const isActionError = Boolean(actionData?.error);
  const actionError = actionData?.error;

  const [imagePreview, setImagePreview] = useState(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  function closeModal() {
    navigate(`..${location.search}`);
  }

  const { data, isPending } = useQuery({
    queryKey: ["product", params.product_id],
    queryFn: ({ signal }) =>
      fetchInventoryById({ product_id: params.product_id, signal }),
    staleTime: 5000,
    enabled: isEditMode,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["product-categories"],
    queryFn: ({ signal }) => fetchProductCategories({ signal }),
  });

  useEffect(() => {
    if (data?.product_image) {
      setImagePreview(data.product_image);
    }
    if (data?.category_id) {
      setSelectedCategoryId(String(data.category_id));
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
      <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-xl rounded-xl p-6 transition-colors duration-200">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
            {isEditMode ? "Edit Product" : "Add New Product"}
          </DialogTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isEditMode
              ? "Update your product details and specifications."
              : "Fill in the details below to add an item to your inventory."}
          </p>
        </DialogHeader>

        {isPending && isEditMode ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="w-6 h-6 border-2 border-indigo-500 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Loading product data...
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
                Product Image
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
                    {imagePreview
                      ? "Change image file"
                      : "Upload product image"}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
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
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Product Name
              </label>
              <Input
                name="product_name"
                placeholder="e.g. Whiskas Cat Food 1kg"
                autoComplete="off"
                required
                defaultValue={data?.product_name}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400 focus-visible:border-indigo-500 dark:focus-visible:border-indigo-400 h-10 rounded-lg"
              />
            </div>

            {/* Product details — mainly for medicines; all optional */}
            <div className="grid grid-cols-2 gap-4">
              {[
                ["brand", "Brand", "e.g. Bravecto"],
                ["dosage", "Dosage / Strength", "e.g. 250 mg"],
              ].map(([field, label, placeholder]) => (
                <div key={field} className="space-y-1.5">
                  <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                    {label}
                  </label>
                  <Input
                    name={field}
                    placeholder={placeholder}
                    maxLength={100}
                    defaultValue={data?.[field] ?? ""}
                    className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 h-10 rounded-lg"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Unit / Form
              </label>
              <Input
                name="unit"
                placeholder="e.g. tablet, 100 ml bottle, sack"
                maxLength={50}
                defaultValue={data?.unit ?? ""}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 h-10 rounded-lg"
              />
            </div>
            {[
              ["purpose", "Purpose / What it's for", "e.g. Treats fleas and ticks for 12 weeks", 1000],
              ["description", "Description / Notes", "Directions, warnings, storage, etc.", 2000],
            ].map(([field, label, placeholder, max]) => (
              <div key={field} className="space-y-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  {label}
                </label>
                <textarea
                  name={field}
                  rows={2}
                  maxLength={max}
                  placeholder={placeholder}
                  defaultValue={data?.[field] ?? ""}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>
            ))}

            {/* Split Row for Quantity & Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Quantity
                </label>
                <Input
                  name="product_quantity"
                  type="number"
                  min="0"
                  required
                  placeholder="0"
                  defaultValue={data?.product_quantity}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400 h-10 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Price (₱)
                </label>
                <Input
                  name="product_price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  defaultValue={data?.product_price}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400 h-10 rounded-lg"
                />
              </div>
            </div>

            {/* Expiry Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Expiry Date
              </label>
              <Input
                name="product_expiry_date"
                type="date"
                // The raw value here is "YYYY-MM-DD HH:mm:ss" (space, not
                // "T" — db.js's TIMESTAMP type parser returns the column as
                // a plain string, never a Date), so .split("T")[0] just
                // returned the whole unsliced string — not valid input for
                // a date input, which silently renders that as blank.
                // Slicing the first 10 chars works for either separator.
                defaultValue={
                  data?.product_expiry_date
                    ? data.product_expiry_date.slice(0, 10)
                    : ""
                }
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400 h-10 rounded-lg [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Category
                </label>
                {!isAddingCategory && (
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(true)}
                    className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-transparent border-none cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add category
                  </button>
                )}
              </div>
              <select
                name="category_id"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full h-10 rounded-lg border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 px-3 text-sm focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400 focus:outline-none"
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
              {isAddingCategory && (
                <AddCategoryInline
                  onCancel={() => setIsAddingCategory(false)}
                  onCreated={(category) => {
                    setSelectedCategoryId(String(category.category_id));
                    setIsAddingCategory(false);
                  }}
                />
              )}
            </div>

            {/* Error Message Section */}
            {isActionError && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
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
  // Broad prefix match — covers every product's batch list, not just this
  // one, since editing can rename a batch out of (or into) any group.
  await queryClient.invalidateQueries({ queryKey: ["inventory-batches"] });

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
