import {
  useNavigate,
  useParams,
  useLoaderData,
  useSubmit,
  useNavigation,
  useActionData,
} from "react-router-dom";
import { useEffect } from "react";
import { toast } from "sonner";
import { XCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  fetchUserById,
  deleteUser,
  queryClient,
} from "../../../../../api/http.js";

// ---- Loader ----

export function Component() {
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData();
  const { user_id } = useParams();
  const user = useLoaderData();
  const isDeleting = navigation.state === "submitting";

  const closeModal = () => {
    navigate("..");
  };

  useEffect(() => {
    if (!actionData) return;

    if (actionData.ok) {
      toast.success("User deleted", {
        className:
          "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-3 p-4 rounded-lg shadow-lg backdrop-blur-sm",
        description: `"${user?.user_name ?? `User #${user_id}`}" has been removed.`,
        descriptionClassName:
          "text-slate-500 dark:text-slate-400 text-sm font-normal mt-1",
        duration: 3000,
        icon: (
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        ),
      });
      closeModal();
    } else {
      toast.error("Error", {
        className:
          "bg-destructive/10 dark:bg-destructive/20 border border-destructive/30 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg backdrop-blur-sm",
        description:
          actionData.error || "Something went wrong while deleting this user.",
        descriptionClassName:
          "text-slate-500 dark:text-slate-400 text-sm font-normal mt-1",
        duration: 3000,
        icon: <XCircle className="h-5 w-5 text-destructive shrink-0" />,
      });
    }
  }, [actionData]);

  const handleDelete = () => {
    submit(null, { method: "PUT" });
  };

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-sm shadow-2xl transition-colors">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-950 dark:text-slate-100">
            Delete user
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
            This will permanently delete{" "}
            <span className="text-slate-900 dark:text-slate-200 font-semibold">
              {user?.user_name ?? `user #${user_id}`}
            </span>
            . This action can't be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={closeModal}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600/90 dark:hover:bg-red-600 transition-colors"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export async function deleteUserLoader({ params, request }) {
  return fetchUserById(params.user_id, { signal: request.signal });
}

// ---- Action ----
export async function deleteUserAction({ params }) {
  try {
    await deleteUser(params.user_id);
    await queryClient.invalidateQueries({ queryKey: ["usersdata"] });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
