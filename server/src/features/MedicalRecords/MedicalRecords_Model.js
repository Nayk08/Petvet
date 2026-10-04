import pool from "../../config/db.js";

export default class MedicalRecordsModel {
  async getConsultationByAppointmentId(appointment_id) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT * FROM tbl_consultations WHERE appointment_id = $1 AND is_deleted IS NOT TRUE`,
        [appointment_id],
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  // Inserts the consultation plus any vaccinations/prescriptions recorded
  // during the same visit, all in one transaction — a vet filling out one
  // exam form expects it to either all save or none of it, not a
  // consultation note with half its vaccine rows missing because the
  // second insert failed.
  async addConsultation({
    appointment_id,
    pets_id,
    veterinarian_id,
    consultation_date,
    chief_complaint,
    symptoms,
    temperature_c,
    weight_kg,
    heart_rate,
    respiratory_rate,
    diagnosis,
    treatment,
    notes,
    follow_up_date,
    created_by,
    vaccinations = [],
    prescriptions = [],
  }) {
    const client = await pool.connect();
    let queryError = null;
    try {
      await client.query("BEGIN");

      const consultRes = await client.query(
        `INSERT INTO tbl_consultations
          (appointment_id, pets_id, veterinarian_id, consultation_date, chief_complaint,
           symptoms, temperature_c, weight_kg, heart_rate, respiratory_rate, diagnosis,
           treatment, notes, follow_up_date, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [
          appointment_id,
          pets_id,
          veterinarian_id,
          consultation_date,
          chief_complaint || null,
          symptoms || null,
          temperature_c || null,
          weight_kg || null,
          heart_rate || null,
          respiratory_rate || null,
          diagnosis || null,
          treatment || null,
          notes || null,
          follow_up_date || null,
          created_by,
        ],
      );
      const consultation = consultRes.rows[0];

      const vaccinationRows = [];
      for (const v of vaccinations) {
        const res = await client.query(
          `INSERT INTO tbl_vaccinations
            (pets_id, consultation_id, vaccine_name, batch_lot_number,
             date_administered, next_due_date, administered_by, notes, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            pets_id,
            consultation.consultation_id,
            v.vaccine_name,
            v.batch_lot_number || null,
            v.date_administered,
            v.next_due_date || null,
            veterinarian_id,
            v.notes || null,
            created_by,
          ],
        );
        vaccinationRows.push(res.rows[0]);
      }

      const prescriptionRows = [];
      for (const p of prescriptions) {
        const res = await client.query(
          `INSERT INTO tbl_prescriptions
            (pets_id, consultation_id, medication_name, dosage, frequency,
             duration, instructions, prescribed_by, date_prescribed, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            pets_id,
            consultation.consultation_id,
            p.medication_name,
            p.dosage || null,
            p.frequency || null,
            p.duration || null,
            p.instructions || null,
            veterinarian_id,
            consultation_date,
            created_by,
          ],
        );
        prescriptionRows.push(res.rows[0]);
      }

      await client.query("COMMIT");
      return {
        consultation,
        vaccinations: vaccinationRows,
        prescriptions: prescriptionRows,
      };
    } catch (error) {
      queryError = error;
      await client.query("ROLLBACK");
      console.log(`Error in addConsultation: ${error}`);
      throw error;
    } finally {
      client.release(queryError);
    }
  }

  // Three independent reads with no shared transaction — run against the
  // pool directly (each gets its own connection) rather than Promise.all
  // on a single checked-out client, which can only run one query at a time
  // and throws in future pg versions if you try.
  async getPetMedicalRecords(pets_id) {
    const [consultations, vaccinations, prescriptions] = await Promise.all([
      pool.query(
        `SELECT * FROM v_consultations WHERE pets_id = $1 ORDER BY consultation_date DESC, consultation_id DESC`,
        [pets_id],
      ),
      pool.query(
        `SELECT * FROM v_vaccinations WHERE pets_id = $1 ORDER BY date_administered DESC, vaccination_id DESC`,
        [pets_id],
      ),
      pool.query(
        `SELECT * FROM v_prescriptions WHERE pets_id = $1 ORDER BY date_prescribed DESC, prescription_id DESC`,
        [pets_id],
      ),
    ]);
    return {
      consultations: consultations.rows,
      vaccinations: vaccinations.rows,
      prescriptions: prescriptions.rows,
    };
  }
}
