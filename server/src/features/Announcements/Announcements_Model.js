import pool from "../../config/db.js";

function notFound() {
  const err = new Error("Announcement not found");
  err.status = 404;
  return err;
}

export default class AnnouncementsModel {
  // Staff list: everything not deleted, drafts included.
  async getAll() {
    const res = await pool.query(
      `SELECT * FROM tbl_announcements WHERE is_deleted = false
       ORDER BY date_created DESC, announcement_id DESC`,
    );
    return res.rows;
  }

  // Landing page: published only, newest first, display fields only.
  async getPublished() {
    const res = await pool.query(
      `SELECT announcement_id, title, caption, image_url, date_created
       FROM tbl_announcements WHERE is_deleted = false AND is_published = true
       ORDER BY date_created DESC, announcement_id DESC`,
    );
    return res.rows;
  }

  async create({ title, caption, image_url, is_published, created_by }) {
    const res = await pool.query(
      `INSERT INTO tbl_announcements (title, caption, image_url, is_published, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, caption || null, image_url, is_published !== "false", created_by],
    );
    return res.rows[0];
  }

  // image_url: undefined = keep, null = remove, string = replace.
  async update({ announcement_id, title, caption, image_url, is_published, updated_by }) {
    const res = await pool.query(
      `UPDATE tbl_announcements SET
         title = $1, caption = $2,
         image_url = CASE WHEN $3::boolean THEN $4 ELSE image_url END,
         is_published = COALESCE($5, is_published),
         updated_by = $6, date_updated = NOW()
       WHERE announcement_id = $7 AND is_deleted = false RETURNING *`,
      [
        title,
        caption || null,
        image_url !== undefined,
        image_url ?? null,
        is_published === undefined ? null : is_published !== "false",
        updated_by,
        announcement_id,
      ],
    );
    if (!res.rows.length) throw notFound();
    return res.rows[0];
  }

  async remove({ announcement_id, deleted_by }) {
    const res = await pool.query(
      `UPDATE tbl_announcements
       SET is_deleted = true, deleted_by = $2, date_deleted = NOW()
       WHERE announcement_id = $1 AND is_deleted = false RETURNING announcement_id`,
      [announcement_id, deleted_by],
    );
    if (!res.rows.length) throw notFound();
    return res.rows[0];
  }

  // The clinic address the landing page map pins (single settings row).
  async getClinicAddress() {
    const res = await pool.query(`SELECT clinic_address FROM tbl_clinic_settings WHERE id = 1`);
    return res.rows[0]?.clinic_address ?? null;
  }

  async setClinicAddress({ clinic_address, updated_by }) {
    const res = await pool.query(
      `UPDATE tbl_clinic_settings SET clinic_address = $1, updated_by = $2, date_updated = NOW()
       WHERE id = 1 RETURNING clinic_address`,
      [clinic_address, updated_by],
    );
    return res.rows[0];
  }
}
