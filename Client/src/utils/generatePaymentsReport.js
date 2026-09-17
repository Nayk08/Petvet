import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "@/utils/COLUMNS";

const PAYMENT_TYPE_LABELS = {
  INV: "Invoice (INV)",
  APT: "Appointment (APT)",
};

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
    parts.push(`Date: ${dateFrom || "…"} to ${dateTo || "…"}`);
  }

  return parts.length ? parts.join("   |   ") : "All payments";
}

// Generates and downloads a PDF listing exactly what the Payment page's
// table is currently showing — same rows the active search/filters would
// return, not scoped to a separate report-only date range.
export function generatePaymentsReport(rows, { search = "", filters = {} } = {}) {
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(16);
  doc.text("Payments Report", 14, 16);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 22);
  doc.text(describeCriteria({ search, filters }), 14, 27);

  autoTable(doc, {
    startY: 33,
    head: [["Control No.", "Payment Date", "Amount", "Method", "Status"]],
    body: rows.map((row) => [
      row.control_number ?? "—",
      formatDate(row.date_created) ?? "—",
      row.total_amount != null
        ? `PHP ${Number(row.total_amount).toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}`
        : "—",
      row.payment_method ?? "—",
      row.payment_status_name ?? "—",
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229] },
    foot: [
      [
        "",
        "",
        `Total: PHP ${rows
          .reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0)
          .toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        "",
        `${rows.length} transaction${rows.length === 1 ? "" : "s"}`,
      ],
    ],
    footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: "bold" },
  });

  doc.save(`payments-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
