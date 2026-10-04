import { fetchConsultationAppointments } from "@/api/http";
import ServiceAppointments from "./components/ServiceAppointments.jsx";

export default function Consultation_Appointment() {
  return (
    <ServiceAppointments
      name="Consultation"
      queryKey="consultation-appointments"
      fetchAppointments={fetchConsultationAppointments}
      allowMedicalRecord
    />
  );
}
