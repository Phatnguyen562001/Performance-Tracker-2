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
  return { backgroundColor: hex, color: "#fff" };
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
  if (ballOf(task) === "boss") return false; // clock paused while the supervisor holds it
  if (task.deadlineTime) return deadlineMoment(task) < new Date();
  return task.deadline < todayYMD();
}

/** Exact moment a task is due. With no time set, the whole deadline day counts. */
export function deadlineMoment(task) {
  const [y, m, d] = (task.deadline || "").split("-").map(Number);
  if (!y) return null;
  const [hh, mm] = task.deadlineTime ? task.deadlineTime.split(":").map(Number) : [23, 59];
  return new Date(y, m - 1, d, hh, mm, 59);
}

export function nowHM() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** received + N hours (exact elapsed time) -> { deadline: "YYYY-MM-DD", deadlineTime: "HH:MM" } */
export function computeAutoDeadline(receivedDate, receivedTime, hours, task) {
  if (task) {
    const x = firstDeadlineFor({ ...task }, receivedDate, receivedTime);
    return { deadline: x.deadline, deadlineTime: x.deadlineTime };
  }
  const [y, m, d] = (receivedDate || todayYMD()).split("-").map(Number);
  const [hh, mm] = (receivedTime || "00:00").split(":").map(Number);
  const dt = new Date(y, m - 1, d, hh, mm);
  dt.setMinutes(dt.getMinutes() + Math.round(Number(hours) * 60));
  return { deadline: formatYMD(dt), deadlineTime: `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}` };
}

export function formatDateTimeDisplay(ymd, hm) {
  if (!ymd) return "—";
  return hm ? `${formatDateDisplay(ymd)}, ${hm}` : formatDateDisplay(ymd);
}

/** Was this task finished after its own deadline? Independent of whether it
    still counts as "overdue" today — this stays true forever once completed
    late, so lateness isn't erased just by ticking the task done. */
export function isTaskCompletedLate(task) {
  if (hasCycle(task)) return task.status === "Completed" && legsOf(task).some((l) => l.kind === "mine" && l.kpi !== false && l.ok === false);
  if (task.status !== "Completed" || !task.completedAt || !task.deadline) return false;
  if (task.deadlineTime) return new Date(task.completedAt) > deadlineMoment(task);
  return formatYMD(new Date(task.completedAt)) > task.deadline;
}
/** "2d" when a day or more late, otherwise "5h". */
export function lateText(task) {
  if (!isTaskCompletedLate(task)) return "";
  if (hasCycle(task)) {
    const bad = legsOf(task).find((l) => l.kind === "mine" && l.kpi !== false && l.ok === false);
    return bad ? `R${bad.n}` : "";
  }
  const days = daysLate(task);
  if (days >= 1) return `${days}d`;
  const hrs = Math.max(1, Math.ceil((new Date(task.completedAt) - deadlineMoment(task)) / 3600000));
  return `${hrs}h`;
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



/** Date the task was received. Older tasks (before this field existed) fall
 *  back to the day they were created in the app. */
export function getReceivedDate(task) {
  if (!task) return "";
  if (task.receivedDate) return task.receivedDate;
  return task.createdAt ? formatYMD(new Date(task.createdAt)) : "";
}


/** A subtask's status. Older subtasks only have `done`; if the tick box and
 *  the status ever disagree (e.g. ticked in the task form), the tick wins. */
export function subtaskStatus(sub) {
  if (sub.status && (sub.status === "Completed") === !!sub.done) return sub.status;
  if (sub.done) return "Completed";
  return sub.status && sub.status !== "Completed" ? sub.status : "Not Started";
}


/* =========================================================================
   REVIEW WORKFLOW — configurable "Ball" (who currently holds the task)
   -------------------------------------------------------------------------
   Settings (cloud field `workflow`) define:
     scope      which categories / subcategories use Ball
     stages     ordered holders, e.g. "With me" (my clock runs) and
                "With supervisor" (my clock paused), each with: label, colour,
                mine (clock runs), status set on entry, newDeadline, kpi
     limits     hours for re-review (2nd round) and later rounds
     overrides  per category / subcategory: first, review, later, business
     business   count business hours (office schedule + holidays) instead of
                continuous hours
   A task stores only its own events:
     task.handoffs = [{id, type:"move", to: stageId|"done", at: ISO, mine,
                       limitH (leaving a "mine" stage), nextLimitH/biz/kpi
                       (entering a "mine" stage)}]
   Old v8 events ("sent"/"returned"/"approved") are converted on the fly.
   ========================================================================= */

export const DONE_STAGE = { id: "done", label: "Done", color: "#00c875", mine: false };
export const DEFAULT_WORKFLOW = {
  scope: { mode: "all", items: [] },
  stages: [
    { id: "me", label: "With me", color: "#fdab3d", mine: true, status: "In Progress", newDeadline: true, kpi: true },
    { id: "boss", label: "With supervisor", color: "#579bfc", mine: false, status: "Waiting" },
  ],
  limits: { review: 12, later: 12 },
  overrides: [],
  business: false,
};

let CTX = { wf: DEFAULT_WORKFLOW, holidaySet: new Set(), workSchedule: DEFAULT_WORK_SESSIONS, sla: { enabled: true, hours: 48 } };
/** Called by the app on every render so the pure helpers below see current settings. */
export function setCycleContext(c) {
  CTX = { ...CTX, ...c, wf: normalizeWorkflow(c.wf ?? CTX.wf) };
}
export function normalizeWorkflow(w) {
  const d = DEFAULT_WORKFLOW;
  const x = w && typeof w === "object" ? w : {};
  let stages = Array.isArray(x.stages) && x.stages.length ? x.stages.filter((st) => st && st.id) : d.stages;
  if (!stages.some((st) => st.mine)) stages = [d.stages[0], ...stages];
  return {
    scope: { mode: x.scope?.mode === "selected" ? "selected" : "all", items: Array.isArray(x.scope?.items) ? x.scope.items : [] },
    stages,
    limits: { review: Number(x.limits?.review) || d.limits.review, later: Number(x.limits?.later) || Number(x.limits?.review) || d.limits.later },
    overrides: Array.isArray(x.overrides) ? x.overrides : [],
    business: !!x.business,
  };
}
export const getWorkflow = () => CTX.wf;
export const firstMineStage = (wf = CTX.wf) => wf.stages.find((st) => st.mine) || wf.stages[0];
export const firstWaitStage = (wf = CTX.wf) => wf.stages.find((st) => !st.mine) || { id: "boss", label: "With supervisor", color: "#579bfc", mine: false, status: "Waiting" };
export function stageById(id, wf = CTX.wf) {
  if (id === "done") return DONE_STAGE;
  return wf.stages.find((st) => st.id === id) || { id, label: id, color: "#a1a5b3", mine: false };
}
/** Does this task use Ball at all? */
export function inScope(task, wf = CTX.wf) {
  if (wf.scope.mode !== "selected") return true;
  const items = wf.scope.items;
  return items.includes(task.category) || items.includes(`${task.category}/${task.subcategory}`);
}
/** Time rule for a task: category/subcategory override, else defaults. */
export function ruleFor(task, wf = CTX.wf) {
  const o = wf.overrides.find((x) => x.key === `${task.category}/${task.subcategory}`) || wf.overrides.find((x) => x.key === task.category);
  const num = (v) => (v === "" || v == null || isNaN(Number(v)) ? null : Number(v));
  const first = num(o?.first) ?? (Number(CTX.sla?.hours) || 48);
  const review = num(o?.review) ?? wf.limits.review;
  const later = num(o?.later) ?? (num(o?.review) != null ? num(o?.review) : wf.limits.later);
  return { first, review, later, business: o && o.business != null && o.business !== "" ? !!o.business : wf.business };
}
export const limitForRound = (task, n) => {
  const r = ruleFor(task);
  return n <= 1 ? r.first : n === 2 ? r.review : r.later;
};

/* ---- time helpers (continuous or business hours) ---- */
const loc = (d) => toDateTimeLocalValue(d);
export function measureHours(start, end, biz) {
  if (!start || !end) return 0;
  if (biz) return businessMinutesBetween(loc(start), loc(end), CTX.holidaySet, CTX.workSchedule) / 60;
  return (end - start) / 3600000;
}
/** start + N hours → Date (business hours are walked forward minute-bisect). */
export function addHours(start, hours, biz) {
  if (!biz) return new Date(start.getTime() + Math.round(hours * 60) * 60000);
  const target = Math.round(hours * 60);
  let lo = 0, hi = 60 * 24 * 90; // up to 90 days
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const m = businessMinutesBetween(loc(start), loc(new Date(start.getTime() + mid * 60000)), CTX.holidaySet, CTX.workSchedule);
    if (m >= target) hi = mid;
    else lo = mid + 1;
  }
  return new Date(start.getTime() + lo * 60000);
}
function deadlineFrom(date) {
  return { deadline: formatYMD(date), deadlineTime: `${pad2(date.getHours())}:${pad2(date.getMinutes())}` };
}
/** Auto deadline for the FIRST round of a task (respects per-category hours / business hours). */
export function firstDeadlineFor(task, receivedDate, receivedTime) {
  const r = ruleFor(task);
  const [y, m, d] = (receivedDate || todayYMD()).split("-").map(Number);
  const [hh, mm] = (receivedTime || "00:00").split(":").map(Number);
  return { ...deadlineFrom(addHours(new Date(y, m - 1, d, hh || 0, mm || 0), r.first, r.business)), hours: r.first, business: r.business };
}

export function receivedMoment(task) {
  const ymd = getReceivedDate(task);
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  const [hh, mm] = (task.receivedTime || "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0);
}

/** Events in the new format (old v8 events converted). */
export function eventsOf(task) {
  const wf = CTX.wf;
  return (task.handoffs || []).map((e) => {
    if (e.type !== "sent" && e.type !== "returned" && e.type !== "approved") return e;
    if (e.type === "sent") return { ...e, type: "move", to: firstWaitStage(wf).id, mine: false };
    if (e.type === "returned") return { ...e, type: "move", to: firstMineStage(wf).id, mine: true };
    return { ...e, type: "move", to: "done", mine: false };
  });
}
export function hasCycle(task) {
  return inScope(task) && eventsOf(task).length > 0;
}
export function currentStage(task) {
  const ev = eventsOf(task);
  const last = ev[ev.length - 1];
  if (!last) return firstMineStage();
  if (last.to === "done" && task.status !== "Completed") return firstMineStage(); // re-opened
  return stageById(last.to);
}
/** Clock semantics: "me" (my clock runs) | "boss" (paused, waiting on someone) | "done" */
export function ballOf(task) {
  if (task.status === "Completed") return "done";
  if (!inScope(task)) return "me";
  const st = currentStage(task);
  if (st.id === "done") return "done";
  return st.mine ? "me" : "boss";
}
export function fmtSpan(hours) {
  if (hours == null || isNaN(hours)) return "—";
  const h = Math.max(0, hours);
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) {
    const whole = Math.floor(h);
    const m = Math.round((h - whole) * 60);
    return m ? `${whole}h ${m}m` : `${whole}h`;
  }
  const d = Math.floor(h / 24);
  const r = Math.round(h - d * 24);
  return r ? `${d}d ${r}h` : `${d}d`;
}

/** Legs: "mine" legs (counted against me) and "wait" legs (shown, not counted). */
export function legsOf(task) {
  const ev = eventsOf(task);
  const dl = deadlineMoment(task);
  const rule0 = ruleFor(task);
  const legs = [];
  let n = 1;
  let mineLeg = { start: receivedMoment(task), biz: rule0.business, kpi: firstMineStage().kpi !== false, stage: firstMineStage().id };
  let wait = null;
  const closeMine = (end, limitH, open) => {
    const used = mineLeg.start && end ? measureHours(mineLeg.start, end, mineLeg.biz) : 0;
    legs.push({ kind: "mine", n, start: mineLeg.start, end: open ? null : end, open: !!open, limitH, usedH: used, ok: limitH == null ? true : used <= limitH + 1e-6, kpi: mineLeg.kpi, biz: mineLeg.biz, stage: mineLeg.stage });
    mineLeg = null;
  };
  const closeWait = (end, approved) => {
    legs.push({ kind: "wait", n, start: wait.start, end, open: !end, usedH: ((end || new Date()) - wait.start) / 3600000, stage: wait.stage, approved: !!approved });
    wait = null;
  };
  for (const e of ev) {
    const at = new Date(e.at);
    const toMine = !!e.mine && e.to !== "done";
    if (mineLeg) {
      if (toMine) {
        mineLeg.stage = e.to;
      } else {
        closeMine(at, e.limitH);
        wait = { start: at, stage: e.to };
      }
    } else if (wait) {
      if (wait.stage === "done") wait = null;
      else closeWait(at, e.to === "done");
      if (toMine) {
        n += 1;
        mineLeg = { start: at, biz: e.biz != null ? e.biz : rule0.business, kpi: e.kpi !== false, stage: e.to };
      } else {
        wait = { start: at, stage: e.to };
      }
    }
    if (e.to === "done") wait = { start: at, stage: "done", doneAt: at };
  }
  const completedEnd = task.status === "Completed" && task.completedAt ? new Date(task.completedAt) : null;
  if (mineLeg) {
    const limitH = dl && mineLeg.start ? Math.floor(measureHours(mineLeg.start, dl, mineLeg.biz) * 60) / 60 : null;
    closeMine(completedEnd || new Date(), limitH, !completedEnd);
  } else if (wait && wait.stage !== "done") {
    closeWait(completedEnd, !!completedEnd);
  }
  return legs;
}

function mineCount(legs) {
  return legs.filter((l) => l.kind === "mine").length;
}

/** Move the ball to a stage ("done" = approved). Returns a patch for the task. */
export function applyMove(task, toId, atDate = new Date()) {
  const wf = CTX.wf;
  const stage = stageById(toId, wf);
  const cur = ballOf(task);
  const at = atDate.toISOString();
  const ev = { id: uid(), type: "move", to: toId, at, mine: !!stage.mine };
  const h = [...eventsOf(task)];
  const legs = legsOf(task);
  const openMine = [...legs].reverse().find((l) => l.kind === "mine" && l.open);
  const patch = {};
  if (cur === "me" && !stage.mine && openMine) {
    const dl = deadlineMoment(task);
    ev.limitH = dl ? Math.max(0, Math.floor(measureHours(openMine.start, dl, openMine.biz) * 60) / 60) : null;
  }
  if (cur !== "me" && stage.mine) {
    const n = mineCount(legs) + 1;
    const r = ruleFor(task);
    const limit = n <= 1 ? r.first : n === 2 ? r.review : r.later;
    ev.nextLimitH = limit;
    ev.biz = r.business;
    ev.kpi = stage.kpi !== false;
    if (stage.newDeadline !== false) Object.assign(patch, deadlineFrom(addHours(atDate, limit, r.business)), { deadlineAuto: true });
  }
  h.push(ev);
  if (toId === "done") {
    patch.status = "Completed";
    patch.completedAt = at;
  } else {
    patch.completedAt = null;
    if (stage.status && stage.status !== "keep") patch.status = stage.status;
  }
  return { ...patch, handoffs: h };
}

/** Undo the most recent move. */
export function undoLastHandoff(task) {
  const h = [...eventsOf(task)];
  h.pop();
  const last = h[h.length - 1];
  const patch = { handoffs: h };
  const st = last ? stageById(last.to) : firstMineStage();
  if (last && last.to === "done") {
    patch.status = "Completed";
    patch.completedAt = last.at;
    return patch;
  }
  patch.completedAt = null;
  if (st.status && st.status !== "keep") patch.status = st.status;
  if (st.mine) {
    if (last) {
      const legs = legsOf({ ...task, handoffs: h, status: "In Progress" });
      const open = [...legs].reverse().find((l) => l.kind === "mine" && l.open);
      const r = ruleFor(task);
      const n = open ? open.n : 1;
      if (open && n > 1) Object.assign(patch, deadlineFrom(addHours(open.start, n === 2 ? r.review : r.later, open.biz)), { deadlineAuto: true });
    } else if (CTX.sla?.enabled) {
      Object.assign(patch, firstDeadlineFor(task, getReceivedDate(task), task.receivedTime), { deadlineAuto: true });
    }
  }
  return patch;
}

/** Edit the timestamp of one event (you forgot to click at the time). */
export function setHandoffTime(task, id, atDate) {
  const h = eventsOf(task).map((e) => (e.id === id ? { ...e, at: atDate.toISOString() } : e));
  const last = h[h.length - 1];
  const patch = { handoffs: h };
  if (last && last.id === id) {
    const st = stageById(last.to);
    if (st.mine && last.nextLimitH != null && st.newDeadline !== false) Object.assign(patch, deadlineFrom(addHours(atDate, last.nextLimitH, !!last.biz)), { deadlineAuto: true });
    if (last.to === "done") patch.completedAt = last.at;
  }
  return patch;
}

/** When a finished task is un-ticked, start a fresh round with me. */
export function reconcileReopen(oldTask, newTask) {
  if (!oldTask || oldTask.status !== "Completed" || newTask.status === "Completed") return null;
  if (!inScope(newTask)) return null;
  const ev = eventsOf(oldTask);
  const last = ev[ev.length - 1];
  if (!last || last.to !== "done") return null;
  const asOpen = { ...newTask, handoffs: oldTask.handoffs, status: "Completed" };
  const patch = applyMove({ ...asOpen }, firstMineStage().id, new Date());
  // applyMove from "done" → mine: ballOf() is "done" here, so the new round starts
  return { ...patch, status: firstMineStage().status && firstMineStage().status !== "keep" ? firstMineStage().status : "In Progress", completedAt: null };
}

/** Roll-up used by Dashboard. */
export function cycleStats(tasks) {
  let firstTotal = 0, firstOk = 0, reTotal = 0, reOk = 0, cycles = 0, rounds = 0;
  tasks.forEach((t) => {
    if (!hasCycle(t)) return;
    cycles += 1;
    legsOf(t).forEach((l) => {
      if (l.kind !== "mine" || l.open || l.kpi === false) return;
      rounds += 1;
      if (l.n === 1) {
        firstTotal += 1;
        if (l.ok) firstOk += 1;
      } else {
        reTotal += 1;
        if (l.ok) reOk += 1;
      }
    });
  });
  return { firstTotal, firstOk, reTotal, reOk, cycles, avgRounds: cycles ? rounds / cycles : 0 };
}
