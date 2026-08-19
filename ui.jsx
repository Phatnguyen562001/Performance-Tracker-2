import React from "react";
import { classNames } from "../lib/timeUtils";

/* =========================================================================
   SMALL UI ATOMS
   ========================================================================= */

export function Badge({ children, className, style }) {
  return (
    <span
      style={style}
      className={classNames("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", className)}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ pct, color = "#4f46e5" }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700/60 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, sub, accent = "text-indigo-600 dark:text-indigo-400" }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
        <Icon size={16} className={accent} />
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 dark:text-slate-50">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
      <Icon size={28} className="mb-3 text-slate-400" />
      <p className="font-medium text-slate-700 dark:text-slate-200">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

export function IconButton({ onClick, title, children, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      type="button"
      className={classNames(
        "inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800",
        danger && "hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
      )}
    >
      {children}
    </button>
  );
}

export function Field({ label, children, required }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-500/20";

