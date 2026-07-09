import {
  useNavigate,
  useLoaderData,
  useParams,
  useSubmit,
  useNavigation,
} from "react-router-dom";

import { useState } from "react";

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

  const { user_id } = useParams();

  const loaderUser = useLoaderData(); // undefined on add-user route

  const isEditMode = Boolean(user_id);

  const isSubmitting = navigation.state === "submitting";

  const [formData, setFormData] = useState({
    name: loaderUser?.user_name ?? "",

    email: loaderUser?.user_email ?? "",

    password: "",
  });

  // level_ids is an ORDERED array of role ids — index 0 is treated as the

  // primary role by sp_upsert_user_with_roles (it writes p_level_ids[1] into

  // tbl_users.user_level_id). Everything after that just lands in

  // tbl_user_level_assignments as additional active roles.

  //

  // Expecting loaderUser to expose something like `level_ids: [1, 3]` with the

  // primary role first. If your v_users / getUserById doesn't return that yet,

  // you'll need to add it there — otherwise edit mode can't prefill roles.

  const [selectedRoleIds, setSelectedRoleIds] = useState(
    loaderUser?.level_ids ?? [],
  );

  const closeModal = () => {
    navigate("..");
  };

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

      alert("Please select at least one role.");

      return;
    }

    const payload = {
      user_name: formData.name,

      user_email: formData.email,

      level_ids: selectedRoleIds, // matches userModel's `level_ids` destructure

      ...(formData.password ? { user_password: formData.password } : {}),
    };

    // Sends the payload to whichever action is wired to this route

    // (addUserAction or editUserAction), then closes on success.

    submit(payload, {
      method: isEditMode ? "put" : "post",

      encType: "application/json",
    });
  };

  // Close the modal once the action resolves (navigation returns to idle)

  // and there was no error. Simple approach: close right after calling submit

  // and let the parent route's query invalidate on refetch. If you want to

  // wait for the action result, use a fetcher instead of useSubmit + navigate.

  const handleFormSubmit = (e) => {
    handleSubmit(e);

    closeModal();
  };

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="bg-slate-950 border border-slate-800 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-100">
            {isEditMode ? "Edit user" : "Add new user"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4">
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

export async function editUserLoader({ params, request }) {
  return fetchUserById(params.user_id, { signal: request.signal });
}

export async function CategoryLoader({ request }) {
  return getCategoryUserLevel({ signal: request.signal });
}
// ---- Actions ----

export async function addUserAction({ request }) {
  const payload = await request.json();
  await queryClient.invalidateQueries({ queryKey: ["usersdata"] }); // add this
  await addNewUser(payload);
  return { ok: true };
}

export async function editUserAction({ request, params }) {
  const payload = await request.json();

  await updateUser(params.user_id, payload);
  await queryClient.invalidateQueries({ queryKey: ["usersdata"] }); // add this

  return { ok: true };
}
