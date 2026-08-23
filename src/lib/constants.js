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
export const PRIORITY_RANK = { High: 3, Medium: 2, Low: 1 };

export const SORT_OPTIONS = [
  { value: "", label: "Default order" },
  { value: "deadline_asc", label: "Deadline — soonest first" },
  { value: "deadline_desc", label: "Deadline — latest first" },
  { value: "priority_desc", label: "Priority — High to Low" },
  { value: "priority_asc", label: "Priority — Low to High" },
  { value: "created_desc", label: "Newest created" },
  { value: "created_asc", label: "Oldest created" },
  { value: "title_asc", label: "Title — A to Z" },
];

/** Quick sort for the task list — a display-order preference only, separate
    from the Filters panel (which narrows down which tasks show at all). */
export function sortTasks(tasks, sortBy) {
  if (!sortBy) return tasks;
  const arr = [...tasks];
  switch (sortBy) {
    case "deadline_asc":
      return arr.sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
    case "deadline_desc":
      return arr.sort((a, b) => (b.deadline || "0000").localeCompare(a.deadline || "0000"));
    case "priority_desc":
      return arr.sort((a, b) => (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0));
    case "priority_asc":
      return arr.sort((a, b) => (PRIORITY_RANK[a.priority] || 0) - (PRIORITY_RANK[b.priority] || 0));
    case "created_desc":
      return arr.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    case "created_asc":
      return arr.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
    case "title_asc":
      return arr.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return arr;
  }
}
export const PALETTE = ["#4f46e5", "#0d9488", "#d97706", "#e11d48", "#0ea5e9", "#8b5cf6", "#65a30d", "#db2777", "#0891b2", "#78716c"];

// A "round" is one step in a back-and-forth workflow (e.g. contract review
// cycles) tracked inside a single task instead of splitting it into many.
// Type is free text (not a fixed list) — these are just starting suggestions.
export const ROUND_TYPE_SUGGESTIONS = ["Sent", "Received", "Internal", "Escalated"];

/** Deterministic color for any free-text label (e.g. a round's Type), so
    values the user types stay visually distinct without needing a fixed list. */
export function stringToColor(str) {
  if (!str) return "#64748b";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export const STORAGE_KEYS = {
  tasks: "lpt_tasks_v2",
  categories: "lpt_categories_v1",
  holidays: "lpt_holidays_v1",
  theme: "lpt_theme_v1",
  departments: "lpt_departments_v1",
  assigners: "lpt_assigners_v1",
  workSchedule: "lpt_work_schedule_v1",
};

