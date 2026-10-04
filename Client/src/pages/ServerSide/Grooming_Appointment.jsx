import { fetchGroomingAppointments } from "@/api/http";
import ServiceAppointments from "./components/ServiceAppointments.jsx";

export default function Grooming_Appointment() {
  return (
    <ServiceAppointments
      name="Grooming"
      queryKey="grooming-appointments"
      fetchAppointments={fetchGroomingAppointments}
    />
  );
}
