import {
  useNavigate,
  useSubmit,
  useNavigation,
  redirect,
} from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

import { addNewUserLevel, queryClient } from "@/api/http";
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

  const closeModal = () => {
    navigate("..");
  };

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    submit(formData, { method: "POST" });
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="bg-slate-950 border border-slate-800 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-100">
            Add Role
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">
            Create a new role.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">
              Role Name
            </label>
            <Input
              name="userLevel"
              placeholder="Admin"
              className="bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">
              Description
            </label>
            <Input
              name="description"
              placeholder="Role description"
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
              {state === "submitting" ? "submitting...." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export async function action({ request }) {
  const formData = await request.formData();
  const { userLevel, description } = Object.fromEntries(formData);

  try {
    await addNewUserLevel(userLevel, description);
    await queryClient.invalidateQueries(["usersLeveldata"]);

    toast.success("Role added", {
      className:
        "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 flex items-center gap-3 p-4 rounded-lg shadow-lg",
      description: `"${userLevel}" was added successfully.`,
      descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
      duration: 2000,
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    });

    return redirect("..");
  } catch (error) {
    toast.error("Add failed", {
      className:
        "bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg",
      description:
        error.message || "Something went wrong while adding this role.",
      descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
      duration: 3000,
      icon: <XCircle className="h-5 w-5 text-destructive" />,
    });

    // stay on the modal instead of redirecting on failure,
    // so the user can retry without re-navigating
    return null;
  }
}
