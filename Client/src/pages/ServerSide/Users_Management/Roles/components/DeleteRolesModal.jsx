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
      <DialogContent className="bg-slate-950 border border-slate-800 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-100">
            Delete Role
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">
            Are you sure you want to delete{" "}
            <span className="font-medium text-slate-200">
              {data?.user_level}
            </span>
            ? You can restore this later if needed.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-2">
          <Button type="button" variant="ghost" onClick={closeModal}>
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
        "bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg",
      description: "This role is successfully deleted!",
      descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
      duration: 2000,
      icon: <Trash2 className="h-5 w-5 text-destructive" />,
    });

    return redirect("..");
  } catch (err) {
    toast.error("Delete failed", {
      className:
        "bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg",
      description:
        err.message || "Something went wrong while deleting this role.",
      descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
      duration: 3000,
      icon: <XCircle className="h-5 w-5 text-destructive" />,
    });

    return redirect("..");
  }
}
