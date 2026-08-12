/* =========================================================================
   CONSTANTS
   ========================================================================= */

export const PRIORITIES = ["High", "Medium", "Low"];
export const STATUSES = ["Not Started", "In Progress", "Waiting", "Completed"];
export const MAX_SUBTASKS = 10;

export const PRIORITY_STYLES = {
  High: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
  Medium:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
};
export const PRIORITY_DOT = { High: "bg-rose-500", Medium: "bg-amber-500", Low: "bg-emerald-500" };

export const STATUS_STYLES = {
  "Not Started":
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30",
  "In Progress":
    "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30",
  Waiting:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  Completed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
};

export const PRIORITY_HEX = { High: "#e11d48", Medium: "#d97706", Low: "#10b981" };
export const PALETTE = ["#4f46e5", "#0d9488", "#d97706", "#e11d48", "#0ea5e9", "#8b5cf6", "#65a30d", "#db2777", "#0891b2", "#78716c"];

export const STORAGE_KEYS = {
  tasks: "lpt_tasks_v2",
  categories: "lpt_categories_v1",
  holidays: "lpt_holidays_v1",
  theme: "lpt_theme_v1",
  departments: "lpt_departments_v1",
  assigners: "lpt_assigners_v1",
};

