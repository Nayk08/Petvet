import {
  useNavigate,
  useSubmit,
  useNavigation,
  useLoaderData,
  redirect,
} from "react-router-dom";
import { toast } from "sonner";

import {
  deleteClient,
  fetchClientById,
  queryClient,
} from "../../../../api/http.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { runOptimistic, removeWhere } from "@/api/optimistic.js";

export function Component() {
  const { state } = useNavigation();
  const navigate = useNavigate();
  const submit = useSubmit();
  const data = useLoaderData();

  const closeModal = () => {
    navigate(`..${location.search}`);
  };

  function handleDelete() {
    submit(null, { method: "PUT" });
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-md shadow-xl transition-colors">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-950 dark:text-slate-50">
            Delete Client
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
            Are you sure you want to delete{" "}
            <span className="font-medium text-slate-900 dark:text-slate-200">
              {data?.name}
            </span>
            ? You can restore this later if needed.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={closeModal}
            className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            No, cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={state === "submitting"}
          >
            {state === "submitting" ? "Deleting...." : "Yes, delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export async function loader({ params }) {
  return queryClient.fetchQuery({
    queryKey: ["client", params.client_id],
    queryFn: ({ signal }) =>
      fetchClientById({ client_id: params.client_id, signal }),
  });
}

// Optimistic: the row disappears and the window closes at once; the
// delete runs in the background and the row comes back if it fails.
export function action({ params }) {
  runOptimistic({
    keys: [["clients"]],
    update: removeWhere("client_id", params.client_id),
    request: () => deleteClient(params.client_id),
    onSuccess: () => toast.success("Client deleted"),
    onError: (err) =>
      toast.error("Delete failed", {
        description: err.message || "Something went wrong. The item was restored.",
      }),
  });
  return redirect("..");
}
