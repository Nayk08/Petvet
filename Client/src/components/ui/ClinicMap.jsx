// Google Maps embed for the clinic address (no API key needed for this
// embed form). Used on the landing page and as the admin's preview.
export default function ClinicMap({ address, className = "" }) {
  if (!address) return null;
  const q = encodeURIComponent(address);
  return (
    <div className={`space-y-2 ${className}`}>
      <iframe
        title={`Map of ${address}`}
        src={`https://www.google.com/maps?q=${q}&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="w-full h-72 sm:h-96 rounded-xl border border-zinc-200 dark:border-zinc-800"
      />
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${q}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm font-medium text-green-700 dark:text-green-400 hover:underline"
      >
        Open in Google Maps →
      </a>
    </div>
  );
}
