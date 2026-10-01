import React from "react";

// A small in-page tab bar — e.g. switching a module's list between its
// active records and its soft-deleted Archive, without a route change.
export default function ModuleTabs({ tabs, active, onChange }) {
  return (
    <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
            active === tab.value
              ? "border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
