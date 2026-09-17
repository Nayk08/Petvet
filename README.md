# PetVet — RBAC Veterinary Management System

A full-stack veterinary clinic management system built around a **database-driven Role-Based Access Control (RBAC)** engine. Every navigation item, route, and API endpoint is gated by a permission matrix stored in PostgreSQL — nothing is hardcoded to a role name, so roles and their capabilities can be changed at runtime from the Permissions UI without touching code.

|              |                                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| **Frontend** | React 19 · Vite · React Router 7 (data APIs) · TanStack Query · Tailwind CSS 4 · MUI X DataGrid · Zustand      |
| **Backend**  | Node.js · Express 5 · PostgreSQL (`pg`) · express-session + connect-pg-simple · Zod                            |
| **Security** | bcrypt password hashing · server-side sessions · Double-Submit CSRF · Helmet · CORS allow-list · rate limiting |
| **Media**    | Cloudinary (via multer + multer-storage-cloudinary)                                                            |

---

## Table of Contents

1. [Architecture](#architecture)
2. [Project Structure](#project-structure)
3. [The RBAC Model](#the-rbac-model)
4. [Feature Modules](#feature-modules)
5. [Getting Started](#getting-started)
6. [Environment Variables](#environment-variables)
7. [Database](#database)
8. [API Reference](#api-reference)
9. [Security Model](#security-model)
10. [Frontend Conventions](#frontend-conventions)
11. [Deployment](#deployment)
12. [Known Gaps / TODO](#known-gaps--todo)

---

## Architecture

The repository is a **two-app monorepo** with no root workspace — the client and server are installed and run independently.

```
Browser (React SPA)                     Express API                    PostgreSQL
──────────────────────                  ───────────────────            ──────────────
React Router loaders  ──fetch(cookie)──▶  isAuth                       tbl_users
  requirePermission()                     doubleCsrfProtection         tbl_user_level
        │                                 hasPermission(CODE, action) ─▶ v_user_permissions
        │                                       │                      tbl_module_access
        ▼                                       ▼                      tbl_user_module
  TanStack Query cache               Controller → Service → Model      tbl_products / tbl_payments
                                                                       tbl_clients / tbl_pets
```

**Request lifecycle for any protected endpoint:**

1. Browser sends the request with `credentials: "include"` (session cookie attached).
2. Mutating requests first `GET /api/csrf-token` and attach the token as `x-csrf-token`.
3. `isAuth` verifies `req.session.isLoggedIn`.
4. `doubleCsrfProtection` validates the CSRF token against the session identifier.
5. `hasPermission("MODULE_CODE", "can_edit")` queries `v_user_permissions` against **all** of the user's `level_ids`.
6. The route handler delegates: **Controller** (HTTP) → **Service** (business rules) → **Model** (SQL).

### Backend layering

Every feature folder follows the same four-file pattern:

| File              | Responsibility                                                 |
| ----------------- | -------------------------------------------------------------- |
| `*_Route.js`      | URL shape, permission middleware, Zod validation middleware    |
| `*_Controller.js` | Reads `req`, shapes the HTTP response and status codes         |
| `*_Service.js`    | Business rules, error typing (`err.statusCode`), orchestration |
| `*_Model.js`      | Parameterized SQL, transactions, connection handling           |

Models never touch `req`/`res`; controllers never write SQL.

---

## Project Structure

```
RBAC/
├── Client/                              # React SPA (Vite)
│   ├── src/
│   │   ├── api/
│   │   │   ├── http.js                  # ALL fetch calls + CSRF helper + QueryClient
│   │   │   └── auth.js
│   │   ├── components/
│   │   │   ├── layout/                  # Layout.jsx, Navbar.jsx (permission-driven nav)
│   │   │   └── ui/                      # shadcn-style primitives, DynamicGrid, Pagination
│   │   ├── hooks/                       # useDebouncedValue, usePagination
│   │   ├── pages/
│   │   │   ├── Authentication/
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Users_Management/    # Users, Roles, Permissions matrix
│   │   │   ├── ServerSide/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── Inventory/           # + Cart/
│   │   │   │   ├── Payment/
│   │   │   │   ├── Client_Records/      # + Pet_Records/
│   │   │   │   └── *_Appointment.jsx
│   │   │   ├── LandingPage.jsx
│   │   │   └── UnauthorizedPage.jsx
│   │   ├── stores/useCartStore.js       # Zustand + persist (localStorage cart)
│   │   ├── utils/
│   │   │   ├── routeGuards.js           # requireAuth / requireRole / requirePermission
│   │   │   └── COLUMNS.jsx              # DataGrid column definitions
│   │   └── App.jsx                      # Router tree — every route carries a permission loader
│   ├── vite.config.js                   # "@" → ./src alias, Tailwind v4 plugin
│   └── vercel.json                      # SPA rewrite
│
└── server/                              # Express API
    ├── server.js                        # Entry point — app.listen
    ├── app.js                           # Middleware chain + route mounting
    ├── src/
    │   ├── config/
    │   │   ├── db.js                    # pg Pool (DATABASE_URL or discrete vars)
    │   │   ├── csrf.js                  # csrf-csrf double-submit config
    │   │   └── cloudinary.js
    │   ├── middleware/
    │   │   ├── is-auth.js               # session check
    │   │   ├── has-permission.js        # ← the RBAC gate
    │   │   ├── has-role.js              # legacy role-name check
    │   │   ├── validate.js              # Zod body/params/image validators
    │   │   ├── upload.js                # multer → Cloudinary, 5 MB cap
    │   │   └── rate-Limiter.js          # 30 req / 15 min on /api/auth
    │   ├── validators/                  # Zod schemas (product, client, pet, clientPet)
    │   └── features/
    │       ├── Common/                  # navbar + user-level lookups
    │       ├── Authenticator/
    │       │   └── Users_Management/{Users,User_Level,Permission}/
    │       ├── Inventory/
    │       ├── Payment/
    │       └── Client_Records/
    └── utils/paginateQuery.js           # shared LIMIT/OFFSET + COUNT helper
```

---

## The RBAC Model

### Core tables

| Table                        | Purpose                                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `tbl_users`                  | Accounts. Passwords stored as bcrypt hashes; soft-deleted via `is_deleted`.                                           |
| `tbl_user_level`             | Roles (Admin, Staff, Veterinarian, Groomer, Client…).                                                                 |
| `tbl_user_level_assignments` | Many-to-many user ↔ role, enabling a user to hold multiple roles.                                                     |
| `tbl_user_module`            | The module registry: `module_name`, **`module_code`**, `route`, `parent_module_id`, `sort_order`, `is_active`.        |
| `tbl_module_access`          | The matrix itself: one row per (role × module) with `can_view`, `can_create`, `can_edit`, `can_delete`, `can_export`. |
| `v_user_permissions`         | View joining the three above; the single source of truth read by both the nav builder and `hasPermission`.            |

### Module codes

`module_code` is the contract that ties database rows, backend middleware, and frontend route guards together. Changing one means changing all three.

| Code                  | Module                             | Route                         |
| --------------------- | ---------------------------------- | ----------------------------- |
| `DASHBOARD`           | Dashboard                          | `dashboard`                   |
| `APPOINTMENT`         | Appointment                        | `appointments`                |
| `C_APPOINTMENT`       | Consultation                       | `consultation-appointment`    |
| `G_APPOINTMENT`       | Grooming                           | `grooming-appointment`        |
| `O_APPOINTMENT`       | Operation                          | `operation-appointment`       |
| `C_P_RECORDS`         | Client & Pet Records               | `client-pet-record`           |
| `CART`                | Cart                               | `cart`                        |
| `PAYMENTS`            | Payments                           | `payments`                    |
| `INVENTORY`           | Inventory                          | `inventory`                   |
| `USER_MGMT`           | User Management (parent)           | —                             |
| `USER_MGMT_USERS`     | Users                              | `user-management/users`       |
| `USER_MGMT_ROLES`     | Roles                              | `user-management/roles`       |
| `USER_MGMT_PERMS`     | Permissions                        | `user-management/permissions` |

### How a permission check actually runs

**Backend** — `server/src/middleware/has-permission.js`:

```js
hasPermission("INVENTORY", "can_edit");
// → SELECT 1 FROM v_user_permissions
//   WHERE user_level_id = ANY($1::int[])   -- every role the user holds
//     AND module_code = $2
//     AND can_edit = true
//   LIMIT 1
// → 401 if not logged in, 403 if no matching row
```

**Frontend** — `Client/src/utils/routeGuards.js`:

```js
requirePermission("PAYMENTS", "can_delete");
// → ensures currentUser, then reads the cached /api/nav payload
// → redirects to /unauthorized when the flag is false
```

**Navigation** — `GET /api/nav` returns only modules where `bool_or(can_view) = true` across the user's roles, aggregated with `bool_or` so multi-role users get the union of their permissions. The sidebar renders straight from that response, so users never see links they cannot open.

> The frontend guard is a **UX layer only**. The backend `hasPermission` check is the real enforcement point — every protected endpoint carries its own gate.

---

## Feature Modules

### Authentication

Session-based login (`POST /api/auth/login`) with bcrypt verification. On success the session is **regenerated** (session-fixation defence) and populated with `{ id, name, email, role, user_level_id, level_ids }`. Sessions persist in the PostgreSQL `session` table via `connect-pg-simple`, with a 24-hour cookie. Self-registration assigns the default `Client` role.

### User Management

- **Users** — paginated CRUD with search and filters; soft delete.
- **Roles** (`tbl_user_level`) — create/edit/delete roles with descriptions.
- **Permissions** — an interactive matrix. Toggling a single checkbox issues `PATCH /api/permissions` with `{ userLevelId, userModuleId, field, value }`, so permission changes take effect on the next request without a redeploy.

### Inventory

Product CRUD with Cloudinary image upload (5 MB cap; jpg/jpeg/png/webp only), server-side pagination, search, and multi-select filtering. Images and body fields are validated by Zod before reaching the controller.

### Cart & Payments

The cart lives client-side in Zustand with `persist` (survives refresh) and clamps quantities to the stock snapshot stored on each cart item.

The checkout flow is deliberately two-phase and transactional:

| Phase        | Endpoint                           | Behaviour                                                                                                                                                                   |
| ------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Checkout** | `POST /api/checkout`               | Creates a `Pending` payment + cart items. Stock is **verified but not deducted** — an abandoned order never holds inventory hostage.                                        |
| **Complete** | `PATCH /api/checkout/:id/complete` | Deducts stock (`WHERE product_quantity >= $1`) and flips status to `Completed`, both inside one transaction. A stock race rolls the status change back and returns **409**. |
| **Cancel**   | `PATCH /api/payments/:id/cancel`   | Only permitted while `Pending`; sets `is_deleted` and status `Cancelled`.                                                                                                   |

Status IDs are resolved by **name** at runtime (`getPaymentStatusId("Pending")`) so numeric seed IDs can drift between environments harmlessly.

The Payment list's search box matches against `control_number` (`ILIKE`), and a `payment_type` filter (`INV` / `APT`) narrows by `appointment_id IS NULL`/`IS NOT NULL` — it's a `filterOnly` column (`PaymentColumns` in `COLUMNS.jsx`) so it contributes a filter dropdown without becoming a real table column, same convention as the Appointments module's staff/date filters.

**Control numbers.** Every payment gets a human-facing reference, computed (not stored) in `v_payments.control_number`: `INV{year}{payment_id}` for a product-cart checkout, `APT{year}{payment_id}` for an appointment charge (`appointment_id IS NULL` is what distinguishes the two) — the year is taken from `date_created`.

**Payment method.** Completing a payment — via `PATCH /api/checkout/:id/complete` or the appointment's `POST /api/appointments/book-with-payment` — requires `payment_method` (`Cash` / `GCash` / `Split`), and `gcash_reference_number` becomes required whenever the method is `GCash` or `Split` (both move money through GCash and need something to reconcile against). When required, it must also match `GCASH_REFERENCE_PATTERN` (`server/utils/validatePaymentMethod.js`) — exactly 13 digits, the format GCash's own app shows on a payment confirmation screen. The rule is enforced in three places that must be kept in sync: the `PaymentMethodPicker` component (`Client/src/components/ui/PaymentMethodPicker.jsx`, shared by all three payment-collection modals — cart checkout's Order Summary, the Payment list's completion modal, and appointment booking — which strips non-digits and caps input at 13 characters), `appointmentSchema.js`'s `bookAppointmentWithPaymentSchema` (Zod, at the route layer), and the shared `server/utils/validatePaymentMethod.js` helper (called directly by both `Payment_Service.completePayment` and `Appointment_Service.bookAppointmentWithPayment`, so the check still holds even if a caller bypasses Zod). `tbl_payments.payment_method` stays `NULL` until a payment actually reaches this step — a still-`Pending` cart checkout has no method yet.

**GCash never gives change**, so `GCash` and `Split` both require the amount received to land on the total **exactly** — not more, not less. `Cash` keeps the usual "received ≥ total, hand back change" behavior. This is enforced twice: on the frontend (`Client/src/utils/paymentValidation.js`'s `evaluatePaymentAmount` disables the submit button unless the amount matches, within a small rounding tolerance) and on the backend (`resolvePaymentSplit` in `server/utils/validatePaymentMethod.js` 400s if `cash_received + gcash_received !== total_amount` for a `Split` payment). `tbl_payments.cash_amount`/`gcash_amount` store exactly what was applied — for `Split` that's the received amounts verbatim (already forced equal to the total by the check above); for a `Cash`-only or `GCash`-only payment it's the trivial split (one field equals the total, the other `0`).

### Client & Pet Records

Clients with optional profile images, plus nested pet records (species, gender, breed, DOB, weight, microchip number, spay/neuter status, pet status, and a Cloudinary-backed pet photo). Both use soft deletes (`PUT .../delete-*`). Lookup endpoints (`/species`, `/gender`, `/pet-status`) feed the modal dropdowns. Pet add/edit accepts `multipart/form-data` (mirroring Inventory's image upload) and, on edit, keeps the existing photo when no new file is uploaded.

Pagination on `GET /api/client/:client_id/pets?page&limit&search` works differently from every other list endpoint: `v_client_pets` bundles **all** of a client's pets into one row via `json_agg` (see [View Definitions](#view-definitions)), which can't be paginated with SQL `LIMIT`/`OFFSET`. Instead, `Client_Records_Model.js:getClienPetById` fetches that single aggregated row, then filters (`pets_name`/`breed`/`microchip_number`) and slices the page window in application code before returning the usual `{ rows, pagination }` shape. Fine for a per-client pet list; would need revisiting if any single client's pet count grew large enough for that in-memory slice to matter.

### Appointments

Appointments link a client's pet to a service (`Consultation`/`Grooming`/`Operation`, `tbl_appointment_services`) and a date/time range. Status (`Pending` → `Confirmed`/`Completed`, or `Cancelled`) is resolved by name at runtime (`getAppointmentStatusId("Pending")`), mirroring Payments' status pattern.

One shared `tbl_appointments` table backs all four permission-gated pages: the general **Appointments** page (`APPOINTMENT`) is a calendar with full CRUD — booking, editing, and cancelling — while **Consultation**, **Grooming**, and **Operation** (`C_APPOINTMENT`/`G_APPOINTMENT`/`O_APPOINTMENT`) are read-only, paginated, filterable tables pre-filtered to their service type, each backed by its own permission-checked endpoint (`GET /api/appointments/consultation`, `/grooming`, `/operation`) rather than just a client-side filter, so the permission is enforced server-side like everywhere else. Those three tables share a staff filter (by `assigned_staff_id`, not `staff_name` — several staff share a display name in this data, so filtering by name would conflate different people) and a date filter (`appointment_date`), which is also why `DynamicGrid.jsx` supports a `filterOnly` column (contributes a filter control without becoming a real, toggleable table column) and a `filterType: "date"` column (a native date input instead of the usual dropdown).

An appointment can't double-book the same staff member: a partial unique index (`uq_appointments_staff_slot` on `appointment_date, start_time, assigned_staff_id`, scoped to `is_deleted IS NOT TRUE` so a cancelled slot frees back up) stops one person from being booked into the same date+time twice — enforced at the database level so it's race-safe, not just checked-then-inserted. Two different staff can independently take the same service at the same slot (e.g. two groomers each with their own Grooming appointment at 9-10) — only the staff member is the actual constrained resource, not the service type. The Staff dropdown on the booking modal is itself filtered by role to match the selected service (`Grooming` → `Groomer`, `Consultation`/`Operation` → `Veterinarian`).

**Booking requires payment.** Filling out the booking form and clicking "Book Appointment" doesn't create the appointment yet — it opens a second modal (`ConfirmAppointmentPaymentModal.jsx`) to collect payment first. Only confirming payment there calls `POST /api/appointments/book-with-payment`, which creates the appointment **and** its linked payment together in one transaction (`Appointment_Model.js:addAppointmentWithPayment`) — closing the payment modal leaves nothing behind. The charged total is resolved server-side, never trusted from the client:

- **Consultation** — a fixed price on `tbl_appointment_services.service_price`.
- **Grooming** — looked up from the booked pet's `weight_kg` against `tbl_grooming_price_tiers` (Toy/Small/Medium/Large/Giant).
- **Operation** — too case-by-case for a fixed price or simple tier table (procedure, duration, complications all vary); staff enters the amount in the payment modal, which the endpoint requires when the service has no fixed price and isn't Grooming.

The resulting payment is created directly as `Completed` (paid at the point of booking, unlike product-cart checkouts which start `Pending`) and linked back via `tbl_payments.appointment_id`, so it shows up in the normal Payments list alongside cart checkouts.

Cancelling is a soft delete (`is_deleted` + `deleted_by`/`date_deleted`) that also flips the status to `Cancelled`, only allowed from `Pending`/`Confirmed` — same shape as `Payment_Service.js:cancelPayment`. Booking is restricted to fixed one-hour slots, 9:00 AM–6:00 PM, enforced both in the UI (a slot picker, not free-form times) and in `appointmentSchema.js` (rejects off-the-hour times, times outside the window, slots longer than an hour, and anything in the past — including "today" once the clock passes 6 PM).

**Past appointments auto-complete.** Since payment is now collected at booking time, a `Pending`/`Confirmed` appointment whose `end_time` has already passed is presumed to have happened (paid + attended), not abandoned — `Appointment_Model.js:autoCompletePastAppointments` flips it to `Completed` (`updated_by: 'System'`) rather than leaving it stuck or requiring a manual "mark completed" click. There's no cron job in this app, so it runs lazily at the top of both `getAppointments` and `getAppointmentById` — any request that reads appointment data self-heals stale rows first. Once flipped, `cancelAppointment` correctly refuses it (**409**, same as any other already-`Completed` appointment) — a no-show can still be cancelled, but only before its slot's end time passes.

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (Express 5 / Vite 8)
- **PostgreSQL** 14+
- A **Cloudinary** account (image uploads)

### 1. Database

```bash
createdb project_system_db

# From a custom-format dump:
pg_restore -d project_system_db project_system_db.dump

# …or from the plain-SQL backup:
psql -d project_system_db -f server/local_full_backup.sql
```

The `session` table is created automatically on first boot (`createTableIfMissing: true`).

### 2. Server

```bash
cd server
npm install
cp .env.example .env      # then fill in the values below
npm start                 # → http://localhost:3000
```

For auto-reload during development: `npx nodemon server.js`.

### 3. Client

```bash
cd Client
npm install
# create .env with VITE_API_BASE_URL / VITE_API_AUTH_URL
npm run dev               # → http://localhost:5173
```

Other client scripts: `npm run build`, `npm run preview`, `npm run lint` (oxlint).

> `CLIENT_URL` on the server **must** exactly match the origin Vite serves from, or CORS will reject the credentialed requests.

---

## Environment Variables

### `server/.env`

| Variable                                                               | Description                                                                                                     |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASS`, `DB_PORT`                  | PostgreSQL connection (used when `DATABASE_URL` is unset)                                                       |
| `DATABASE_URL`                                                         | Optional single connection string; when present it wins and enables SSL with `rejectUnauthorized: false`        |
| `PORT`                                                                 | API port (default `3000`)                                                                                       |
| `CLIENT_URL`                                                           | Allowed CORS origin — must match the frontend exactly                                                           |
| `SESSION_SECRET`                                                       | Signs the session cookie                                                                                        |
| `CSRF_SECRET`                                                          | Signs CSRF tokens                                                                                               |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Image hosting                                                                                                   |
| `NODE_ENV`                                                             | `production` enables `trust proxy`, `secure` + `SameSite=None` cookies, and the `__Host-csrf-token` cookie name |

### `Client/.env`

| Variable            | Example                          |
| ------------------- | -------------------------------- |
| `VITE_API_BASE_URL` | `http://localhost:3000/api`      |
| `VITE_API_AUTH_URL` | `http://localhost:3000/api/auth` |

---

## Database

19 tables + 7 views, PostgreSQL 14+.

### Tables

> **Audit columns:** every table below has `created_by`/`updated_by` as a `varchar` **name snapshot** (e.g. `"Jeffrey Garcia"`, taken from `req.session.user.name` at write time) — not a foreign key. `tbl_users`, `tbl_user_level`, `tbl_user_module`, and `tbl_module_access` originally stored an integer `users_id` instead; those were converted and backfilled by resolving each ID to that user's name at migration time. `tbl_users`, `tbl_clients`, `tbl_products`, `tbl_payments`, `tbl_pets`, and `tbl_user_level` also have a `deleted_by` column alongside `is_deleted`. Every add/edit/delete controller across Users, Roles, Inventory, Payments, and Client/Pet Records populates them — including `Users_Model.js:addUser/updateUser`, which stamp `created_by`/`updated_by` with a follow-up `UPDATE` since the `sp_upsert_user_with_roles` stored procedure doesn't set them itself.

| Table                         | Domain    | Purpose                                                                                             |
| ------------------------------ | --------- | ----------------------------------------------------------------------------------------------------- |
| `session`                     | Auth      | `express-session` store, managed by `connect-pg-simple` (`sid`, `sess`, `expire`)                    |
| `tbl_users`                   | RBAC      | Accounts. bcrypt password hash, soft delete, `user_level_id` for the primary/display role            |
| `tbl_user_level`              | RBAC      | Roles (Admin, Staff, Veterinarian, Groomer, Client…)                                                 |
| `tbl_user_level_assignments`  | RBAC      | Many-to-many user ↔ role, so a user can hold multiple roles                                          |
| `tbl_user_module`             | RBAC      | Module registry: `module_name`, `module_code`, `route`, `parent_module_id`, `sort_order`             |
| `tbl_module_access`           | RBAC      | The permission matrix: one row per (role × module) with `can_view/create/edit/delete/export`         |
| `tbl_clients`                 | Records   | Client accounts (name, email, mobile), soft delete                                                   |
| `tbl_pets`                    | Records   | Pet records — FKs to `tbl_clients`, `tbl_species`, `tbl_gender`, `tbl_pet_status`, `pet_image` (Cloudinary URL), soft delete, `created_by`/`updated_by`/`date_created`/`date_updated`, indexed on `client_id` |
| `tbl_species`                 | Records   | Lookup: pet species                                                                                    |
| `tbl_gender`                  | Records   | Lookup: pet gender                                                                                     |
| `tbl_pet_status`              | Records   | Lookup: pet status                                                                                      |
| `tbl_products`                | Inventory | Products — Cloudinary image URL, price, quantity, expiry, `status_id`, soft delete                   |
| `tbl_status`                  | Inventory | Lookup: product status                                                                                 |
| `tbl_payments`                | Payments  | Payment/order header — `total_amount`, `payment_status_id`, soft delete, nullable `appointment_id` linking it to the appointment it paid for (NULL for product-cart checkouts), `payment_method` (Cash/GCash/Split, set once payment is actually collected), `gcash_reference_number` (required for GCash/Split), and `cash_amount`/`gcash_amount` (always sum to `total_amount` exactly — see [Cart & Payments](#cart--payments)) |
| `tbl_payment_status`          | Payments  | Lookup: Pending / Completed / Cancelled                                                                |
| `tbl_cart_items`              | Payments  | Line items per payment — `subtotal` is a generated column (`quantity * item_price`)                  |
| `tbl_appointments`            | Appointments | Client + pet + service + assigned staff (`assigned_staff_id` → `tbl_users`) + date/time range + status, soft delete with `date_deleted`, indexed on `client_id`/`pets_id`/`appointment_services_id`/`appointment_date`/`assigned_staff_id`, unique on (date, time, service) and (date, time, staff) to prevent double-booking |
| `tbl_appointment_services`    | Appointments | Lookup: Consultation / Grooming / Operation, plus a nullable `service_price` (set for Consultation; NULL for Grooming/Operation, whose price is resolved elsewhere — see [Appointments](#appointments)) |
| `tbl_appointment_status`      | Appointments | Lookup: Pending / Confirmed / Completed / Cancelled                                                    |
| `tbl_grooming_price_tiers`    | Appointments | Weight-tier price list for Grooming — `tier_name`, `max_weight_kg` (NULL = open-ended top tier), `price` |

### Views

| View                    | Used by                                                | Notes                                    |
| ------------------------ | ------------------------------------------------------ | ----------------------------------------- |
| `v_user_permissions`    | `hasPermission` middleware, navbar builder             |                                            |
| `v_users`               | Login profile lookup, user listings (joins role names) | Aggregates `level_ids` across all of a user's roles via `tbl_user_level_assignments` |
| `v_products`            | Inventory listings                                     |                                            |
| `v_payments`            | Payment listings (joins status names)                  | Includes `appointment_id` (tells an appointment-charge apart from a product-cart checkout), `payment_method`/`gcash_reference_number`/`cash_amount`/`gcash_amount`, and a computed `control_number` (`INV`/`APT` + year + `payment_id`) |
| `v_client_pets`         | Client + pet record listings                           |                                            |
| `v_payment_cart_items`  | Cart items for a payment (`GET /api/payments/:id`)     | Joins `tbl_cart_items` to `tbl_products` for `product_name`                              |
| `v_appointments`        | Appointment listings (general + Consultation + Grooming) | Joins client, pet, service, and status names in, plus `service_price`; does **not** filter `is_deleted` (a cancelled appointment is a status, not a real deletion — same convention as `v_payments`) |

> **Note:** these views live only in the database — pgAdmin's ERD/reverse-engineering export (`Tables` diagram/script) does not include `CREATE VIEW` statements. A schema-only dump made that way will create the 17 tables but omit all 6 views the app depends on; use `pg_dump --schema-only` (or pgAdmin's **Views → Generate Script**), or copy the definitions below, to recreate them on a fresh database.

### View Definitions

```sql
CREATE OR REPLACE VIEW public.v_users
 AS
 SELECT u.users_id,
    u.user_name,
    u.user_email,
    u.user_picture,
    u.user_level_id,
    u.is_deleted,
    u.date_created,
    ul.user_level,
    ul.description AS role_description,
    ul.is_active,
    COALESCE(array_agg(a.user_level_id ORDER BY (a.user_level_id = u.user_level_id) DESC, a.user_level_id) FILTER (WHERE a.user_level_id IS NOT NULL), ARRAY[u.user_level_id]) AS level_ids
   FROM tbl_users u
     JOIN tbl_user_level ul ON u.user_level_id = ul.user_level_id
     LEFT JOIN tbl_user_level_assignments a ON a.users_id = u.users_id AND a.is_active = true
  WHERE u.is_deleted IS NOT TRUE
  GROUP BY u.users_id, u.user_name, u.user_email, u.user_picture, u.user_level_id, u.is_deleted, u.date_created, ul.user_level, ul.description, ul.is_active;

CREATE OR REPLACE VIEW public.v_user_permissions
 AS
 SELECT um.user_module_id,
    um.module_name,
    um.module_code,
    um.route,
    um.parent_module_id,
    um.sort_order,
    ul.user_level,
    ma.can_view,
    ma.can_create,
    ma.can_edit,
    ma.can_delete,
    ma.can_export,
    ul.user_level_id
   FROM tbl_user_level ul
     JOIN tbl_module_access ma ON ma.user_level_id = ul.user_level_id
     JOIN tbl_user_module um ON um.user_module_id = ma.user_module_id AND um.is_active = true
  WHERE ul.is_active = true;

CREATE OR REPLACE VIEW public.v_products
 AS
 SELECT p.product_id,
    p.product_name,
    p.product_image,
    p.product_quantity,
    p.product_price,
    p.product_expiry_date,
    p.product_expiry_date <= CURRENT_TIMESTAMP AS is_expired,
    s.status_name,
    p.created_by,
    p.date_created,
    p.updated_by,
    p.date_updated
   FROM tbl_products p
     LEFT JOIN tbl_status s ON s.status_name =
        CASE
            WHEN p.product_quantity >= 101 THEN 'High Stock'
            WHEN p.product_quantity >= 50 AND p.product_quantity <= 100 THEN 'Average Stock'
            WHEN p.product_quantity >= 1 AND p.product_quantity <= 49 THEN 'Low Stock'
            ELSE 'Out of Stock'
        END
  WHERE p.is_deleted = false;

CREATE OR REPLACE VIEW public.v_payments
 AS
 SELECT p.payment_id,
    p.total_amount,
    ps.payment_status_name,
    p.created_by,
    p.updated_by,
    p.date_created,
    p.date_updated,
    count(ci.cart_item_id) AS item_count,
    COALESCE(sum(ci.quantity), 0::bigint) AS total_quantity,
    COALESCE(sum(ci.subtotal), 0::numeric) AS computed_total,
    p.is_deleted,
    p.appointment_id,
    p.payment_method,
    p.gcash_reference_number,
    CASE WHEN p.appointment_id IS NULL
         THEN 'INV' || EXTRACT(YEAR FROM p.date_created)::int::text || p.payment_id::text
         ELSE 'APT' || EXTRACT(YEAR FROM p.date_created)::int::text || p.payment_id::text
    END AS control_number,
    p.cash_amount,
    p.gcash_amount
   FROM tbl_payments p
     JOIN tbl_payment_status ps ON p.payment_status_id = ps.payment_status_id
     LEFT JOIN tbl_cart_items ci ON ci.payment_id = p.payment_id
  GROUP BY p.payment_id, p.total_amount, ps.payment_status_name, p.created_by, p.updated_by, p.date_created, p.date_updated, p.is_deleted, p.appointment_id, p.payment_method, p.gcash_reference_number, p.cash_amount, p.gcash_amount;

CREATE OR REPLACE VIEW public.v_payment_cart_items
 AS
 SELECT ci.cart_item_id,
    ci.payment_id,
    ci.product_id,
    pr.product_name,
    ci.quantity,
    ci.item_price,
    ci.subtotal,
    ci.date_created,
    ci.date_updated
   FROM tbl_cart_items ci
     JOIN tbl_products pr ON pr.product_id = ci.product_id;

CREATE OR REPLACE VIEW public.v_client_pets
 AS
 SELECT c.client_id,
    c.name AS client_name,
    c.email,
    c.mobile_no,
    COALESCE(json_agg(json_build_object('pet_id', p.pets_id, 'pet_name', p.pets_name, 'date_of_birth', p.date_of_birth, 'weight_kg', p.weight_kg, 'breed', p.breed, 'microchip_number', p.microchip_number, 'is_spayed_neutered', p.is_spayed_neutered, 'pet_image', p.pet_image, 'species_name', s.species, 'gender_name', g.gender, 'pet_status_name', ps.pet_status)) FILTER (WHERE p.pets_id IS NOT NULL), '[]'::json) AS pets
   FROM tbl_clients c
     LEFT JOIN tbl_pets p ON p.client_id = c.client_id AND p.is_deleted IS NOT TRUE
     LEFT JOIN tbl_species s ON s.species_id = p.species_id
     LEFT JOIN tbl_gender g ON g.gender_id = p.gender_id
     LEFT JOIN tbl_pet_status ps ON ps.pet_status_id = p.pet_status_id
  WHERE c.is_deleted IS NOT TRUE
  GROUP BY c.client_id, c.name, c.email, c.mobile_no;

CREATE OR REPLACE VIEW public.v_appointments AS
 SELECT a.appointment_id,
    a.client_id,
    c.name AS client_name,
    a.pets_id,
    p.pets_name,
    a.appointment_services_id,
    s.appointment_services AS service_name,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.appointment_status_id,
    st.appointment_status_name,
    a.notes,
    a.is_deleted,
    a.created_by,
    a.updated_by,
    a.deleted_by,
    a.date_created,
    a.date_updated,
    a.date_deleted,
    a.assigned_staff_id,
    u.user_name AS staff_name,
    s.service_price
   FROM tbl_appointments a
     JOIN tbl_clients c ON c.client_id = a.client_id
     JOIN tbl_pets p ON p.pets_id = a.pets_id
     JOIN tbl_appointment_services s ON s.appointment_services_id = a.appointment_services_id
     JOIN tbl_appointment_status st ON st.appointment_status_id = a.appointment_status_id
     LEFT JOIN tbl_users u ON u.users_id = a.assigned_staff_id;
```

> `assigned_staff_id`/`staff_name`/`service_price` are appended at the end rather than grouped near the other appointment/service columns — `CREATE OR REPLACE VIEW` can only append new columns, it can't insert or reorder existing ones. Keep that in mind before hand-editing this view directly (e.g. in pgAdmin) — a mid-list column reorder will fail outright.

### Pagination

All list endpoints share `server/utils/paginateQuery.js`, which runs the data query and the `COUNT(*)` query in parallel and returns:

```json
{
  "rows": [ ... ],
  "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

Passing `limit=all` (or ≥ `999999`) skips `LIMIT`/`OFFSET` and returns everything as a single page.

### Filtering

Filters arrive as comma-separated query params and are matched against a per-model `ALLOWED_FILTER_COLUMNS` allow-list before being interpolated into `column = ANY($n)` — column names are never taken from user input unchecked, and values are always parameterized.

---

## API Reference

Base URL: `http://localhost:3000`. All `/api/*` routes below (except `/api/csrf-token` and `/api/auth/*`) require an authenticated session **and** a valid CSRF token on mutations.

### Public / session

| Method | Endpoint             | Notes                                        |
| ------ | -------------------- | -------------------------------------------- |
| `GET`  | `/`                  | Health check                                 |
| `GET`  | `/api/csrf-token`    | Issues a CSRF token, initializes the session |
| `POST` | `/api/auth/login`    | Rate-limited, CSRF-protected                 |
| `POST` | `/api/auth/register` | Assigns the default `Client` role            |
| `POST` | `/api/auth/logout`   | Destroys the session, clears `connect.sid`   |
| `GET`  | `/api/auth/me`       | Current session user                         |

### Common

| Method | Endpoint                 | Permission    |
| ------ | ------------------------ | ------------- |
| `GET`  | `/api/nav`               | Authenticated |
| `GET`  | `/api/categoryUserLevel` | Authenticated |

### Users · `USER_MGMT_USERS`

| Method   | Endpoint                                 | Action       |
| -------- | ---------------------------------------- | ------------ |
| `GET`    | `/api/users?page&limit&search&<filters>` | `can_view`   |
| `GET`    | `/api/users/:user_id`                    | `can_view`   |
| `POST`   | `/api/users/add-user`                    | `can_create` |
| `PUT`    | `/api/users/:user_id/edit-user`          | `can_edit`   |
| `DELETE` | `/api/users/:user_id/delete-user`        | `can_delete` |

### Roles · `USER_MGMT_ROLES`

| Method   | Endpoint                                           | Action       |
| -------- | -------------------------------------------------- | ------------ |
| `GET`    | `/api/usersLevel`                                  | `can_view`   |
| `GET`    | `/api/usersLevel/:user_level_id`                   | `can_view`   |
| `POST`   | `/api/usersLevel/add-user-level`                   | `can_create` |
| `PUT`    | `/api/usersLevel/:user_level_id/edit-user-level`   | `can_edit`   |
| `DELETE` | `/api/usersLevel/:user_level_id/delete-user-level` | `can_delete` |

### Permissions · `USER_MGMT_PERMS`

| Method  | Endpoint                        | Action     |
| ------- | ------------------------------- | ---------- |
| `GET`   | `/api/user-levels`              | `can_view` |
| `GET`   | `/api/permissions/:userLevelId` | `can_view` |
| `PATCH` | `/api/permissions`              | `can_edit` |

### Inventory · `INVENTORY`

| Method   | Endpoint                                    | Action                                   |
| -------- | ------------------------------------------- | ---------------------------------------- |
| `GET`    | `/api/inventory`                            | `can_view`                               |
| `GET`    | `/api/inventory/:product_id`                | `can_view`                               |
| `POST`   | `/api/inventory/add-product`                | `can_create` · multipart, image required |
| `PUT`    | `/api/inventory/:product_id/edit-product`   | `can_edit` · multipart, image optional   |
| `DELETE` | `/api/inventory/:product_id/delete-product` | `can_delete`                             |

### Payments · `PAYMENTS`

| Method  | Endpoint                     | Action                                               |
| ------- | ---------------------------- | ---------------------------------------------------- |
| `GET`   | `/api/payments?page&limit&search&payment_status_name&payment_type` | `can_view` · `search` matches `control_number`, `payment_type` filters `INV`/`APT` |
| `GET`   | `/api/payments/:id`          | `can_view` (returns the payment with its cart items) |
| `POST`  | `/api/checkout`              | `can_create`                                         |
| `PATCH` | `/api/checkout/:id/complete` | `can_edit` · body: `payment_method` (Cash/GCash/Split), `gcash_reference_number` (required for GCash/Split), `cash_received`/`gcash_received` (required for Split — must together cover the total) |
| `PATCH` | `/api/payments/:id/cancel`   | `can_delete`                                         |

### Client & Pet Records · `C_P_RECORDS`

| Method | Endpoint                                           | Action                     |
| ------ | -------------------------------------------------- | -------------------------- |
| `GET`  | `/api/client`                                      | `can_view`                 |
| `GET`  | `/api/client/:client_id`                           | `can_view`                 |
| `POST` | `/api/client/add-client`                           | `can_create` · multipart   |
| `PUT`  | `/api/client/:client_id/edit-client`               | `can_edit` · multipart     |
| `PUT`  | `/api/client/:client_id/delete-client`             | `can_delete` (soft delete) |
| `GET`  | `/api/client/:client_id/pets?page&limit&search`    | `can_view`                 |
| `POST` | `/api/client/:client_id/pets`                      | `can_create` · multipart, image optional |
| `GET`  | `/api/pets/:pets_id`                               | `can_view`                 |
| `PUT`  | `/api/pets/:pets_id/edit-pet`                      | `can_edit` · multipart, image optional |
| `PUT`  | `/api/pets/:pets_id/delete-pet`                    | `can_delete` (soft delete) |
| `GET`  | `/api/species` · `/api/gender` · `/api/pet-status` | `can_view` (lookups)       |

### Appointments · `APPOINTMENT` / `C_APPOINTMENT` / `G_APPOINTMENT` / `O_APPOINTMENT`

| Method | Endpoint                                              | Permission                    |
| ------ | ------------------------------------------------------ | ------------------------------ |
| `GET`  | `/api/appointments?page&limit&search&filters`         | `APPOINTMENT` `can_view`      |
| `GET`  | `/api/appointments/consultation?page&limit&search&assigned_staff_id&appointment_date` | `C_APPOINTMENT` `can_view` |
| `GET`  | `/api/appointments/grooming?page&limit&search&assigned_staff_id&appointment_date` | `G_APPOINTMENT` `can_view` |
| `GET`  | `/api/appointments/operation?page&limit&search&assigned_staff_id&appointment_date` | `O_APPOINTMENT` `can_view` |
| `GET`  | `/api/appointments/:appointment_id`                   | `APPOINTMENT` `can_view`      |
| `POST` | `/api/appointments/add-appointment`                   | `APPOINTMENT` `can_create`    |
| `POST` | `/api/appointments/book-with-payment`                 | `APPOINTMENT` `can_create` (creates the appointment **and** its payment together; body also requires `payment_method` and, for GCash/Split, `gcash_reference_number` plus `cash_received`/`gcash_received` — see [Appointments](#appointments) and [Cart & Payments](#cart--payments)) |
| `PUT`  | `/api/appointments/:appointment_id/edit-appointment`  | `APPOINTMENT` `can_edit`      |
| `PUT`  | `/api/appointments/:appointment_id/cancel-appointment`| `APPOINTMENT` `can_delete` (soft delete) |
| `GET`  | `/api/appointment-services`                           | `APPOINTMENT` `can_view` (lookup) |
| `GET`  | `/api/appointment-staff`                              | `APPOINTMENT` `can_view` (lookup — every non-`Client` user) |
| `GET`  | `/api/appointment-grooming-tiers`                     | `APPOINTMENT` `can_view` (lookup — weight-tier price list) |

### Status codes

| Code  | Meaning                                                                       |
| ----- | ----------------------------------------------------------------------------- |
| `400` | Zod validation failure — body is `{ errors: { field: [msg] } }`               |
| `401` | No session, or session lacks `level_ids`                                      |
| `403` | Authenticated but the permission matrix denies the action                     |
| `404` | Resource not found / unmatched route                                          |
| `409` | Business-rule conflict (insufficient stock, cancelling a non-pending payment) |
| `429` | Auth rate limit exceeded (30 requests / 15 min)                               |

---

## Security Model

| Layer             | Implementation                                                                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Passwords**     | bcrypt, cost factor 10                                                                                                                                |
| **Sessions**      | Server-side in PostgreSQL; `httpOnly`, `SameSite=Lax` (dev) / `None` + `Secure` (prod); 24 h max age; regenerated on login                            |
| **CSRF**          | `csrf-csrf` double-submit, bound to the session identifier; token read from `x-csrf-token`; cookie name upgrades to `__Host-csrf-token` in production |
| **CORS**          | Single-origin allow-list from `CLIENT_URL`, `credentials: true`                                                                                       |
| **Headers**       | Helmet defaults                                                                                                                                       |
| **Rate limiting** | 30 requests / 15 minutes on `/api/auth`                                                                                                               |
| **SQL injection** | Parameterized queries throughout; filter columns restricted by allow-list                                                                             |
| **Uploads**       | 5 MB cap, format allow-list, MIME + size re-validated server-side after multer                                                                        |
| **Authorization** | `hasPermission` on every protected route — the frontend guard is convenience, not enforcement                                                         |

Every mutating client call fetches a fresh CSRF token immediately before the request (see `getCsrfToken()` in [`Client/src/api/http.js`](Client/src/api/http.js)).

---

## Frontend Conventions

- **Data loading** — React Router `loader`s call `queryClient.ensureQueryData`, so navigation is blocked until data resolves and TanStack Query owns the cache (5 min `staleTime`, 10 min `gcTime`, 1 retry).
- **Mutations** — React Router `action`s for form-driven flows (login, add/edit user, delete role); `useMutation` elsewhere.
- **Modals as routes** — Add/Edit/Delete dialogs are **child routes** lazily imported via `lazy: () => import(...)`, so a modal has its own URL, its own permission loader, and browser-back closes it.
- **Networking** — every request lives in [`Client/src/api/http.js`](Client/src/api/http.js). Components never call `fetch` directly. Errors are normalized into `Error` objects carrying `.code` and `.details`.
- **Tables** — every list page (Inventory, Payment, Users, Roles, Clients, Pet Records) is built from the same three primitives: [`DynamicGrid`](Client/src/components/ui/DynamicGrid.jsx) (search, column toggles, row actions), [`Pagination`](Client/src/components/ui/Pagination.jsx), and shared `usePagination` / `useDebouncedValue` hooks. Column definitions are centralized in [`Client/src/utils/COLUMNS.jsx`](Client/src/utils/COLUMNS.jsx).
- **Loading / error states** — list pages render [`QueryState`](Client/src/components/ui/QueryState.jsx) ahead of their grid, driven by TanStack Query's `isPending`/`isError`, instead of each page hand-rolling its own spinner/error markup.
- **Imports** — the `@` alias maps to `Client/src`, configured in both `vite.config.js` and `jsconfig.json`.
- **Styling** — Tailwind CSS 4 via the Vite plugin, shadcn-style primitives in `components/ui/`, `sonner` for toasts, `lucide-react` for icons. Design tokens (`--color-primary`, `--color-ring`, etc.) live in [`Client/src/index.css`](Client/src/index.css) under a Tailwind v4 `@theme` block — **indigo** is the single primary/brand accent (`Button`'s default variant reads `bg-primary`/`text-primary-foreground` from that token rather than a hardcoded color) — and dark mode is a `.dark` class toggle persisted to `localStorage`, flipped from the sun/moon control in `Navbar.jsx`.

---

## Deployment

**Frontend** — Vercel-ready: `Client/vercel.json` rewrites all paths to `/index.html` for SPA routing. Set `VITE_API_BASE_URL` and `VITE_API_AUTH_URL` to the deployed API origin at build time.

**Backend** — any Node host. Set `NODE_ENV=production`, which switches on:

- `app.set("trust proxy", 1)` — required for `Secure` cookies behind a load balancer
- `Secure` + `SameSite=None` session and CSRF cookies (cross-site cookies need both)
- the `__Host-csrf-token` cookie prefix

Provide `DATABASE_URL` for a managed PostgreSQL instance (SSL is enabled automatically on that path).

---

## Known Gaps / TODO

These are accurate as of this writing and worth knowing before extending the system:

- **No test suite.** `npm test` in `server/` is still the placeholder that exits 1.
