import {
  useNavigate,
  useSubmit,
  useNavigation,
  useParams,
  redirect,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
  const { user_level_id } = useParams();

  // Fetches client-side instead of relying on the route loader, since the
  // router's static requirePermission loader on this route overrides any
  // loader exported from this module (see App.jsx route config).
  const { data, isLoading, isError } = useQuery({
    queryKey: ["userLevel", user_level_id],
    queryFn: ({ signal }) => fetchUserLevelById(user_level_id, { signal }),
    enabled: !!user_level_id,
  });

  const closeModal = () => {
    navigate(`..${location.search}`);
  };

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    submit(formData, { method: "PUT" });
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-md shadow-2xl transition-colors">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-950 dark:text-slate-100">
            Edit Role
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
            Update this role's details.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center font-medium">
            Loading role...
          </p>
        ) : isError ? (
          <p className="text-sm text-destructive dark:text-red-400 py-6 text-center font-medium">
            Failed to load this role. Please try again.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Role Name
              </label>
              <Input
                name="userLevel"
                defaultValue={data?.user_level}
                className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Description
              </label>
              <Input
                name="description"
                defaultValue={data?.description}
                className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-cyan-500"
              />
            </div>

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
                type="submit"
                variant="neon"
                disabled={state === "submitting"}
                className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-medium transition-colors"
              >
                {state === "submitting" ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export async function action({ request, params }) {
  const formData = await request.formData();
  const { userLevel, description } = Object.fromEntries(formData);

  try {
    await updateUserLevel({ id: params.user_level_id, userLevel, description });
    await queryClient.invalidateQueries(["usersLeveldata"]);
    await queryClient.invalidateQueries(["userLevel", params.user_level_id]);

    toast.success("Role updated", {
      className:
        "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-3 p-4 rounded-lg shadow-lg backdrop-blur-sm",
      description: `"${userLevel}" was updated successfully.`,
      descriptionClassName:
        "text-slate-500 dark:text-slate-400 text-sm font-normal mt-1",
      duration: 2000,
      icon: (
        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      ),
    });

    return redirect("..");
  } catch (err) {
    toast.error("Update failed", {
      className:
        "bg-destructive/10 dark:bg-destructive/20 border border-destructive/30 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg backdrop-blur-sm",
      description:
        err.message || "Something went wrong while updating this role.",
      descriptionClassName:
        "text-slate-500 dark:text-slate-400 text-sm font-normal mt-1",
      duration: 3000,
      icon: <XCircle className="h-5 w-5 text-destructive shrink-0" />,
    });

    // stay on the modal instead of redirecting on failure,
    // so the user can retry without re-navigating
    return null;
  }
}
