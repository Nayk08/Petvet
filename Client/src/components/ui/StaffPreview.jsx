import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Star, UserRound } from "lucide-react";

export function Stars({ value, size = 14 }) {
  const rounded = Math.round(value ?? 0);
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${value ?? 0} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= rounded ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"}
        />
      ))}
    </span>
  );
}

// Booking forms (client portal + staff Book Appointment): the picked
// groomer/vet's photo, name, role and client rating, with their latest
// reviews one click away. fetchReviews(users_id, { signal }) differs per
// side: the portal gets public reviews only, staff get all of them.
export default function StaffPreview({ staff, fetchReviews, queryScope = "staff" }) {
  const [showReviews, setShowReviews] = useState(false);
  const { data: reviews, isPending, isError } = useQuery({
    queryKey: [queryScope, "staff-reviews", staff.users_id],
    queryFn: ({ signal }) => fetchReviews(staff.users_id, { signal }),
    enabled: showReviews && staff.rating_count > 0,
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
      <div className="flex items-center gap-3">
        {staff.user_picture ? (
          <img
            src={staff.user_picture}
            alt={staff.user_name}
            className="size-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
          />
        ) : (
          <span className="size-12 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
            <UserRound size={22} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900 dark:text-white truncate">{staff.user_name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{staff.user_level?.trim()}</p>
          {staff.rating_count > 0 ? (
            <p className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-600 dark:text-slate-300">
              <Stars value={staff.avg_rating} />
              <span>
                <strong className="text-slate-900 dark:text-white">{staff.avg_rating.toFixed(1)}</strong> ·{" "}
                {staff.rating_count} {staff.rating_count === 1 ? "rating" : "ratings"}
              </span>
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 italic">No ratings yet</p>
          )}
        </div>
      </div>

      {staff.rating_count > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowReviews((v) => !v)}
            aria-expanded={showReviews}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {showReviews ? "Hide reviews" : "See recent reviews"}
            <ChevronDown size={14} className={`transition-transform ${showReviews ? "rotate-180" : ""}`} />
          </button>
          {showReviews && (
            <div className="mt-2 space-y-2">
              {isPending ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">Loading reviews...</p>
              ) : isError ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">Couldn't load reviews.</p>
              ) : reviews.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">No public reviews yet.</p>
              ) : (
                reviews.map((r) => (
                  <div
                    key={r.feedback_id}
                    className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Stars value={r.staff_rating} size={12} />
                      <span className="text-[11px] text-slate-400">
                        {new Date(String(r.date_created).replace(" ", "T")).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {r.comment && (
                      <p className="mt-1 text-xs italic text-slate-600 dark:text-slate-300">"{r.comment}"</p>
                    )}
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {r.client_first_name} & {r.pets_name} · {r.service_name}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
