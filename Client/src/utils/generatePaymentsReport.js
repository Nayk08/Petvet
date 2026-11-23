import autoTable from "jspdf-autotable";
import { formatDateTime } from "@/utils/COLUMNS";
import { BRAND, MARGIN, SUBTLE_HEAD, SUBTLE_FOOT, money, startReport } from "@/utils/pdfReport.js";

const PAYMENT_TYPE_LABELS = {
  INV: "Product Sale (INV)",
  APT: "Clinic Service (APT)",
};

// Order the status summary is printed in.
const STATUS_ORDER = [
  "Completed",
  "Partially Paid",
  "Awaiting Verification",
  "Pending",
  "Refund Needed",
  "Cancelled",
];

// Describes the active search/filters as plain text so the report is
// self-contained — someone reading a printed/emailed copy later can still
// tell what it does and doesn't include, without the app open next to it.
function describeCriteria({ search, filters }) {
  const parts = [];
  if (search?.trim()) parts.push(`Search: "${search.trim()}"`);

  const status = filters?.payment_status_name;
  if (status) parts.push(`Status: ${status.split(",").join(", ")}`);

  const type = filters?.payment_type;
  if (type) {
    const labels = type
      .split(",")
      .map((t) => PAYMENT_TYPE_LABELS[t] ?? t)
      .join(", ");
    parts.push(`Type: ${labels}`);
  }

  const dateFrom = filters?.payment_date_from;
  const dateTo = filters?.payment_date_to;
  if (dateFrom || dateTo) {
    parts.push(`Date: ${dateFrom || "start"} to ${dateTo || "today"}`);
  }

  return parts.length ? parts.join("   |   ") : "All payments (no filters)";
}

// Method cell: a Split payment shows how much went each way.
function methodText(row) {
  if (row.payment_method === "Split") {
    return `Split\nCash ${money(row.cash_amount)}\nGCash ${money(row.gcash_amount)}`;
  }
  return row.payment_method ?? "-";
}

// Cash vs GCash actually received on a Completed payment.
function cashGcash(row) {
  if (row.payment_method === "Split") {
    return [Number(row.cash_amount ?? 0), Number(row.gcash_amount ?? 0)];
  }
  if (row.payment_method === "GCash") return [0, Number(row.total_amount ?? 0)];
  if (row.payment_method === "Cash") return [Number(row.total_amount ?? 0), 0];
  return [0, 0];
}

// Generates and downloads a PDF listing exactly what the Payment page's
// table is currently showing — same rows the active search/filters would
// return, not scoped to a separate report-only date range.
export async function generatePaymentsReport(rows, { search = "", filters = {} } = {}) {
  const { doc, startY, finish } = await startReport({
    title: "Payments Report",
    criteria: describeCriteria({ search, filters }),
  });

  // ── Summary ───────────────────────────────────────────────────────────
  const byStatus = new Map();
  for (const row of rows) {
    const s = row.payment_status_name ?? "Unknown";
    const cur = byStatus.get(s) ?? { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += Number(row.total_amount ?? 0);
    byStatus.set(s, cur);
  }
  const statusRows = [...byStatus.entries()].sort(
    ([a], [b]) =>
      (STATUS_ORDER.indexOf(a) + 1 || 99) - (STATUS_ORDER.indexOf(b) + 1 || 99),
  );

  const completed = rows.filter((r) => r.payment_status_name === "Completed");
  const [cashTotal, gcashTotal] = completed.reduce(
    ([c, g], r) => {
      const [rc, rg] = cashGcash(r);
      return [c + rc, g + rg];
    },
    [0, 0],
  );
  const completedTotal = completed.reduce((s, r) => s + Number(r.total_amount ?? 0), 0);

  autoTable(doc, {
    startY,
    margin: { left: MARGIN },
    tableWidth: 120,
    head: [["By status", "Count", "Amount"]],
    body: statusRows.map(([s, v]) => [s, String(v.count), money(v.amount)]),
    foot: [["All payments", String(rows.length), money(rows.reduce((s, r) => s + Number(r.total_amount ?? 0), 0))]],
    styles: { fontSize: 8.5, cellPadding: 1.8 },
    headStyles: SUBTLE_HEAD,
    footStyles: SUBTLE_FOOT,
    columnStyles: { 1: { halign: "center" }, 2: { halign: "right" } },
    theme: "grid",
  });
  const statusEndY = doc.lastAutoTable.finalY;

  autoTable(doc, {
    startY,
    margin: { left: MARGIN + 130 },
    tableWidth: 110,
    head: [["Collected (Completed only)", "Amount"]],
    body: [
      ["Cash", money(cashTotal)],
      ["GCash", money(gcashTotal)],
    ],
    foot: [["Total collected", money(completedTotal)]],
    styles: { fontSize: 8.5, cellPadding: 1.8 },
    headStyles: SUBTLE_HEAD,
    footStyles: { fillColor: [236, 253, 245], textColor: [4, 120, 87], fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" } },
    theme: "grid",
  });
  const summaryEndY = Math.max(statusEndY, doc.lastAutoTable.finalY);

  // ── Transactions ──────────────────────────────────────────────────────
  autoTable(doc, {
    startY: summaryEndY + 8,
    margin: { left: MARGIN, right: MARGIN, top: 16, bottom: 16 },
    head: [["#", "Control No.", "Type", "Date & Time", "Method", "GCash Ref.", "Handled By", "Status", "Amount"]],
    body: rows.map((row, i) => [
      String(i + 1),
      row.control_number ?? "-",
      row.appointment_id ? "Clinic Service" : "Product Sale",
      formatDateTime(row.date_updated ?? row.date_created) || "-",
      methodText(row),
      row.gcash_reference_number ?? "-",
      row.updated_by ?? row.created_by ?? "-",
      row.payment_status_name ?? "-",
      money(row.total_amount),
    ]),
    styles: { fontSize: 8.5, cellPadding: 2, valign: "middle", overflow: "linebreak" },
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: "center", cellWidth: 9 },
      1: { fontStyle: "bold" },
      8: { halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "head" && data.column.index === 8) data.cell.styles.halign = "right";
      // Dim payments that brought no money in.
      if (data.section === "body" && ["Cancelled", "Refund Needed"].includes(data.row.raw[7])) {
        data.cell.styles.textColor = 140;
      }
    },
    foot: [["", "", "", "", "", "", "", `${rows.length} payment${rows.length === 1 ? "" : "s"}`, money(rows.reduce((s, r) => s + Number(r.total_amount ?? 0), 0))]],
    footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: "bold", halign: "right" },
    showFoot: "lastPage",
  });

  finish(`payments-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
