import { Loader2 } from "lucide-react";

export default function QueryState({
  isLoading,
  isError,
  error,
  loadingLabel = "Loading records...",
  errorLabel = "Error loading records",
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-xl shadow-xs dark:bg-slate-900 dark:border-slate-800">
        <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mb-2 dark:text-indigo-400" />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {loadingLabel}
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-16 bg-red-50/50 border border-red-200 rounded-xl text-red-600 text-xs font-medium dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400">
        <span>
          {errorLabel}
          {error?.message ? `: ${error.message}` : ""}
        </span>
      </div>
    );
  }

  return null;
}
