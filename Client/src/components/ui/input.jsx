  import * as React from "react";
  import { cn } from "@/lib/utils";

  function Input({ className, type, ...props }) {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(
          "h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-800 shadow-xs transition-colors outline-none",
          "placeholder:text-slate-400",
          "dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500",
          "focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-blue-500/20",
          "dark:focus-visible:border-blue-500 dark:focus-visible:bg-slate-900",
          "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-slate-700 dark:file:text-slate-300",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800",
          "aria-invalid:border-red-500 aria-invalid:ring-3 aria-invalid:ring-red-500/20",
          className,
        )}
        {...props}
      />
    );
  }

  export { Input };
