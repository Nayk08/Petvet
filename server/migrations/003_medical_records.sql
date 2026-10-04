-- 003: Medical records (consultation notes, prescriptions, vaccinations)
-- plus the MEDICAL_RECORDS permission module.
--
-- Run once per database (local already has it):
--   psql "$DATABASE_URL" -f server/migrations/003_medical_records.sql
-- The whole file is one transaction: it applies fully or not at all.

BEGIN;

CREATE TABLE tbl_consultations (
    consultation_id   serial PRIMARY KEY,
    appointment_id    integer NOT NULL REFERENCES tbl_appointments (appointment_id),
    pets_id           integer NOT NULL REFERENCES tbl_pets (pets_id),
    veterinarian_id   integer NOT NULL REFERENCES tbl_users (users_id),
    consultation_date date DEFAULT CURRENT_DATE NOT NULL,
    chief_complaint   text,
    symptoms          text,
    temperature_c     numeric(4,1),
    weight_kg         numeric(5,2),
    heart_rate        integer,
    respiratory_rate  integer,
    diagnosis         text,
    treatment         text,
    notes             text,
    follow_up_date    date,
    is_deleted        boolean DEFAULT false NOT NULL,
    created_by        varchar(50),
    date_created      timestamp DEFAULT now() NOT NULL,
    updated_by        varchar(50),
    date_updated      timestamp,
    CONSTRAINT uq_consultation_appointment UNIQUE (appointment_id)
);

CREATE TABLE tbl_prescriptions (
    prescription_id serial PRIMARY KEY,
    pets_id         integer NOT NULL REFERENCES tbl_pets (pets_id),
    consultation_id integer REFERENCES tbl_consultations (consultation_id),
    medication_name varchar(150) NOT NULL,
    dosage          varchar(100),
    frequency       varchar(100),
    duration        varchar(100),
    instructions    text,
    prescribed_by   integer REFERENCES tbl_users (users_id),
    date_prescribed date DEFAULT CURRENT_DATE NOT NULL,
    is_deleted      boolean DEFAULT false NOT NULL,
    created_by      varchar(50),
    date_created    timestamp DEFAULT now() NOT NULL
);

CREATE TABLE tbl_vaccinations (
    vaccination_id    serial PRIMARY KEY,
    pets_id           integer NOT NULL REFERENCES tbl_pets (pets_id),
    consultation_id   integer REFERENCES tbl_consultations (consultation_id),
    vaccine_name      varchar(100) NOT NULL,
    batch_lot_number  varchar(50),
    date_administered date DEFAULT CURRENT_DATE NOT NULL,
    next_due_date     date,
    administered_by   integer REFERENCES tbl_users (users_id),
    notes             text,
    is_deleted        boolean DEFAULT false NOT NULL,
    created_by        varchar(50),
    date_created      timestamp DEFAULT now() NOT NULL
);

CREATE INDEX idx_consultations_pets ON tbl_consultations (pets_id);
CREATE INDEX idx_prescriptions_pets ON tbl_prescriptions (pets_id);
CREATE INDEX idx_prescriptions_consultation ON tbl_prescriptions (consultation_id);
CREATE INDEX idx_vaccinations_pets ON tbl_vaccinations (pets_id);
CREATE INDEX idx_vaccinations_consultation ON tbl_vaccinations (consultation_id);

CREATE VIEW v_consultations AS
 SELECT c.consultation_id, c.appointment_id, c.pets_id, c.veterinarian_id,
    c.consultation_date, c.chief_complaint, c.symptoms, c.temperature_c,
    c.weight_kg, c.heart_rate, c.respiratory_rate, c.diagnosis, c.treatment,
    c.notes, c.follow_up_date, c.is_deleted, c.created_by, c.date_created,
    c.updated_by, c.date_updated,
    p.pets_name, p.client_id, cl.name AS client_name,
    u.user_name AS veterinarian_name, a.appointment_date
   FROM tbl_consultations c
     JOIN tbl_pets p ON p.pets_id = c.pets_id
     JOIN tbl_clients cl ON cl.client_id = p.client_id
     JOIN tbl_users u ON u.users_id = c.veterinarian_id
     JOIN tbl_appointments a ON a.appointment_id = c.appointment_id
  WHERE c.is_deleted IS NOT TRUE;

CREATE VIEW v_prescriptions AS
 SELECT pr.prescription_id, pr.pets_id, pr.consultation_id, pr.medication_name,
    pr.dosage, pr.frequency, pr.duration, pr.instructions, pr.prescribed_by,
    pr.date_prescribed, pr.is_deleted, pr.created_by, pr.date_created,
    p.pets_name, p.client_id, u.user_name AS prescribed_by_name
   FROM tbl_prescriptions pr
     JOIN tbl_pets p ON p.pets_id = pr.pets_id
     LEFT JOIN tbl_users u ON u.users_id = pr.prescribed_by
  WHERE pr.is_deleted IS NOT TRUE;

CREATE VIEW v_vaccinations AS
 SELECT v.vaccination_id, v.pets_id, v.consultation_id, v.vaccine_name,
    v.batch_lot_number, v.date_administered, v.next_due_date, v.administered_by,
    v.notes, v.is_deleted, v.created_by, v.date_created,
    p.pets_name, p.client_id, u.user_name AS administered_by_name
   FROM tbl_vaccinations v
     JOIN tbl_pets p ON p.pets_id = v.pets_id
     LEFT JOIN tbl_users u ON u.users_id = v.administered_by
  WHERE v.is_deleted IS NOT TRUE;

-- Permission module: Admin full access, Veterinarian view + create.
INSERT INTO tbl_user_module (module_name, module_code, sort_order)
VALUES ('Medical Records', 'MEDICAL_RECORDS', 5)
ON CONFLICT (module_code) DO NOTHING;

INSERT INTO tbl_module_access
    (user_level_id, user_module_id, can_view, can_create, can_edit, can_delete, can_export)
SELECT ul.user_level_id, m.user_module_id, true, true,
       ul.user_level = 'Admin', ul.user_level = 'Admin', false
FROM tbl_user_level ul
CROSS JOIN tbl_user_module m
WHERE m.module_code = 'MEDICAL_RECORDS'
  AND ul.user_level IN ('Admin', 'Veterinarian')
  AND NOT EXISTS (
      SELECT 1 FROM tbl_module_access x
      WHERE x.user_level_id = ul.user_level_id AND x.user_module_id = m.user_module_id
  );

COMMIT;
