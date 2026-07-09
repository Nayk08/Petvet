import {
  useNavigate,
  useParams,
  useLoaderData,
  useSubmit,
  useNavigation,
} from "react-router-dom";
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
} from "../../../../../api/http.js"; // add queryClient
// ---- Loader ----

export function Component() {
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const { user_id } = useParams();
  const user = useLoaderData();
  const isDeleting = navigation.state === "submitting";

  const closeModal = () => {
    navigate("..");
  };

  const handleDelete = () => {
    submit(null, { method: "PUT" });
    closeModal();
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
  await deleteUser(params.user_id);
  await queryClient.invalidateQueries({ queryKey: ["usersdata"] }); // add this

  return { ok: true };
}
