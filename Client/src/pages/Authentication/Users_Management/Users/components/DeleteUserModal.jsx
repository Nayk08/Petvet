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
          "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 flex items-center gap-3 p-4 rounded-lg shadow-lg",
        description: `"${user?.user_name ?? `User #${user_id}`}" has been removed.`,
        descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
        duration: 3000,
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
      });
      closeModal();
    } else {
      toast.error("Error", {
        className:
          "bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg",
        description:
          actionData.error || "Something went wrong while deleting this user.",
        descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
        duration: 3000,
        icon: <XCircle className="h-5 w-5 text-destructive" />,
      });
    }
  }, [actionData]);

  const handleDelete = () => {
    submit(null, { method: "PUT" });
    // Modal closing is now handled by the actionData effect above,
    // once we know whether the delete actually succeeded.
  };

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="bg-slate-950 border border-slate-800 text-slate-100 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-100">
            Delete user
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">
            This will permanently delete{" "}
            <span className="text-slate-200 font-medium">
              {user?.user_name ?? `user #${user_id}`}
            </span>
            . This action can't be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-2">
          <Button type="button" variant="ghost" onClick={closeModal}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
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
