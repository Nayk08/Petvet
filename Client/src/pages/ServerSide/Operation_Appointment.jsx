import { fetchOperationAppointments } from "@/api/http";
import ServiceAppointments from "./components/ServiceAppointments.jsx";

export default function Operation_Appointment() {
  return (
    <ServiceAppointments
      name="Operation"
      queryKey="operation-appointments"
      fetchAppointments={fetchOperationAppointments}
      allowMedicalRecord
    />
  );
}
