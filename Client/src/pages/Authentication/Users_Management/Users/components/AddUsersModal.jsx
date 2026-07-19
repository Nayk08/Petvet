import {
  useNavigate,
  useParams,
  useSubmit,
  useNavigation,
  useActionData,
} from "react-router-dom";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { XCircle, CheckCircle2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";

import {
  fetchUserById,
  addNewUser,
  updateUser,
  getCategoryUserLevel,
  queryClient,
} from "../../../../../api/http.js";

import { useQuery } from "@tanstack/react-query";

export function Component() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["userLevelCategory"],
    queryFn: ({ signal }) => getCategoryUserLevel({ signal }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,
  });

  const navigate = useNavigate();

  const submit = useSubmit();

  const navigation = useNavigation();

  const actionData = useActionData();

  const { user_id } = useParams();

  const isEditMode = Boolean(user_id);

  const {
    data: loaderUser,
    isPending: isUserPending,
    isError: isUserError,
    error: userError,
  } = useQuery({
    queryKey: ["user", user_id],
    queryFn: ({ signal }) => fetchUserById(user_id, { signal }),
    enabled: isEditMode,
  });

  const isSubmitting = navigation.state === "submitting";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  // level_ids is an ORDERED array of role ids — index 0 is treated as the
  // primary role by sp_upsert_user_with_roles (it writes p_level_ids[1] into
  // tbl_users.user_level_id). Everything after that just lands in
  // tbl_user_level_assignments as additional active roles.
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);

  // formData/selectedRoleIds can't be initialized directly from loaderUser
  // anymore since it now arrives asynchronously via useQuery instead of
  // synchronously via useLoaderData. Sync them once the fetch resolves.
  useEffect(() => {
    if (!loaderUser) return;

    setFormData({
      name: loaderUser.user_name ?? "",
      email: loaderUser.user_email ?? "",
      password: "",
    });
    setSelectedRoleIds(loaderUser.level_ids ?? []);
  }, [loaderUser]);

  const closeModal = () => {
    navigate("..");
  };

  // React to the result of the last submitted action.
  // Success -> toast + close modal (parent route's query invalidation refreshes the table).
  // Failure -> toast with the backend's real error, keep modal open so the user can fix it.
  useEffect(() => {
    if (!actionData) return;
    
    if (actionData.ok) {
      toast.success(isEditMode ? "User updated" : "User added", {
        className:
          "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 flex items-center gap-3 p-4 rounded-lg shadow-lg",
        description: isEditMode
          ? "The user's details have been saved."
          : "The new user has been created.",
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
          actionData.error || "Something went wrong while saving this user.",
        descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
        duration: 3000,
        icon: <XCircle className="h-5 w-5 text-destructive" />,
      });
    }
  }, [actionData]);

  // Show a toast if fetching the user to edit fails (e.g. network error,
  // deleted user, etc.)
  useEffect(() => {
    if (!isUserError) return;

    toast.error("Error", {
      className:
        "bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg",
      description:
        userError?.message || "Something went wrong while loading this user.",
      descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
      duration: 3000,
      icon: <XCircle className="h-5 w-5 text-destructive" />,
    });
  }, [isUserError, userError]);

  // Clicking a role toggles it in/out of the selection. Newly selected roles
  // are appended to the end, so the *first* one ever picked stays primary
  // unless the user explicitly promotes another (see makePrimary below).
  const toggleRole = (roleId) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId],
    );
  };

  // Lets the user pick which selected role is primary (moves it to index 0)
  // without having to deselect/reselect everything else.
  const makePrimary = (roleId) => {
    setSelectedRoleIds((prev) => [
      roleId,
      ...prev.filter((id) => id !== roleId),
    ]);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (selectedRoleIds.length === 0) {
      // Guard against submitting with no role — this is exactly how
      // level_ids ends up empty/undefined server-side and user_level_id
      // comes back null.

      toast.error(" ", {
        className:
          "bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg",
        description: "Please select at least one role.",
        descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
        duration: 3000,
        icon: <XCircle className="h-5 w-5 text-destructive" />,
      });
      return;
    }

    const payload = {
      user_name: formData.name,
      user_email: formData.email,
      level_ids: selectedRoleIds, // matches userModel's `level_ids` destructure
      ...(formData.password ? { user_password: formData.password } : {}),
    };

    // Sends the payload to whichever action is wired to this route
    // (addUserAction or editUserAction). Closing the modal is handled
    // by the actionData effect above, once we know whether it succeeded.
    submit(payload, {
      method: isEditMode ? "put" : "post",
      encType: "application/json",
    });
  };

  // Don't render the form until we know what to prefill in edit mode —
  // avoids a flash of empty fields followed by a jump once loaderUser
  // resolves. NOTE: this early return happens after all hooks above, so
  // it's safe (Rules of Hooks: no hooks are called below this point in
  // the same render path).
  if (isEditMode && isUserPending) {
    return (
      <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
        <DialogContent className="bg-slate-950 border border-slate-800 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-100">
              Edit user
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400 py-10 text-center">
            Loading user...
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="bg-slate-950 border border-slate-800 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-100">
            {isEditMode ? "Edit user" : "Add new user"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">
              Full name
            </label>

            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Maria Santos"
              className="bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">
              Email address
            </label>

            <Input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="maria@example.com"
              className="bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">
              Password
            </label>

            <Input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={
                isEditMode
                  ? "Leave blank to keep current password"
                  : "Min. 8 characters"
              }
              className="bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">
              Assign roles (select one or more — first pick is primary)
            </label>

            <div className="grid grid-cols-3 gap-2">
              {isPending && (
                <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
                  Loading roles...
                </div>
              )}

              {isError && (
                <div className="flex items-center justify-center py-20 text-rose-400 text-sm">
                  Error: {error.message}
                </div>
              )}

              {!isPending &&
                !isError &&
                data.map((role) => {
                  const isSelected = selectedRoleIds.includes(
                    role.user_level_id,
                  );
                  const isPrimary = selectedRoleIds[0] === role.user_level_id;

                  return (
                    <button
                      key={role.user_level_id}
                      type="button"
                      onClick={() =>
                        isSelected && !isPrimary
                          ? makePrimary(role.user_level_id)
                          : toggleRole(role.user_level_id)
                      }
                      className={`relative flex items-center gap-2 rounded-md border p-5 px-2.5 py-2 text-xs transition-colors ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                      }`}
                    >
                      <span
                        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border ${
                          isSelected
                            ? "bg-white border-white"
                            : "border-slate-600"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            viewBox="0 0 10 10"
                            className="h-2.5 w-2.5 text-indigo-600"
                            fill="none"
                          >
                            <path
                              d="M1.5 5L4 7.5L8.5 2"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>

                      {role.user_level}

                      {isPrimary && (
                        <span className="absolute -top-1.5 -right-1.5 rounded-full bg-amber-400 px-1 text-[9px] font-bold text-slate-900">
                          ★
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>

            {selectedRoleIds.length > 1 && (
              <p className="text-[11px] text-slate-500">
                Click a selected role again to make it primary (★).
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>

            <Button type="submit" variant="neon" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : isEditMode
                  ? "Save changes"
                  : "Save user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export async function CategoryLoader({ request }) {
  return getCategoryUserLevel({ signal: request.signal });
}

// ---- Actions ----
// Actions only fetch data and report success/failure — they don't trigger
// UI (toasts, navigation) directly. The component reacts to the returned
// { ok, error } via useActionData().

export async function addUserAction({ request }) {
  const payload = await request.json();

  try {
    await addNewUser(payload);
    await queryClient.invalidateQueries({ queryKey: ["usersdata"] });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function editUserAction({ request, params }) {
  const payload = await request.json();

  try {
    await updateUser(params.user_id, payload);
    await queryClient.invalidateQueries({ queryKey: ["usersdata"] });
    await queryClient.invalidateQueries({ queryKey: ["user", params.user_id] });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
