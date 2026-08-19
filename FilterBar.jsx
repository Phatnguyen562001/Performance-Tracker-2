import React from "react";
import { Filter, ChevronDown, RotateCcw } from "lucide-react";
import { PRIORITIES, STATUSES } from "../lib/constants";
import { classNames } from "../lib/timeUtils";
import { Badge, Field, inputClass } from "./ui";

/* =========================================================================
   FILTER BAR
   ========================================================================= */

export function FilterBar({ filters, setFilters, categories, assigners, departments, open, setOpen }) {
  function set(k, v) {
    setFilters((f) => ({ ...f, [k]: v }));
  }
  function reset() {
    setFilters({ category: "", subcategory: "", priority: "", status: "", assigner: "", department: "", from: "", to: "" });
  }
  const activeCount = Object.values(filters).filter(Boolean).length;
  const subcatOptions = filters.category
    ? categories.find((c) => c.name === filters.category)?.subcategories.map((s) => s.name) || []
    : [...new Set(categories.flatMap((c) => c.subcategories.map((s) => s.name)))];

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300"
      >
        <span className="flex items-center gap-2">
          <Filter size={14} />
          Filters{" "}
          {activeCount > 0 && (
            <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
              {activeCount} active
            </Badge>
          )}
        </span>
        <ChevronDown size={16} className={classNames("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 p-4 dark:border-slate-800 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Category">
            <select
              className={inputClass}
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value, subcategory: "" }))}
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subcategory">
            <select className={inputClass} value={filters.subcategory} onChange={(e) => set("subcategory", e.target.value)}>
              <option value="">All</option>
              {subcatOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select className={inputClass} value={filters.priority} onChange={(e) => set("priority", e.target.value)}>
              <option value="">All</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass} value={filters.status} onChange={(e) => set("status", e.target.value)}>
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Assigner">
            <select className={inputClass} value={filters.assigner} onChange={(e) => set("assigner", e.target.value)}>
              <option value="">All</option>
              {assigners.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Department">
            <select className={inputClass} value={filters.department} onChange={(e) => set("department", e.target.value)}>
              <option value="">All</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Deadline from">
            <input type="date" className={inputClass} value={filters.from} onChange={(e) => set("from", e.target.value)} />
          </Field>
          <Field label="Deadline to">
            <input type="date" className={inputClass} value={filters.to} onChange={(e) => set("to", e.target.value)} />
          </Field>
          <div className="flex items-end">
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <RotateCcw size={13} /> Clear filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

