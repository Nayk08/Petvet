// Mirrors the server's pricing (Appointment_Model.js effectivePriceSql) so
// booking screens can show the price before booking — the server re-prices.
// Grooming rows carry `grooming_tiers`: the smallest tier whose max weight
// covers the pet wins (null max = no upper limit). No weight / no tier fits
// → price null = staff set it at the clinic.
export function priceForPet(service, weightKg) {
  if (!service) return { price: null, tier: null };
  if (!service.grooming_tiers) {
    return { price: service.service_price ?? null, tier: null };
  }
  if (weightKg == null || weightKg === "") return { price: null, tier: null };
  const w = Number(weightKg);
  const tier = [...service.grooming_tiers]
    .sort((a, b) => (a.max_weight_kg == null) - (b.max_weight_kg == null) || a.max_weight_kg - b.max_weight_kg)
    .find((t) => t.max_weight_kg == null || Number(t.max_weight_kg) >= w);
  return tier ? { price: tier.price, tier } : { price: null, tier: null };
}

const peso = (n) => `₱${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

// "₱420.00 – ₱1,100.00" for a Grooming card that isn't tied to a pet yet.
export function tierPriceRange(tiers) {
  if (!tiers?.length) return null;
  const prices = tiers.map((t) => Number(t.price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? peso(min) : `${peso(min)} – ${peso(max)}`;
}
