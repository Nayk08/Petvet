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
import { runOptimistic, patchWhere, APPOINTMENT_LIST_KEYS } from "@/api/optimistic.js";
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
  fetchAppointmentById,
  cancelAppointment,
} from "@/api/http";

export function Component() {
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData();
  const { appointment_id } = useParams();
  const appointment = useLoaderData();
  const isCancelling = navigation.state === "submitting";

  const closeModal = () => {
    navigate(`..${location.search}`);
  };

  useEffect(() => {
    if (!actionData) return;

    if (actionData.ok) {
      toast.success("Appointment cancelled", {
        className:
          "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-3 p-4 rounded-lg shadow-lg backdrop-blur-sm",
        description: `Appointment #${appointment_id} has been cancelled.`,
        descriptionClassName:
          "text-slate-500 dark:text-slate-400 text-sm font-normal mt-1",
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
          actionData.error ||
          "Something went wrong while cancelling this appointment.",
        descriptionClassName:
          "text-slate-500 dark:text-slate-400 text-sm font-normal mt-1",
        duration: 3000,
        icon: <XCircle className="h-5 w-5 text-destructive shrink-0" />,
      });
    }
  }, [actionData]);

  const handleCancel = () => {
    submit(null, { method: "PUT" });
  };

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-sm shadow-2xl transition-colors">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-950 dark:text-slate-100">
            Cancel appointment
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
            This will cancel{" "}
            <span className="text-slate-900 dark:text-slate-200 font-semibold">
              {appointment?.pets_name ?? `appointment #${appointment_id}`}
            </span>
            's {appointment?.service_name?.toLowerCase() ?? ""} appointment.
            This action can't be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={closeModal}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Keep appointment
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleCancel}
            disabled={isCancelling}
            className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600/90 dark:hover:bg-red-600 transition-colors"
          >
            {isCancelling ? "Cancelling..." : "Cancel appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export async function loader({ params, request }) {
  return fetchAppointmentById(params.appointment_id, {
    signal: request.signal,
  });
}

// Optimistic: shows Cancelled (and leaves the calendar) at once and the
// window closes; the cancel runs in the background and is undone with an
// error toast if the server refuses (e.g. the 2-hour rule). Cancelling also
// cancels/flags the linked bill, so the payment lists refresh afterwards.
export function action({ params }) {
  runOptimistic({
    keys: APPOINTMENT_LIST_KEYS,
    refresh: [["Payments"], ["TodayPayments"], ["RevenueSummary"], ["TodayRevenueSummary"]],
    update: patchWhere("appointment_id", params.appointment_id, {
      appointment_status_name: "Cancelled",
    }),
    request: () => cancelAppointment(params.appointment_id),
    onError: (error) =>
      toast.error("Could not cancel the appointment", {
        description: error.message || "Something went wrong. It was restored.",
      }),
  });
  return { ok: true };
}