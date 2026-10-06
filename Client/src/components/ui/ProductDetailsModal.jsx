import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const peso = (v) => `₱${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

function formatDate(value) {
  if (!value) return null;
  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Full product sheet (Products page, landing page). `product` is a grouped
// product row: name, brand, purpose, dosage, unit, description, category,
// min/max price (or product_price), nearest expiry, stock (optional).
export default function ProductDetailsModal({ product, onClose, showStock = true }) {
  if (!product) return null;

  const min = product.min_price ?? product.product_price;
  const max = product.max_price ?? product.product_price;
  const price = min == null ? null : Number(min) === Number(max) ? peso(min) : `${peso(min)} – ${peso(max)}`;
  const stock = product.sellable_quantity ?? product.product_quantity;

  const rows = [
    ["Brand", product.brand],
    ["Category", product.category_name],
    ["Dosage / Strength", product.dosage],
    ["Unit / Form", product.unit],
    ["Price", price],
    ["Expiry date", formatDate(product.product_expiry_date)],
    showStock && stock != null ? ["In stock", `${stock}`] : null,
  ].filter((r) => r && r[1]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{product.product_name}</DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            {product.brand ? `by ${product.brand}` : "Product details"}
          </DialogDescription>
        </DialogHeader>

        {product.product_image && (
          <img
            src={product.product_image}
            alt={product.product_name}
            className="w-full max-h-56 object-contain rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
          />
        )}

        <dl className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-3 py-2">
              <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
              <dd className="font-medium text-right">{value}</dd>
            </div>
          ))}
        </dl>

        {product.purpose && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Purpose / What it's for
            </p>
            <p className="text-sm whitespace-pre-line">{product.purpose}</p>
          </div>
        )}
        {product.description && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Description / Notes
            </p>
            <p className="text-sm whitespace-pre-line">{product.description}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
