import {
  useNavigate,
  useSubmit,
  useNavigation,
  useLoaderData,
  redirect,
} from "react-router-dom";
import { toast } from "sonner";
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

// Optimistic: the row disappears and the window closes at once; the
// delete runs in the background and the row comes back if it fails.
// (The old version called invalidateQueries(["usersLeveldata"]) — the v4
// signature, which did nothing — so a deleted role stayed listed.)
export function action({ params }) {
  runOptimistic({
    keys: [["usersLeveldata"]],
    update: removeWhere("user_level_id", params.user_level_id),
    request: () => deleteUserLevel(params.user_level_id),
    onSuccess: () => toast.success("Role deleted"),
    onError: (err) =>
      toast.error("Delete failed", {
        description: err.message || "Something went wrong. The item was restored.",
      }),
  });
  return redirect("..");
}
