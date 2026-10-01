import { useState } from "react";
import {
  useNavigate,
  useParams,
  useSubmit,
  useNavigation,
  useActionData,
  redirect,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRightLeft, CheckCircle2, XCircle } from "lucide-react";

import {
  queryClient,
  fetchPetById,
  fetchClientRecords,
  transferPetOwner,
} from "@/api/http.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function Component() {
  const { state } = useNavigation();
  const navigate = useNavigate();
  const submit = useSubmit();
  const params = useParams();
  const actionData = useActionData();
  const [selectedClientId, setSelectedClientId] = useState("");

  // Fetched directly (not via the route loader) — this route's loader slot
  // is already taken by requirePermission in App.jsx (see add-pet/edit-pet
  // routes for the same pattern), so useLoaderData() here would return the
  // permission check's user object instead of the pet.
  const { data: pet } = useQuery({
    queryKey: ["pet", params.pets_id],
    queryFn: ({ signal }) => fetchPetById(params.pets_id, { signal }),
  });

  const { data: clients } = useQuery({
    queryKey: ["clients-all"],
    queryFn: ({ signal }) =>
      fetchClientRecords({ limit: "all", signal }).then((r) => r.rows ?? []),
  });

  const otherClients = (clients ?? []).filter(
    (c) => String(c.client_id) !== String(pet?.client_id),
  );

  const closeModal = () => navigate(`..${location.search}`);

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("new_client_id", selectedClientId);
    submit(formData, { method: "PUT" });
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-md shadow-xl transition-colors">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-950 dark:text-slate-50">
            Transfer Pet Ownership
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
            Move{" "}
            <span className="font-medium text-slate-900 dark:text-slate-200">
              {pet?.pets_name}
            </span>{" "}
            to a different client. This updates all future records to the new
            owner — past appointment and payment history stays unchanged.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              New Owner
            </label>
            <select
              required
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-2"
            >
              <option value="">Select a client</option>
              {otherClients.map((c) => (
                <option key={c.client_id} value={c.client_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {actionData?.error && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs leading-relaxed">
              <span className="flex-1">{actionData.error}</span>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={closeModal}
              className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={state === "submitting" || !selectedClientId}
              className="flex items-center gap-1.5"
            >
              <ArrowRightLeft size={14} />
              {state === "submitting" ? "Transferring..." : "Transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export async function action({ request, params }) {
  const formData = await request.formData();
  const new_client_id = formData.get("new_client_id");

  try {
    await transferPetOwner(params.pets_id, new_client_id);
  } catch (error) {
    const errorMessage = error.message || "Failed to transfer pet ownership.";
    toast.error("Transfer failed", {
      className:
        "bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg",
      description: errorMessage,
      descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
      duration: 2500,
      icon: <XCircle className="h-5 w-5 text-destructive" />,
    });
    return { error: errorMessage };
  }

  await queryClient.invalidateQueries({ queryKey: ["pet-records"] });
  await queryClient.invalidateQueries({ queryKey: ["pet", params.pets_id] });

  toast.success("Ownership transferred", {
    className:
      "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 flex items-center gap-3 p-4 rounded-lg shadow-lg",
    description: "This pet now belongs to the selected client.",
    descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
    duration: 2000,
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  });

  return redirect("..");
}
