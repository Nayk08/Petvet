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
  deleteUserLevel,
  queryClient,
  fetchUserLevelById,
} from "../../../../../api/http.js";

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
    navigate("..");
  };

  function handleDelete() {
    submit(null, { method: "PATCH" });
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-md shadow-2xl transition-colors">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-950 dark:text-slate-100">
            Delete Role
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-200">
              {data?.user_level}
            </span>
            ? You can restore this later if needed.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={closeModal}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            No, cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={state === "submitting"}
            className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600/90 dark:hover:bg-red-600 transition-colors"
          >
            {state === "submitting" ? "Deleting..." : "Yes, delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export async function loader({ params }) {
  return queryClient.fetchQuery({
    queryKey: ["userLevel", params.user_level_id],
    queryFn: ({ signal }) =>
      fetchUserLevelById(params.user_level_id, { signal }),
  });
}

export async function action({ params }) {
  try {
    await deleteUserLevel(params.user_level_id);
    await queryClient.invalidateQueries(["usersLeveldata"]);

    toast.error("Successfully Deleted", {
      className:
        "bg-destructive/10 dark:bg-destructive/20 border border-destructive/30 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg backdrop-blur-sm",
      description: "This role is successfully deleted!",
      descriptionClassName:
        "text-slate-500 dark:text-slate-400 text-sm font-normal mt-1",
      duration: 2000,
      icon: <Trash2 className="h-5 w-5 text-destructive shrink-0" />,
    });

    return redirect("..");
  } catch (err) {
    toast.error("Delete failed", {
      className:
        "bg-destructive/10 dark:bg-destructive/20 border border-destructive/30 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg backdrop-blur-sm",
      description:
        err.message || "Something went wrong while deleting this role.",
      descriptionClassName:
        "text-slate-500 dark:text-slate-400 text-sm font-normal mt-1",
      duration: 3000,
      icon: <XCircle className="h-5 w-5 text-destructive shrink-0" />,
    });

    return redirect("..");
  }
}
