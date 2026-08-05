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

  const [selectedRoleIds, setSelectedRoleIds] = useState([]);

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

  useEffect(() => {
    if (!actionData) return;

    if (actionData.ok) {
      toast.success(isEditMode ? "User updated" : "User added", {
        className:
          "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-3 p-4 rounded-lg shadow-lg backdrop-blur-sm",
        description: isEditMode
          ? "The user's details have been saved."
          : "The new user has been created.",
        descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
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
          actionData.error || "Something went wrong while saving this user.",
        descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
        duration: 3000,
        icon: <XCircle className="h-5 w-5 text-destructive shrink-0" />,
      });
    }
  }, [actionData]);

  useEffect(() => {
    if (!isUserError) return;

    toast.error("Error", {
      className:
        "bg-destructive/10 dark:bg-destructive/20 border border-destructive/30 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg backdrop-blur-sm",
      description:
        userError?.message || "Something went wrong while loading this user.",
      descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
      duration: 3000,
      icon: <XCircle className="h-5 w-5 text-destructive shrink-0" />,
    });
  }, [isUserError, userError]);

  const toggleRole = (roleId) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId],
    );
  };

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
      toast.error(" ", {
        className:
          "bg-destructive/10 dark:bg-destructive/20 border border-destructive/30 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg backdrop-blur-sm",
        description: "Please select at least one role.",
        descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
        duration: 3000,
        icon: <XCircle className="h-5 w-5 text-destructive shrink-0" />,
      });
      return;
    }

    const payload = {
      user_name: formData.name,
      user_email: formData.email,
      level_ids: selectedRoleIds,
      ...(formData.password ? { user_password: formData.password } : {}),
    };

    submit(payload, {
      method: isEditMode ? "put" : "post",
      encType: "application/json",
    });
  };

  if (isEditMode && isUserPending) {
    return (
      <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Edit user
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 dark:text-slate-400 py-10 text-center font-medium">
            Loading user...
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-md shadow-2xl transition-colors">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {isEditMode ? "Edit user" : "Add new user"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Full name
            </label>

            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Maria Santos"
              className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Email address
            </label>

            <Input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="maria@example.com"
              className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
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
              className="bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
              Assign roles (select one or more — first pick is primary)
            </label>

            <div className="grid grid-cols-3 gap-2">
              {isPending && (
                <div className="col-span-3 flex items-center justify-center py-6 text-slate-500 dark:text-slate-400 text-xs">
                  Loading roles...
                </div>
              )}

              {isError && (
                <div className="col-span-3 flex items-center justify-center py-6 text-red-500 text-xs">
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
                      className={`relative flex items-center gap-2 rounded-md border p-2.5 text-xs font-medium transition-all ${
                        isSelected
                          ? "bg-cyan-600 text-white border-cyan-500 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span
                        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                          isSelected
                            ? "bg-white border-white text-cyan-600"
                            : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            viewBox="0 0 10 10"
                            className="h-2.5 w-2.5"
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

                      <span className="truncate">{role.user_level}</span>

                      {isPrimary && (
                        <span className="absolute -top-1.5 -right-1.5 rounded-full bg-amber-400 dark:bg-amber-500 px-1 text-[9px] font-bold text-slate-950 shadow-sm">
                          ★
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>

            {selectedRoleIds.length > 1 && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                Click a selected role again to make it primary (★).
              </p>
            )}
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
              disabled={isSubmitting}
              className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-medium transition-colors"
            >
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
