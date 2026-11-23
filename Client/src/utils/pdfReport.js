import { jsPDF } from "jspdf";
import { formatDateTime } from "@/utils/COLUMNS";
import { queryClient, fetchCurrentUser } from "@/api/http";
import petvetLogo from "@/assets/petvet_icon.svg";

// Shared look for the PDF reports (Payments, Inventory): landscape page,
// PetVet logo + wordmark header, filters line, "Prepared by" block at the
// end, "Page x of y" footer.

export const BRAND = [79, 70, 229]; // indigo, same as the app's primary buttons
export const MARGIN = 14;
export const SUBTLE_HEAD = { fillColor: [241, 245, 249], textColor: 60, fontStyle: "bold" };
export const SUBTLE_FOOT = { fillColor: [241, 245, 249], textColor: 20, fontStyle: "bold" };

const PET_RED = [220, 38, 38]; // sidebar wordmark: "Pet" red-600
const VET_GREEN = [5, 150, 105]; // "Vet" emerald-600

// jsPDF's built-in font has no peso sign, so amounts use "PHP".
export const money = (v) =>
  `PHP ${Number(v ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// jsPDF can't draw SVG, so rasterize the logo to a PNG data URL once.
let logoPng;
function loadLogoPng() {
  logoPng ??= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      canvas.getContext("2d").drawImage(img, 0, 0, size, size);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null); // report still generates, just without the logo
    img.src = petvetLogo;
  }).catch(() => null);
  return logoPng;
}

// Who is generating the report (the logged-in staff member).
async function loadPreparedBy() {
  try {
    const data = await queryClient.fetchQuery({
      queryKey: ["currentUser"],
      queryFn: ({ signal }) => fetchCurrentUser({ signal }),
      staleTime: 1000 * 60 * 5,
      retry: false, // a failed lookup shouldn't hold up the download
    });
    const user = data?.user;
    return { name: user?.name || user?.email || "Unknown user", role: user?.role?.trim() || "" };
  } catch {
    return { name: "Unknown user", role: "" };
  }
}

// New landscape doc with the header drawn. Resolves to { doc, startY,
// finish }: draw tables from startY, then call finish(filename) to add the
// "Prepared by" block, page footers, and download.
export async function startReport({ title, criteria }) {
  const [logo, preparedBy] = await Promise.all([
    typeof document === "undefined" ? null : loadLogoPng(),
    loadPreparedBy(),
  ]);

  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date();
  const generatedAt = formatDateTime(now);
  const generatedDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const generatedTime = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

  // Logo + "PetVet" wordmark + clinic line
  const logoSize = 16;
  if (logo) doc.addImage(logo, "PNG", MARGIN, 8, logoSize, logoSize);
  const textX = MARGIN + (logo ? logoSize + 4 : 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...PET_RED);
  doc.text("Pet", textX, 17);
  doc.setTextColor(...VET_GREEN);
  doc.text("Vet", textX + doc.getTextWidth("Pet"), 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(110);
  doc.text("PetVet Cycle Animal and Grooming Center", textX, 22.5);

  // Report title + generated time (right side)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text(title, pageWidth - MARGIN, 15, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated ${generatedAt}`, pageWidth - MARGIN, 21, { align: "right" });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, 27, pageWidth - MARGIN, 27);

  const filterLines = doc.splitTextToSize(`Filters: ${criteria}`, pageWidth - MARGIN * 2);
  doc.text(filterLines, MARGIN, 33);

  function finish(filename) {
    // "Prepared by" block after the last table; new page if it won't fit.
    const blockHeight = 38;
    let y = (doc.lastAutoTable?.finalY ?? 40) + 12;
    if (y + blockHeight > pageHeight - 16) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Prepared by", MARGIN, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20);
    doc.text(preparedBy.name, MARGIN, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    if (preparedBy.role) doc.text(preparedBy.role, MARGIN, y + 11);
    doc.text(`Date generated: ${generatedDate}`, MARGIN, y + 16);
    doc.text(`Time generated: ${generatedTime}`, MARGIN, y + 21);
    doc.setDrawColor(150);
    doc.line(MARGIN, y + 32, MARGIN + 70, y + 32);
    doc.setFontSize(8);
    doc.text("Signature", MARGIN, y + 36);

    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text(
        `PetVet - ${title} - Generated by ${preparedBy.name} on ${generatedAt}`,
        MARGIN,
        pageHeight - 8,
      );
      doc.text(`Page ${p} of ${pages}`, pageWidth - MARGIN, pageHeight - 8, { align: "right" });
    }
    doc.save(filename);
  }

  return { doc, startY: 35 + filterLines.length * 4, finish };
}
