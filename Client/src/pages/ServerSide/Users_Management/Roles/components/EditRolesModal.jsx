import {
  useNavigate,
  useSubmit,
  useNavigation,
  useLoaderData,
  redirect,
} from "react-router-dom";
import {
  updateUserLevel,
  queryClient,
  fetchUserLevelById,
} from "../../../../../api/http.js";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Component() {
  const { state } = useNavigation();
  const navigate = useNavigate();
  const submit = useSubmit();
  const data = useLoaderData();

  const closeModal = () => {
    navigate("..");
  };

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    submit(formData, { method: "PUT" });
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="bg-slate-950 border border-slate-800 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-100">
            Edit Role
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">
            Update this role's details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">
              Role Name
            </label>
            <Input
              name="userLevel"
              defaultValue={data?.user_level}
              className="bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">
              Description
            </label>
            <Input
              name="description"
              defaultValue={data?.description}
              className="bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-indigo-500"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="neon"
              disabled={state === "submitting"}
            >
              {state === "submitting" ? "saving...." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
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

export async function action({ request, params }) {
  const formData = await request.formData();
  const { userLevel, description } = Object.fromEntries(formData);

  try {
    await updateUserLevel({ id: params.user_level_id, userLevel, description });
    await queryClient.invalidateQueries(["usersLeveldata"]);

    toast.success("Role updated", {
      className:
        "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 flex items-center gap-3 p-4 rounded-lg shadow-lg",
      description: `"${userLevel}" was updated successfully.`,
      descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
      duration: 2000,
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    });

    return redirect("..");
  } catch (err) {
    toast.error("Update failed", {
      className:
        "bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg",
      description:
        err.message || "Something went wrong while updating this role.",
      descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
      duration: 3000,
      icon: <XCircle className="h-5 w-5 text-destructive" />,
    });

    // stay on the modal instead of redirecting on failure,
    // so the user can retry without re-navigating
    return null;
  }
}
