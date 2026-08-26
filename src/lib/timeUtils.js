/* =========================================================================
   UTILITIES
   ========================================================================= */

export const uid = () => Math.random().toString(36).slice(2, 10);

export function pad2(n) {
  return String(n).padStart(2, "0");
}
export function formatYMD(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
export function todayYMD() {
  return formatYMD(new Date());
}
export function parseYMD(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
export function toDateTimeLocalValue(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(
    date.getHours()
  )}:${pad2(date.getMinutes())}`;
}
export function formatDateDisplay(ymd) {
  if (!ymd) return "—";
  const d = parseYMD(ymd);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
export function formatClockTime(dateTimeLocalValue) {
  if (!dateTimeLocalValue) return "—";
  const d = new Date(dateTimeLocalValue);
  if (isNaN(d.getTime())) return "—";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
/** "3 days ago" once at least a full day has passed, otherwise "5 hours ago" —
    minutes are never shown, matching how coarse this staleness signal needs to be. */
export function formatRelativeTime(isoString) {
  if (!isoString) return null;
  const then = new Date(isoString);
  if (isNaN(then.getTime())) return null;
  const diffMs = Date.now() - then.getTime();
  if (diffMs < 0) return "Just now";
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays >= 1) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  if (diffHours >= 1) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  return "Just now";
}
export function monthKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
export function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}
export function formatHours(h) {
  if (!h) return "0h";
  return `${h.toFixed(1)}h`;
}
export function classNames(...arr) {
  return arr.filter(Boolean).join(" ");
}
export function softStyle(hex) {
  return { backgroundColor: `${hex}1A`, color: hex };
}
export function solidStyle(hex) {
  return { backgroundColor: hex, color: "#fff" };
}

/**
 * Business-hours engine: counts only the enabled work sessions (default
 * Mon-Fri, 08:00-12:00 & 13:00-17:00), excluding configured holidays.
 * The work sessions themselves are user-editable in Settings.
 */
export const DEFAULT_WORK_SESSIONS = [
  { id: "morning", label: "Morning", start: "08:00", end: "12:00", enabled: true },
  { id: "afternoon", label: "Afternoon", start: "13:00", end: "17:00", enabled: true },
];

export function parseHM(str) {
  const [h, m] = (str || "00:00").split(":").map(Number);
  return [h || 0, m || 0];
}

export function businessMinutesBetween(startVal, endVal, holidaySet, workSessions) {
  if (!startVal || !endVal) return 0;
  const start = new Date(startVal);
  const end = new Date(endVal);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 0;

  const windows = (workSessions || DEFAULT_WORK_SESSIONS)
    .filter((w) => w.enabled !== false)
    .map((w) => [...parseHM(w.start), ...parseHM(w.end)]);

  let total = 0;
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (cursor <= endDay) {
    const dow = cursor.getDay();
    const dateStr = formatYMD(cursor);
    if (dow !== 0 && dow !== 6 && !holidaySet.has(dateStr)) {
      for (const [sh, sm, eh, em] of windows) {
        const winStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), sh, sm);
        const winEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), eh, em);
        const overlapStart = winStart > start ? winStart : start;
        const overlapEnd = winEnd < end ? winEnd : end;
        if (overlapEnd > overlapStart) {
          total += (overlapEnd - overlapStart) / 60000;
        }
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

/** Plain elapsed minutes, including evenings / weekends / overtime. */
export function elapsedMinutesBetween(startVal, endVal) {
  if (!startVal || !endVal) return 0;
  const start = new Date(startVal);
  const end = new Date(endVal);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 0;
  return (end - start) / 60000;
}

/**
 * Minutes for a single session. A session marked `overtime: true` always
 * counts its full elapsed time — even while the task's "Count only Business
 * Hours" box stays ticked — because overtime work outside normal hours still
 * needs to be added, not eliminated.
 */
export function sessionMinutes(session, businessOnly, holidaySet, workSessions) {
  if (session.overtime) return elapsedMinutesBetween(session.start, session.end);
  return businessOnly
    ? businessMinutesBetween(session.start, session.end, holidaySet, workSessions)
    : elapsedMinutesBetween(session.start, session.end);
}

export function taskUsesBusinessHours(task) {
  return task.trackBusinessHours !== false; // default true for legacy/undefined
}
export function taskTotalMinutes(task, holidaySet, workSessions) {
  const businessOnly = taskUsesBusinessHours(task);
  return (task.sessions || []).reduce((sum, s) => sum + sessionMinutes(s, businessOnly, holidaySet, workSessions), 0);
}
export function taskTotalHours(task, holidaySet, workSessions) {
  return taskTotalMinutes(task, holidaySet, workSessions) / 60;
}
export function taskCompletionPct(task) {
  if (task.status === "Completed") return 100;
  if (task.subtasks && task.subtasks.length > 0) {
    const done = task.subtasks.filter((s) => s.done).length;
    return Math.round((done / task.subtasks.length) * 100);
  }
  return task.status === "In Progress" ? 50 : 0;
}
/** Currently overdue = still not done, and past its deadline. Completing a
    task clears this — but does NOT mean the task was never late, see below. */
export function isTaskOverdue(task) {
  if (!task.deadline || task.status === "Completed") return false;
  return task.deadline < todayYMD();
}

/** Was this task finished after its own deadline? Independent of whether it
    still counts as "overdue" today — this stays true forever once completed
    late, so lateness isn't erased just by ticking the task done. */
export function isTaskCompletedLate(task) {
  if (task.status !== "Completed" || !task.completedAt || !task.deadline) return false;
  return formatYMD(new Date(task.completedAt)) > task.deadline;
}
export function daysLate(task) {
  if (!isTaskCompletedLate(task)) return 0;
  const completedDay = formatYMD(new Date(task.completedAt));
  return Math.round((parseYMD(completedDay) - parseYMD(task.deadline)) / 86400000);
}

/** Looks up the default subtask checklist configured for a Category/Subcategory pair. */
export function getTemplateSubtasks(categories, categoryName, subcategoryName) {
  const cat = categories.find((c) => c.name === categoryName);
  const sub = cat?.subcategories.find((s) => s.name === subcategoryName);
  if (!sub?.template?.length) return [];
  return sub.template.map((title) => ({ id: uid(), title, done: false }));
}

/** Builds a { assignerName: departmentName } lookup used across filters and analytics. */
export function buildAssignerDeptMap(assigners) {
  const map = {};
  assigners.forEach((a) => {
    if (a.department) map[a.name] = a.department;
  });
  return map;
}


/* =========================================================================
   ANALYTICS PERIOD HELPERS
   ========================================================================= */

export function getPeriodRange(type, anchor) {
  if (type === "quarter") {
    const q = Math.floor(anchor.getMonth() / 3);
    return { start: new Date(anchor.getFullYear(), q * 3, 1), end: new Date(anchor.getFullYear(), q * 3 + 3, 1) };
  }
  return { start: new Date(anchor.getFullYear(), anchor.getMonth(), 1), end: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1) };
}
export function periodLabel(type, anchor) {
  if (type === "quarter") return `Q${Math.floor(anchor.getMonth() / 3) + 1} ${anchor.getFullYear()}`;
  return anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
export function shiftPeriod(type, anchor, dir) {
  const d = new Date(anchor);
  d.setMonth(d.getMonth() + dir * (type === "quarter" ? 3 : 1));
  return d;
}
export function inDateRange(date, range) {
  if (!date || isNaN(date.getTime())) return false;
  return date >= range.start && date < range.end;
}
export function getSubBuckets(type, anchor) {
  if (type === "quarter") {
    const q = Math.floor(anchor.getMonth() / 3);
    return Array.from({ length: 3 }, (_, i) => {
      const start = new Date(anchor.getFullYear(), q * 3 + i, 1);
      const end = new Date(anchor.getFullYear(), q * 3 + i + 1, 1);
      return { label: start.toLocaleDateString("en-GB", { month: "short" }), start, end };
    });
  }
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const buckets = [];
  for (let d = 1; d <= daysInMonth; d += 7) {
    const start = new Date(y, m, d);
    const end = new Date(y, m, Math.min(d + 7, daysInMonth + 1));
    buckets.push({ label: `Wk ${buckets.length + 1}`, start, end });
  }
  return buckets;
}


/* =========================================================================
   PER TASK-TYPE (SUBCATEGORY) PERFORMANCE HELPERS
   ========================================================================= */

export function median(sortedNums) {
  const n = sortedNums.length;
  if (n === 0) return 0;
  return n % 2 ? sortedNums[(n - 1) / 2] : (sortedNums[n / 2 - 1] + sortedNums[n / 2]) / 2;
}

/**
 * Groups COMPLETED tasks by (category, subcategory) and computes performance
 * stats independently per Task Type, instead of averaging everything together.
 * Includes every subcategory defined in `categories`, even with 0 completions,
 * plus any ad-hoc subcategory still referenced by legacy tasks.
 */
export function computeTypeStats(categories, tasks, holidaySet, workSchedule) {
  const groups = {};
  const ensure = (category, subcategory) => {
    const key = `${category}|||${subcategory}`;
    if (!groups[key]) groups[key] = { key, category, subcategory, tasks: [] };
    return groups[key];
  };
  categories.forEach((c) => c.subcategories.forEach((s) => ensure(c.name, s.name)));
  tasks
    .filter((t) => t.status === "Completed")
    .forEach((t) => ensure(t.category, t.subcategory).tasks.push(t));

  return Object.values(groups).map((g) => {
    const hours = g.tasks.map((t) => taskTotalHours(t, holidaySet, workSchedule)).sort((a, b) => a - b);
    const count = hours.length;
    const total = hours.reduce((s, v) => s + v, 0);
    return {
      key: g.key,
      category: g.category,
      subcategory: g.subcategory,
      tasks: g.tasks,
      count,
      avg: count ? total / count : 0,
      median: median(hours),
      min: count ? hours[0] : 0,
      max: count ? hours[count - 1] : 0,
      total,
    };
  });
}

/** Trailing buckets ending at "now" — used for per-type completion trend charts. */
export function buildTrailingBuckets(type, count) {
  const now = new Date();
  const buckets = [];
  if (type === "quarter") {
    const curQStart = Math.floor(now.getMonth() / 3) * 3;
    for (let i = count - 1; i >= 0; i--) {
      const totalMonths = now.getFullYear() * 12 + curQStart - i * 3;
      const y = Math.floor(totalMonths / 12);
      const m = ((totalMonths % 12) + 12) % 12;
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 3, 1);
      buckets.push({ label: `Q${Math.floor(m / 3) + 1} '${String(y).slice(2)}`, start, end });
    }
  } else {
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ label: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }), start: d, end: new Date(d.getFullYear(), d.getMonth() + 1, 1) });
    }
  }
  return buckets;
}

/** A stable "quote of the day" — same quote all day, cycles through the year. */
export const DAILY_QUOTES = [
  "Discipline is choosing between what you want now and what you want most.",
  "Small daily habits compound into results that feel sudden to everyone else.",
  "Do the hard task first. The rest of the day gets easier.",
  "Consistency beats intensity — show up again tomorrow.",
  "Well done is better than well said. — Benjamin Franklin",
  "The secret of getting ahead is getting started. — Mark Twain",
  "Details create the big picture. — Sanford I. Weill",
  "A goal without a plan is just a wish.",
  "Progress, not perfection.",
  "You don't have to see the whole staircase, just take the first step. — Martin Luther King Jr.",
  "Order and simplicity are the first steps toward mastery.",
  "Slow is smooth, smooth is fast.",
  "What gets measured gets managed. — Peter Drucker",
  "The best time to start was yesterday. The next best time is now.",
  "Focus on being productive instead of busy.",
  "Integrity is doing the right thing when no one is watching. — C.S. Lewis",
  "Every task finished is a promise kept — to yourself first.",
  "Clarity comes from action, not thought.",
  "Little by little, a little becomes a lot.",
  "Today's effort is tomorrow's ease.",
  "Precision today prevents problems tomorrow.",
  "Momentum is built one checked box at a time.",
  "Patience and persistence outlast talent that quits early.",
  "Take care of the minutes, and the hours will take care of themselves. — Lord Chesterfield",
];
export function getQuoteOfDay() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  return DAILY_QUOTES[((dayOfYear % DAILY_QUOTES.length) + DAILY_QUOTES.length) % DAILY_QUOTES.length];
}

