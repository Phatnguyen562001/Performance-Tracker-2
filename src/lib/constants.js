/* =========================================================================
   CONSTANTS
   ========================================================================= */

export const PRIORITIES = ["High", "Medium", "Low"];
export const STATUSES = ["Not Started", "In Progress", "Waiting", "Completed"];
export const MAX_SUBTASKS = 10;

/* One vibrant palette used by EVERY screen (board, kanban, dashboard, charts, calendar). */
export const STATUS_COLORS = {
  "Not Started": "#a1a5b3",
  "In Progress": "#fdab3d",
  Waiting: "#579bfc",
  Completed: "#00c875",
};
export const PRIORITY_COLORS = { Low: "#579bfc", Medium: "#5559df", High: "#401694" };
export const PRIORITY_HEX = PRIORITY_COLORS;

// Solid "pill" styles (literal class names so Tailwind generates them).
export const STATUS_STYLES = {
  "Not Started": "bg-[#a1a5b3] text-white border-transparent",
  "In Progress": "bg-[#fdab3d] text-white border-transparent",
  Waiting: "bg-[#579bfc] text-white border-transparent",
  Completed: "bg-[#00c875] text-white border-transparent",
};
export const PRIORITY_STYLES = {
  High: "bg-[#401694] text-white border-transparent",
  Medium: "bg-[#5559df] text-white border-transparent",
  Low: "bg-[#579bfc] text-white border-transparent",
};
export const PRIORITY_DOT = { High: "bg-[#401694]", Medium: "bg-[#5559df]", Low: "bg-[#579bfc]" };

export const PRIORITY_RANK = { High: 3, Medium: 2, Low: 1 };

export const SORT_OPTIONS = [
  { value: "", label: "Default order" },
  { value: "deadline_asc", label: "Deadline — soonest first" },
  { value: "deadline_desc", label: "Deadline — latest first" },
  { value: "received_desc", label: "Received — newest first" },
  { value: "received_asc", label: "Received — oldest first" },
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
    case "received_asc":
      return arr.sort((a, b) => (a.receivedDate || (a.createdAt || "").slice(0, 10) || "9999").localeCompare(b.receivedDate || (b.createdAt || "").slice(0, 10) || "9999"));
    case "received_desc":
      return arr.sort((a, b) => (b.receivedDate || (b.createdAt || "").slice(0, 10) || "0000").localeCompare(a.receivedDate || (a.createdAt || "").slice(0, 10) || "0000"));
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
export const PALETTE = ["#579bfc", "#00c875", "#fdab3d", "#e2445c", "#a25ddc", "#0086c0", "#ff642e", "#cab641", "#037f4c", "#bb3354"];

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
  everydayTasks: "lpt_everyday_tasks_v1",
  everydayCompletions: "lpt_everyday_completions_v1",
  events: "lpt_events_v1",
};

