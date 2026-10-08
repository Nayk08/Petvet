import { patchCachedRows } from "@/api/optimistic.js";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, XCircle, PackagePlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
  queryClient,
  fetchInventoryById,
  addProductQuantity,
} from "@/api/http";

export function Component() {
  const submit = useSubmit();
  const navigate = useNavigate();
  const { state } = useNavigation();
  const params = useParams();
  const actionData = useActionData();
  const isActionError = Boolean(actionData?.error);
  const actionError = actionData?.error;
  const isSubmitting = state === "submitting";

  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  function closeModal() {
    navigate(`..${location.search}`);
  }

  const { data, isPending } = useQuery({
    queryKey: ["product", params.product_id],
    queryFn: ({ signal }) =>
      fetchInventoryById({ product_id: params.product_id, signal }),
  });

  const currentExpiry = data?.product_expiry_date
    ? data.product_expiry_date.slice(0, 10)
    : "";

  // Seed the (controlled) expiry field once the product loads, so it
  // starts pre-filled and the "changed?" check below has something real to
  // compare the user's edits against.
  useEffect(() => {
    if (data) setExpiryDate(currentExpiry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function handleSubmit(event) {
    event.preventDefault();
    submit(event.currentTarget, { method: "PATCH" });
  }

  // Expiry is this batch's identity (same rule as adding a new product) —
  // changing it, including clearing it, means the new stock is a different
  // lot, not a restock of this exact batch, so it'll land in a separate row
  // instead. Only meaningful once the form has actually been seeded from
  // the loaded product (see the useEffect above).
  const expiryChanged =
    Boolean(data) && expiryDate !== currentExpiry;

  const newTotal =
    data && quantity && !expiryChanged
      ? Number(data.product_quantity) + Number(quantity)
      : null;

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-sm shadow-xl rounded-xl overflow-hidden p-6 transition-colors duration-200">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Add Quantity
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {data?.product_name
              ? `Restock "${data.product_name}" without re-entering its details.`
              : "Restock this batch without re-entering its details."}
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <div className="w-6 h-6 border-2 border-indigo-500 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Loading product...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  This batch's quantity
                </span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {data?.product_quantity}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Quantity to Add
              </label>
              <Input
                name="quantity"
                type="number"
                min="1"
                step="1"
                required
                autoFocus
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400 h-10 rounded-lg"
              />
              {newTotal != null ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  This batch's quantity will be {newTotal}.
                </p>
              ) : (
                expiryChanged &&
                quantity && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    These {quantity} units will start a separate batch (see
                    expiry note below), not add to this one.
                  </p>
                )
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Price
              </label>
              <Input
                name="product_price"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={data?.product_price}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400 h-10 rounded-lg"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pre-filled with the current price — change it to update the
                price too, or leave it as-is.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Expiry Date
              </label>
              <Input
                name="product_expiry_date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400 h-10 rounded-lg [color-scheme:light] dark:[color-scheme:dark]"
              />
              {expiryChanged ? (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Different from the current expiry — this will go to a
                  separate batch instead of restocking this one (this
                  batch's own quantity/price won't change).
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pre-filled with the current expiry — change it to send
                  this quantity to a separate batch instead, or leave it
                  as-is to restock this one.
                </p>
              )}
            </div>

            {isActionError && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs leading-relaxed">
                <span className="flex-1">{actionError}</span>
              </div>
            )}

            <DialogFooter className="pt-2 sm:space-x-2">
              {!isSubmitting && (
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
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 font-medium h-10 px-5 rounded-lg transition-colors duration-150 shadow-sm"
              >
                {isSubmitting ? "Saving..." : "Add Quantity"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function loader({ params }) {
  return queryClient.fetchQuery({
    queryKey: ["product", params.product_id],
    queryFn: ({ signal }) =>
      fetchInventoryById({ product_id: params.product_id, signal }),
  });
}

export async function action({ request, params }) {
  const formData = await request.formData();
  const quantity = formData.get("quantity");
  const product_price = formData.get("product_price");
  const product_expiry_date = formData.get("product_expiry_date");

  // Optimistic: the stock goes up in the lists at once (a new expiry may
  // become its own batch — the refetch below settles the exact split).
  // Restored if the save fails; the form stays open to show the error.
  const add = (row) =>
    String(row?.product_id) === String(params.product_id)
      ? { ...row, product_quantity: Number(row.product_quantity) + Number(quantity) }
      : row;
  const undo = patchCachedRows([["inventory"], ["inventory-batches"]], add);

  let result;
  try {
    result = await addProductQuantity(params.product_id, {
      quantity,
      product_price,
      product_expiry_date,
    });
  } catch (error) {
    undo();
    const errorMessage = error.message || "Failed to add quantity.";

    toast.error("Failed to add quantity", {
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
  await queryClient.invalidateQueries({ queryKey: ["inventory-batches"] });
  await queryClient.invalidateQueries({
    queryKey: ["product", params.product_id],
  });

  // The affected row can differ from the batch this modal was opened on —
  // a changed expiry sends the quantity to a separate (merged-into or
  // newly-created) batch instead.
  const wentToSeparateBatch =
    String(result?.product_id) !== String(params.product_id);

  toast.success("Quantity added", {
    className:
      "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 flex items-center gap-3 p-4 rounded-lg shadow-lg",
    description: wentToSeparateBatch
      ? `Added ${quantity} units to a separate batch (different expiry).`
      : `Added ${quantity} units.`,
    descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
    duration: 2500,
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  });

  return redirect("../");
}
