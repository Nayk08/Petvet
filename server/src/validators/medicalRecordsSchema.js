import { z } from "zod";

const vaccinationSchema = z.object({
  vaccine_name: z.string().trim().min(1, "Vaccine name is required").max(100),
  batch_lot_number: z.string().trim().max(50).optional().or(z.literal("")),
  date_administered: z.coerce.date({ error: "Enter a valid date" }),
  next_due_date: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

const prescriptionSchema = z.object({
  medication_name: z.string().trim().min(1, "Medication name is required").max(150),
  dosage: z.string().trim().max(100).optional().or(z.literal("")),
  frequency: z.string().trim().max(100).optional().or(z.literal("")),
  duration: z.string().trim().max(100).optional().or(z.literal("")),
  instructions: z.string().trim().max(500).optional().or(z.literal("")),
});

// A vet files one of these per visit — chief_complaint is the one required
// field (the baseline "why we're seeing this pet"); everything else is
// filled in as the exam actually finds it, same as a real paper chart
// where not every field applies to every visit.
export const addConsultationSchema = z.object({
  consultation_date: z.coerce.date().optional(),
  chief_complaint: z.string().trim().min(1, "Chief complaint is required").max(1000),
  symptoms: z.string().trim().max(1000).optional().or(z.literal("")),
  temperature_c: z.coerce
    .number()
    .min(20, "Temperature must be a realistic value")
    .max(50, "Temperature must be a realistic value")
    .optional(),
  weight_kg: z.coerce
    .number()
    .positive("Weight must be greater than 0")
    .max(999.99)
    .optional(),
  heart_rate: z.coerce.number().int().positive().max(400).optional(),
  respiratory_rate: z.coerce.number().int().positive().max(200).optional(),
  diagnosis: z.string().trim().max(2000).optional().or(z.literal("")),
  treatment: z.string().trim().max(2000).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  follow_up_date: z.coerce.date().optional().nullable(),
  vaccinations: z.array(vaccinationSchema).max(20).optional(),
  prescriptions: z.array(prescriptionSchema).max(20).optional(),
});
