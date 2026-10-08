import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ImageOff, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import QueryState from "@/components/ui/QueryState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ClinicMap from "@/components/ui/ClinicMap.jsx";
import { optimisticMutation, removeWhere, patchWhere, patchCachedRows } from "@/api/optimistic.js";
import { formatDateTime } from "@/utils/COLUMNS";
import {
  fetchAnnouncements,
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  fetchClinicAddress,
  saveClinicAddress,
} from "@/api/http.js";

// Admin page: announcements shown on the landing page (picture, title,
// caption) and the clinic address its map pins.
export function Component() {
  const [editing, setEditing] = useState(null); // {} = add, row = edit
  const [confirmDelete, setConfirmDelete] = useState(null);

  const announcementsQuery = useQuery({
    queryKey: ["announcements"],
    queryFn: ({ signal }) => fetchAnnouncements({ signal }),
  });

  // Optimistic: the card disappears at once (undone on failure).
  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    ...optimisticMutation({
      keys: [["announcements"]],
      update: (row, id) => removeWhere("announcement_id", id)(row),
      onMutate: () => setConfirmDelete(null),
      onSuccess: () => toast.success("Announcement deleted"),
      onError: (error) => toast.error("Could not delete", { description: error.message }),
    }),
  });

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Announcements
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Published announcements appear on the landing page for everyone to see.
          </p>
        </div>
        <Button
          onClick={() => setEditing({})}
          className="flex items-center gap-1.5 font-medium bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          <Plus size={16} /> Add Announcement
        </Button>
      </div>

      <QueryState
        isLoading={announcementsQuery.isPending}
        isError={announcementsQuery.isError}
        error={announcementsQuery.error}
        loadingLabel="Loading announcements..."
        errorLabel="Error loading announcements"
      />

      {announcementsQuery.isSuccess && (
        announcementsQuery.data.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-10">
            No announcements yet. Add one to show it on the landing page.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {announcementsQuery.data.map((a) => (
              <div
                key={a.announcement_id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col"
              >
                {a.image_url ? (
                  <img src={a.image_url} alt={a.title} className="w-full aspect-[16/10] object-cover" />
                ) : (
                  <div className="w-full aspect-[16/10] bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                    <ImageOff className="h-6 w-6" /> No picture
                  </div>
                )}
                <div className="p-4 flex-1 flex flex-col gap-1.5">
                  <span
                    className={`self-start text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      a.is_published
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                        : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {a.is_published ? "Published" : "Hidden"}
                  </span>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{a.title}</h3>
                  {a.caption && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line line-clamp-4">
                      {a.caption}
                    </p>
                  )}
                  <p className="mt-auto pt-2 text-[11px] text-slate-400">
                    {formatDateTime(a.date_updated ?? a.date_created)} · {a.updated_by ?? a.created_by}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(a)} className="gap-1">
                      <Pencil size={14} /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmDelete(a)}
                      className="gap-1 text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      <Trash2 size={14} /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <ClinicLocationCard />

      {editing !== null && (
        <AnnouncementModal
          announcement={Object.keys(editing).length ? editing : null}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Delete announcement?"
        description={`"${confirmDelete?.title}" will be removed from the landing page.`}
        confirmLabel="Delete"
        isConfirming={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(confirmDelete.announcement_id)}
      />
    </div>
  );
}

function AnnouncementModal({ announcement, onClose }) {
  const isEdit = Boolean(announcement);
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [caption, setCaption] = useState(announcement?.caption ?? "");
  const [isPublished, setIsPublished] = useState(announcement?.is_published ?? true);
  const [imageFile, setImageFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);

  const preview = imageFile
    ? URL.createObjectURL(imageFile)
    : removeImage
      ? null
      : announcement?.image_url;

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("caption", caption.trim());
      fd.append("is_published", String(isPublished));
      if (imageFile) fd.append("image", imageFile);
      else if (isEdit && removeImage) fd.append("remove_image", "true");
      return isEdit
        ? updateAnnouncement(announcement.announcement_id, fd)
        : addAnnouncement(fd);
    },
    // Edit is optimistic: the card updates and the window closes at once
    // (undone on failure). Adding waits — the server creates the record.
    onMutate: () => {
      if (!isEdit) return {};
      const undo = patchCachedRows(
        [["announcements"]],
        patchWhere("announcement_id", announcement.announcement_id, {
          title: title.trim(),
          caption: caption.trim(),
          is_published: isPublished,
          image_url: preview ?? null,
        }),
      );
      onClose();
      return { undo };
    },
    onSuccess: () => {
      toast.success(isEdit ? "Announcement updated" : "Announcement added");
      if (!isEdit) onClose();
    },
    onError: (error, _vars, context) => {
      context?.undo?.();
      toast.error("Could not save", { description: error.message });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-md max-h-[92vh] overflow-y-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Announcement" : "Add Announcement"}</DialogTitle>
            <DialogDescription>Picture, title and caption, shown on the landing page.</DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Picture</label>
            {preview && (
              <img src={preview} alt="Preview" className="w-full aspect-[16/10] object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
            )}
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => {
                  setImageFile(e.target.files?.[0] ?? null);
                  setRemoveImage(false);
                }}
                className="text-xs text-slate-600 dark:text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-700 dark:file:bg-slate-800 dark:file:text-slate-200"
              />
              {isEdit && announcement.image_url && !imageFile && !removeImage && (
                <button
                  type="button"
                  onClick={() => setRemoveImage(true)}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                >
                  Remove picture
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} placeholder="e.g. Holiday schedule" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="What clients should know"
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
            Show on the landing page
          </label>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              {mutation.isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Announcement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// The address the landing page map pins, with a live preview.
function ClinicLocationCard() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["clinic-address"],
    queryFn: ({ signal }) => fetchClinicAddress({ signal }),
  });
  const [draft, setDraft] = useState(null); // null = not edited yet
  const address = draft ?? data?.clinic_address ?? "";

  // Optimistic: the saved address (and map) show at once; undone on failure.
  const mutation = useMutation({
    mutationFn: (clinic_address) => saveClinicAddress(clinic_address),
    onMutate: (clinic_address) => {
      const previous = queryClient.getQueryData(["clinic-address"]);
      queryClient.setQueryData(["clinic-address"], { clinic_address });
      setDraft(null);
      return { previous };
    },
    onSuccess: () => toast.success("Clinic location saved"),
    onError: (error, _vars, context) => {
      queryClient.setQueryData(["clinic-address"], context?.previous);
      toast.error("Could not save", { description: error.message });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["clinic-address"] }),
  });

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <MapPin size={16} className="text-emerald-600" /> Clinic Location (landing page map)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Type the full address or the clinic's name as it appears on Google Maps.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(address.trim());
        }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <Input value={address} onChange={(e) => setDraft(e.target.value)} maxLength={300} required />
        <Button type="submit" disabled={mutation.isPending || draft == null} className="bg-indigo-600 hover:bg-indigo-500 text-white">
          {mutation.isPending ? "Saving..." : "Save location"}
        </Button>
      </form>
      <ClinicMap address={data?.clinic_address} />
    </div>
  );
}
