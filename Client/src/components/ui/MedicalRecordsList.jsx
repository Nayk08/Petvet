import { Stethoscope, Syringe, Pill } from "lucide-react";
import { formatDate } from "@/utils/COLUMNS";

function Field({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <span className="text-[10px] uppercase font-semibold tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <p className="text-sm text-slate-800 dark:text-slate-200">{value}</p>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <Icon size={13} /> {title}
      </h3>
      {children}
    </div>
  );
}

// Full clinical detail — consultations (vitals/diagnosis/treatment),
// vaccinations, and prescriptions for a pet, each in their own section.
// Shared by the staff Pet Records "Medical Records" view and the client
// portal's own pet detail view, so both render identically.
export default function MedicalRecordsList({ records }) {
  const consultations = records?.consultations ?? [];
  const vaccinations = records?.vaccinations ?? [];
  const prescriptions = records?.prescriptions ?? [];

  if (!consultations.length && !vaccinations.length && !prescriptions.length) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 italic py-6 text-center">
        No medical records on file yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {consultations.length > 0 && (
        <Section icon={Stethoscope} title="Consultations">
          {consultations.map((c) => (
            <div
              key={c.consultation_id}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{formatDate(c.consultation_date)}</span>
                <span>{c.veterinarian_name}</span>
              </div>
              <Field label="Chief Complaint" value={c.chief_complaint} />
              <Field label="Symptoms" value={c.symptoms} />
              <div className="grid grid-cols-4 gap-2 text-xs">
                {c.temperature_c != null && (
                  <Field label="Temp" value={`${c.temperature_c}°C`} />
                )}
                {c.weight_kg != null && (
                  <Field label="Weight" value={`${c.weight_kg} kg`} />
                )}
                {c.heart_rate != null && (
                  <Field label="Heart Rate" value={`${c.heart_rate} bpm`} />
                )}
                {c.respiratory_rate != null && (
                  <Field label="Resp. Rate" value={`${c.respiratory_rate}/min`} />
                )}
              </div>
              <Field label="Diagnosis" value={c.diagnosis} />
              <Field label="Treatment" value={c.treatment} />
              <Field label="Notes" value={c.notes} />
              {c.follow_up_date && (
                <Field label="Follow-up" value={formatDate(c.follow_up_date)} />
              )}
            </div>
          ))}
        </Section>
      )}

      {vaccinations.length > 0 && (
        <Section icon={Syringe} title="Vaccinations">
          {vaccinations.map((v) => (
            <div
              key={v.vaccination_id}
              className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {v.vaccine_name}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDate(v.date_administered)}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {[
                  v.batch_lot_number && `Lot ${v.batch_lot_number}`,
                  v.administered_by_name && `Given by ${v.administered_by_name}`,
                  v.next_due_date && `Next due ${formatDate(v.next_due_date)}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          ))}
        </Section>
      )}

      {prescriptions.length > 0 && (
        <Section icon={Pill} title="Prescriptions">
          {prescriptions.map((p) => (
            <div
              key={p.prescription_id}
              className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {p.medication_name}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDate(p.date_prescribed)}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {[p.dosage, p.frequency, p.duration].filter(Boolean).join(" · ")}
              </p>
              {p.instructions && (
                <p className="text-xs text-slate-600 dark:text-slate-300 pt-1">
                  {p.instructions}
                </p>
              )}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
