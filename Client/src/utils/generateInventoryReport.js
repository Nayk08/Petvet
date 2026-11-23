import autoTable from "jspdf-autotable";
import { formatDate } from "@/utils/COLUMNS";
import { BRAND, MARGIN, SUBTLE_HEAD, SUBTLE_FOOT, money, startReport } from "@/utils/pdfReport.js";

const STOCK_ORDER = ["High Stock", "Average Stock", "Low Stock", "Out of Stock"];

const FILTER_LABELS = {
  status_name: "Status",
  category_name: "Category",
  is_expired: "Expired",
  expiring_soon: "Expiring Soon",
};

// Plain-text summary of the active search/filters, so a printed copy says
// what it covers. Boolean filters ("true"/"false") read as Yes/No.
function describeCriteria({ search, filters }) {
  const parts = [];
  if (search?.trim()) parts.push(`Search: "${search.trim()}"`);
  for (const [key, label] of Object.entries(FILTER_LABELS)) {
    const raw = filters?.[key];
    const value = Array.isArray(raw) ? raw.join(",") : raw;
    if (!value) continue;
    const text = value
      .split(",")
      .map((v) => (v === "true" ? "Yes" : v === "false" ? "No" : v))
      .join(", ");
    parts.push(`${label}: ${text}`);
  }
  return parts.length ? parts.join("   |   ") : "All active products (no filters)";
}

const priceText = (r) => {
  const min = r.min_price ?? r.product_price;
  const max = r.max_price ?? min;
  if (min == null) return "-";
  return Number(min) === Number(max) ? money(min) : `${money(min)} -\n${money(max)}`;
};

const expiryText = (r) => {
  if (!r.product_expiry_date) return "-";
  const date = formatDate(r.product_expiry_date);
  if (r.is_expired) return `${date}\nEXPIRED`;
  if (r.expiring_soon) return `${date}\nExpiring soon`;
  return date;
};

// Downloads a PDF of the Inventory table's current view: same search and
// filters, every matching product (one row per product, batches merged).
export async function generateInventoryReport(rows, { search = "", filters = {} } = {}) {
  const { doc, startY, finish } = await startReport({
    title: "Inventory Report",
    criteria: describeCriteria({ search, filters }),
  });

  // ── Summary ───────────────────────────────────────────────────────────
  const byStatus = new Map(STOCK_ORDER.map((s) => [s, { count: 0, units: 0 }]));
  for (const r of rows) {
    const cur = byStatus.get(r.status_name) ?? { count: 0, units: 0 };
    cur.count += 1;
    cur.units += Number(r.product_quantity ?? 0);
    byStatus.set(r.status_name, cur);
  }
  const totalUnits = rows.reduce((s, r) => s + Number(r.product_quantity ?? 0), 0);

  autoTable(doc, {
    startY,
    margin: { left: MARGIN },
    tableWidth: 120,
    head: [["Stock level", "Products", "Units"]],
    body: [...byStatus.entries()]
      .filter(([, v]) => v.count)
      .map(([s, v]) => [s, String(v.count), v.units.toLocaleString("en-US")]),
    foot: [["All products", String(rows.length), totalUnits.toLocaleString("en-US")]],
    styles: { fontSize: 8.5, cellPadding: 1.8 },
    headStyles: SUBTLE_HEAD,
    footStyles: SUBTLE_FOOT,
    columnStyles: { 1: { halign: "center" }, 2: { halign: "right" } },
    theme: "grid",
  });
  const leftEnd = doc.lastAutoTable.finalY;

  const expired = rows.filter((r) => r.is_expired).length;
  const expiringSoon = rows.filter((r) => r.expiring_soon && !r.is_expired).length;
  const needsRestock = rows.filter((r) => ["Low Stock", "Out of Stock"].includes(r.status_name)).length;

  autoTable(doc, {
    startY,
    margin: { left: MARGIN + 130 },
    tableWidth: 110,
    head: [["Needs attention", "Products"]],
    body: [
      ["Has an expired batch", String(expired)],
      ["Expiring within 5 months", String(expiringSoon)],
      ["Low or out of stock", String(needsRestock)],
    ],
    styles: { fontSize: 8.5, cellPadding: 1.8 },
    headStyles: SUBTLE_HEAD,
    columnStyles: { 1: { halign: "center" } },
    theme: "grid",
  });
  const summaryEnd = Math.max(leftEnd, doc.lastAutoTable.finalY);

  // ── Products ──────────────────────────────────────────────────────────
  const STATUS_COL = 5;
  const EXPIRY_COL = 7;
  autoTable(doc, {
    startY: summaryEnd + 8,
    margin: { left: MARGIN, right: MARGIN, top: 16, bottom: 16 },
    head: [["#", "Product", "Category", "Batches", "Quantity", "Stock Level", "Price", "Earliest Expiry"]],
    body: rows.map((r, i) => [
      String(i + 1),
      [r.product_name, r.brand, r.unit].filter(Boolean).join("\n"),
      r.category_name ?? "Uncategorized",
      String(r.in_stock_batch_count ?? r.batch_count ?? 1),
      Number(r.product_quantity ?? 0).toLocaleString("en-US"),
      r.status_name ?? "-",
      priceText(r),
      expiryText(r),
    ]),
    styles: { fontSize: 8.5, cellPadding: 2, valign: "middle", overflow: "linebreak" },
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: "center", cellWidth: 9 },
      1: { fontStyle: "bold", cellWidth: 70 },
      3: { halign: "center" },
      4: { halign: "right" },
      6: { halign: "right" },
    },
    didParseCell: (data) => {
      if (data.section === "head" && [4, 6].includes(data.column.index)) data.cell.styles.halign = "right";
      if (data.section !== "body") return;
      const row = rows[data.row.index];
      if (data.column.index === STATUS_COL) {
        if (row.status_name === "Out of Stock") data.cell.styles.textColor = [185, 28, 28];
        else if (row.status_name === "Low Stock") data.cell.styles.textColor = [180, 83, 9];
      }
      if (data.column.index === EXPIRY_COL) {
        if (row.is_expired) data.cell.styles.textColor = [185, 28, 28];
        else if (row.expiring_soon) data.cell.styles.textColor = [180, 83, 9];
      }
    },
    foot: [["", `${rows.length} product${rows.length === 1 ? "" : "s"}`, "", "", totalUnits.toLocaleString("en-US"), "", "", ""]],
    footStyles: { ...SUBTLE_FOOT },
    showFoot: "lastPage",
  });

  finish(`inventory-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
