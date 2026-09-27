import {
  useNavigate,
  useSubmit,
  useNavigation,
  useLoaderData,
  redirect,
} from "react-router-dom";
import { toast } from "sonner";
import { Trash2, XCircle } from "lucide-react";

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

export async function action({ params }) {
  try {
    const clientId = params.client_id;
    await deleteClient(clientId);
    // "clients" (plural) is the list query's key — invalidating "client"
    // (singular, this modal's own loader key) never touched the list, so
    // the just-deleted client stayed visible until the list's staleTime
    // lapsed on its own.
    await queryClient.invalidateQueries({ queryKey: ["clients"] });

    toast.error("Successfully Deleted", {
      className:
        "bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg dark:border-destructive/30",
      description: `This ${clientId} is successfully deleted!`,
      descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
      duration: 2000,
      icon: <Trash2 className="h-5 w-5 text-destructive" />,
    });

    return redirect("..");
  } catch (err) {
    toast.error("Delete failed", {
      className:
        "bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg dark:border-destructive/30",
      description:
        err.message || "Something went wrong while deleting this role.",
      descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
      duration: 3000,
      icon: <XCircle className="h-5 w-5 text-destructive" />,
    });

    return redirect("..");
  }
}
