import React, { useState, useMemo, useEffect, useRef } from "react";
import { Play, Pause, ArrowUp, ArrowDown, Filter, ChevronDown, ChevronRight, Plus, AlertCircle, Check, EyeOff, Layers, Repeat, X } from "lucide-react";
import { STATUSES, PRIORITIES, MAX_SUBTASKS, STATUS_COLORS, PRIORITY_COLORS, stringToColor } from "../lib/constants";
import {
  classNames,
  formatDateTimeDisplay,
  formatDateDisplay,
  formatYMD,
  applyMove,
  undoLastHandoff,
  inScope,
  ballOf,
  getReceivedDate,
  taskCompletionPct,
  taskTotalHours,
  taskTotalMinutes,
  sessionMinutes,
  taskUsesBusinessHours,
  toDateTimeLocalValue,
  formatHours,
  isTaskOverdue,
  deadlineMoment,
  isTaskCompletedLate,
  formatRelativeTime,
  uid,
  subtaskStatus,
} from "../lib/timeUtils";
import { useHoverIntent } from "./ui";
import { ballInfo, moveOptions } from "./CyclePanel";

/* =========================================================================
   BOARD VIEW — grouped, collapsible, colour-cell layout (Monday-style)
   ========================================================================= */


const GROUP_OPTIONS = [
  { id: "status", label: "Status" },
  { id: "category", label: "Category" },
  { id: "priority", label: "Priority" },
  { id: "assigner", label: "Assigner" },
  { id: "none", label: "No grouping" },
];

const COLUMNS = [
  { id: "status", label: "Status", w: "w-36", px: 120 },
  { id: "ball", label: "Ball", w: "w-36", px: 125 },
  { id: "received", label: "Received", w: "w-40", px: 115 },
  { id: "deadline", label: "Deadline", w: "w-44", px: 135 },
  { id: "tracking", label: "Time tracking", w: "w-40", px: 150 },
  { id: "priority", label: "Priority", w: "w-32", px: 95 },
  { id: "assigner", label: "Assigner", w: "w-44", px: 130 },
  { id: "category", label: "Category", w: "w-40", px: 115 },
  { id: "subcategory", label: "Subcategory", w: "w-40", px: 150 },
  { id: "progress", label: "Progress", w: "w-36", px: 110 },
  { id: "completed", label: "Completed", w: "w-40", px: 150 },
  { id: "hours", label: "Hours", w: "w-24", px: 90 },
  { id: "updated", label: "Last updated", w: "w-32", px: 120 },
];

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* ignore */
  }
}

function initials(name) {
  return (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

/** A small menu anchored under a button; fixed-position so table scrolling never clips it. */
function CellMenu({ anchor, options, onPick, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    function away(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", away);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("mousedown", away);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);
  const top = Math.min(anchor.bottom + 4, window.innerHeight - options.length * 40 - 16);
  return (
    <div
      ref={ref}
      style={{ position: "fixed", top, left: anchor.left, zIndex: 9999, minWidth: Math.max(anchor.width, 150) }}
      className="anim-menu space-y-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={(e) => {
            e.stopPropagation();
            onPick(o.value);
            onClose();
          }}
          className="block w-full rounded-md px-3 py-2 text-center text-xs font-semibold text-white transition hover:opacity-85"
          style={{ backgroundColor: o.color }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ColorCell({ value, color, options, onPick }) {
  const [anchor, setAnchor] = useState(null);
  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setAnchor(e.currentTarget.getBoundingClientRect());
        }}
        className="flex h-full w-full items-center justify-center px-2 text-xs font-semibold text-white transition hover:opacity-90"
        style={{ backgroundColor: color }}
      >
        {value}
      </button>
      {anchor && <CellMenu anchor={anchor} options={options} onPick={onPick} onClose={() => setAnchor(null)} />}
    </>
  );
}

function SubtaskRow({ sub, groupColor, span, statusCol, restSpan, onChange, onRemove }) {
  const st = subtaskStatus(sub);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sub.title);
  function commit() {
    const v = draft.trim();
    setEditing(false);
    if (v && v !== sub.title) onChange({ title: v });
    else setDraft(sub.title);
  }
  return (
    <tr className="anim-fade group/sub border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/70">
      <td className="w-1.5 p-0" style={{ backgroundColor: `${groupColor}88` }} />
      <td />
      <td colSpan={statusCol ? 1 : span} className="py-1 pl-8 pr-3">
        <div className="flex items-center gap-2 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
          <button
            onClick={() => onChange(st === "Completed" ? { status: "Not Started", done: false } : { status: "Completed", done: true })}
            className={classNames(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition",
              st === "Completed" ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-emerald-400 dark:border-slate-600"
            )}
          >
            <Check size={11} strokeWidth={3} />
          </button>
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") {
                  setEditing(false);
                  setDraft(sub.title);
                }
              }}
              className="min-w-0 flex-1 rounded border border-indigo-400 bg-white px-1.5 py-0.5 text-sm outline-none dark:bg-slate-800"
            />
          ) : (
            <button
              onClick={() => {
                setDraft(sub.title);
                setEditing(true);
              }}
              title="Click to edit"
              className={classNames("min-w-0 flex-1 truncate text-left text-sm", st === "Completed" ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200")}
            >
              {sub.title || "(untitled subtask)"}
            </button>
          )}
          {!statusCol && (
            <div className="h-6 w-28 shrink-0 overflow-hidden rounded">
              <ColorCell value={st} color={STATUS_COLORS[st]} options={STATUSES.map((x) => ({ value: x, label: x, color: STATUS_COLORS[x] }))} onPick={(v) => onChange({ status: v, done: v === "Completed" })} />
            </div>
          )}
          <button onClick={onRemove} title="Delete subtask" className="shrink-0 text-slate-300 opacity-0 transition hover:text-rose-500 group-hover/sub:opacity-100">
            <X size={14} />
          </button>
        </div>
      </td>
      {statusCol && (
        <>
          <td className="h-8 border-l border-slate-100 p-0 dark:border-slate-800">
            <ColorCell value={st} color={STATUS_COLORS[st]} options={STATUSES.map((x) => ({ value: x, label: x, color: STATUS_COLORS[x] }))} onPick={(v) => onChange({ status: v, done: v === "Completed" })} />
          </td>
          {restSpan > 0 && <td colSpan={restSpan} />}
        </>
      )}
    </tr>
  );
}

function AddSubtaskRow({ groupColor, span, onAdd, full }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim());
    setTitle("");
  }
  return (
    <tr className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/70">
      <td className="w-1.5 p-0" style={{ backgroundColor: `${groupColor}88` }} />
      <td />
      <td colSpan={span} className="py-1 pl-8 pr-3">
        <div className="border-l-2 border-slate-200 pl-3 dark:border-slate-700">
          {full ? (
            <span className="text-xs text-slate-400">Maximum of {MAX_SUBTASKS} subtasks reached.</span>
          ) : open ? (
            <form onSubmit={submit} className="flex items-center gap-2">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => !title.trim() && setOpen(false)}
                placeholder="Subtask — press Enter to add, then keep typing"
                className="w-80 rounded border border-indigo-400 bg-white px-2 py-1 text-sm outline-none dark:bg-slate-800 dark:text-slate-100"
              />
              <button type="submit" className="rounded bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white">
                Add
              </button>
            </form>
          ) : (
            <button onClick={() => setOpen(true)} className="flex items-center gap-1 text-sm text-slate-400 hover:text-indigo-600">
              <Plus size={13} /> Add subitem
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/** Monday-style stopwatch: ▶ starts, ⏸ pauses and saves the session. Pausing never completes the task. */
function TrackCell({ task: t, holidaySet, workSchedule, onPatchTask }) {
  const running = !!t.runningStart;
  const [, tick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const nowVal = toDateTimeLocalValue(new Date());
  const biz = taskUsesBusinessHours(t);
  let secs = Math.round(taskTotalMinutes(t, holidaySet, workSchedule) * 60);
  if (running) {
    const startMs = t.runningStartMs || new Date(t.runningStart).getTime();
    const wall = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    // business-hours tasks only count office time; resolution is per minute, so add the live seconds of the current minute
    const counted = Math.round(sessionMinutes({ start: t.runningStart, end: nowVal }, biz, holidaySet, workSchedule) * 60);
    // inside office hours the two agree, so show live seconds; outside them show only what counts
    secs += biz && Math.abs(counted - Math.floor(wall / 60) * 60) > 60 ? counted : wall;
  }
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;

  function toggle(e) {
    e.stopPropagation();
    if (running) {
      // sessions are stored in whole minutes: round the stopwatch time to the nearest minute
      const startMs = t.runningStartMs || new Date(t.runningStart).getTime();
      const mins = Math.round((Date.now() - startMs) / 60000);
      const end = toDateTimeLocalValue(new Date(new Date(t.runningStart).getTime() + mins * 60000));
      onPatchTask(t.id, { runningStart: null, runningStartMs: null, ...(mins > 0 ? { sessions: [...(t.sessions || []), { id: uid(), start: t.runningStart, end }] } : {}) });
    } else {
      onPatchTask(t.id, { runningStart: toDateTimeLocalValue(new Date()), runningStartMs: Date.now() });
    }
  }
  return (
    <div className="flex h-full items-center justify-center gap-2 px-2">
      <button
        onClick={toggle}
        title={running ? "Pause (saves this session)" : "Start tracking"}
        className={classNames("flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white shadow-sm", running ? "bg-rose-500 hover:bg-rose-600" : "bg-[#0073ea] hover:bg-[#0060c0]")}
      >
        {running ? <Pause size={12} className="fill-current" /> : <Play size={12} className="ml-0.5 fill-current" />}
      </button>
      <span className={classNames("font-mono text-xs tabular-nums", running ? "font-semibold text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-300")}>
        {h}h {m}m {s}s
      </span>
    </div>
  );
}

function BoardRow({ task: t, sla, groupColor, cols, expanded, onToggleExpand, span, holidaySet, workSchedule, categoryColors, onOpen, onStatusChange, onPatchTask, onHoverTask, onUnhoverTask }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(t.title);
  const hover = useHoverIntent((pos) => onHoverTask(t, pos), onUnhoverTask);
  const overdue = isTaskOverdue(t);
  const late = isTaskCompletedLate(t);
  const done = t.status === "Completed";
  const pct = taskCompletionPct(t);
  const catColor = categoryColors[t.category] || stringToColor(t.category);

  function commitRename() {
    const v = draft.trim();
    setEditing(false);
    if (v && v !== t.title) onPatchTask(t.id, { title: v });
    else setDraft(t.title);
  }

  const cell = "h-10 border-l border-slate-100 dark:border-slate-800 p-0";
  const subs = t.subtasks || [];
  const doneSubs = subs.filter((x) => subtaskStatus(x) === "Completed").length;
  const setSubs = (next) => onPatchTask(t.id, { subtasks: next });

  return (
    <>
    <tr
      onMouseEnter={hover.onMouseEnter}
      onMouseLeave={hover.onMouseLeave}
      className="group border-b border-slate-100 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-800/40"
    >
      <td className="w-1.5 p-0" style={{ backgroundColor: groupColor }} />
      <td className="w-9 px-2">
        <button
          onClick={() => onStatusChange(t.id, done ? "In Progress" : "Completed")}
          title={done ? "Completed — click to re-open" : "Mark as Completed"}
          className={classNames(
            "flex h-4 w-4 items-center justify-center rounded border transition",
            done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-emerald-400 dark:border-slate-600"
          )}
        >
          <Check size={11} strokeWidth={3} />
        </button>
      </td>
      <td className="min-w-[260px] max-w-[360px] px-3">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setEditing(false);
                setDraft(t.title);
              }
            }}
            className="w-full rounded border border-indigo-400 bg-white px-1.5 py-1 text-sm outline-none dark:bg-slate-800"
          />
        ) : (
          <div className="flex items-center gap-1.5">
            <button onClick={onToggleExpand} title={expanded ? "Hide subtasks" : "Show subtasks"} className="shrink-0 text-slate-400 hover:text-indigo-600">
              {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
            <button
              onClick={() => onOpen(t)}
              onDoubleClick={(e) => {
                e.preventDefault();
                setDraft(t.title);
                setEditing(true);
              }}
              title="Click to open · double-click to rename"
              className={classNames("truncate text-left text-sm hover:text-indigo-600 hover:underline", done ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100")}
            >
              {t.title}
            </button>
            {subs.length > 0 && (
              <span
                onClick={onToggleExpand}
                title={`${doneSubs} of ${subs.length} subtasks done`}
                className="shrink-0 cursor-pointer rounded bg-slate-100 px-1.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800"
              >
                {doneSubs}/{subs.length}
              </span>
            )}
            {t.rounds?.length > 0 && (
              <span className="flex shrink-0 items-center gap-0.5 text-[11px] text-slate-400" title={`${t.rounds.length} round(s)`}>
                <Repeat size={11} /> {t.rounds.length}
              </span>
            )}
          </div>
        )}
      </td>
      {cols.includes("status") && (
        <td className={cell}>
          <ColorCell
            value={t.status}
            color={STATUS_COLORS[t.status] || "#a1a5b3"}
            options={STATUSES.map((s) => ({ value: s, label: s, color: STATUS_COLORS[s] }))}
            onPick={(v) => onStatusChange(t.id, v)}
          />
        </td>
      )}
      {cols.includes("ball") && (
        <td className={cell}>
          {(() => {
            const b = ballInfo(t);
            if (!b) return <p className="text-center text-xs text-slate-300" title="Ball is off for this category (Settings)">—</p>;
            let opts = moveOptions(t).map((st) => ({ value: st.id, label: `→ ${st.label}`, color: st.color || "#6366f1" }));
            if ((t.handoffs || []).length > 0) opts = [...opts, { value: "undo", label: "↶ Undo last step", color: "#a1a5b3" }];
            opts = [...opts, { value: "edit", label: "✎ Edit times…", color: "#6b7280" }];
            return (
              <ColorCell
                value={b.label}
                color={b.color}
                options={opts}
                onPick={(v) => (v === "edit" ? onOpen(t) : v === "undo" ? onPatchTask(t.id, undoLastHandoff(t)) : onPatchTask(t.id, applyMove(t, v)))}
              />
            );
          })()}
        </td>
      )}
      {cols.includes("received") && (
        <td className={classNames(cell, "px-3 text-center text-xs text-slate-600 dark:text-slate-300")}>
          {getReceivedDate(t) ? formatDateTimeDisplay(getReceivedDate(t), t.receivedTime) : "—"}
        </td>
      )}
      {cols.includes("deadline") && (
        <td className={classNames(cell, "px-3 text-xs")}>
          <div className="flex items-center justify-center gap-1.5">
            {overdue && <AlertCircle size={14} className="shrink-0 text-rose-500" />}
            {done && !late && <Check size={14} className="shrink-0 text-emerald-500" />}
            {late && <AlertCircle size={14} className="shrink-0 text-amber-500" />}
            {ballOf(t) === "boss" && <span title="Your clock is paused while the supervisor holds it" className="text-[11px] text-sky-500">⏸</span>}
            <span
              className={classNames(
                overdue ? "font-semibold text-rose-600" : late ? "text-amber-600" : done ? "text-slate-400 line-through" : "text-slate-600 dark:text-slate-300"
              )}
            >
              {formatDateTimeDisplay(t.deadline, t.deadlineTime)}
            </span>
          </div>
        </td>
      )}
      {cols.includes("tracking") && (
        <td className={cell}>
          <TrackCell task={t} holidaySet={holidaySet} workSchedule={workSchedule} onPatchTask={onPatchTask} />
        </td>
      )}
      {cols.includes("priority") && (
        <td className={cell}>
          <ColorCell
            value={t.priority}
            color={PRIORITY_COLORS[t.priority] || "#a1a5b3"}
            options={PRIORITIES.slice()
              .reverse()
              .map((p) => ({ value: p, label: p, color: PRIORITY_COLORS[p] }))}
            onPick={(v) => onPatchTask(t.id, { priority: v })}
          />
        </td>
      )}
      {cols.includes("assigner") && (
        <td className={classNames(cell, "px-3")}>
          {t.assigner ? (
            <p className="truncate text-center text-xs text-slate-700 dark:text-slate-200">{t.assigner}</p>
          ) : (
            <p className="text-center text-xs text-slate-300">—</p>
          )}
        </td>
      )}
      {cols.includes("category") && (
        <td className={cell}>
          <div className="flex h-full items-center justify-center px-2 text-center text-xs font-medium text-white" style={{ backgroundColor: catColor }}>
            <span className="truncate">{t.category || "—"}</span>
          </div>
        </td>
      )}
      {cols.includes("subcategory") && (
        <td className={cell}>
          <p className="truncate px-2 text-center text-xs text-slate-700 dark:text-slate-200">{t.subcategory || <span className="text-slate-300">—</span>}</p>
        </td>
      )}
      {cols.includes("progress") && (
        <td className={classNames(cell, "px-3")}>
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/60">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#00c875" : "#579bfc" }} />
            </div>
            <span className="w-8 text-right font-mono text-[11px] text-slate-500">{pct}%</span>
          </div>
        </td>
      )}
      {cols.includes("completed") && (
        <td className={classNames(cell, "px-3 text-center text-xs text-slate-600 dark:text-slate-300")}>
          {t.completedAt ? <span className="whitespace-nowrap">{formatDateTimeDisplay(formatYMD(new Date(t.completedAt)), `${String(new Date(t.completedAt).getHours()).padStart(2, "0")}:${String(new Date(t.completedAt).getMinutes()).padStart(2, "0")}`)}</span> : "—"}
        </td>
      )}
      {cols.includes("hours") && (
        <td className={classNames(cell, "px-3 text-center font-mono text-xs text-slate-600 dark:text-slate-300")}>
          {formatHours(taskTotalHours(t, holidaySet, workSchedule))}
        </td>
      )}
      {cols.includes("updated") && (
        <td className={classNames(cell, "px-3 text-center text-xs text-slate-500")}>{formatRelativeTime(t.updatedAt || t.createdAt) || "just now"}</td>
      )}
    </tr>
    {expanded && (
      <>
        {subs.map((sub) => (
          <SubtaskRow
            key={sub.id}
            sub={sub}
            groupColor={groupColor}
            span={span}
            statusCol={cols.includes("status")}
            restSpan={span - 2}
            onChange={(patch) => setSubs(subs.map((x) => (x.id === sub.id ? { ...x, ...patch } : x)))}
            onRemove={() => setSubs(subs.filter((x) => x.id !== sub.id))}
          />
        ))}
        <AddSubtaskRow groupColor={groupColor} span={span} full={subs.length >= MAX_SUBTASKS} onAdd={(title) => setSubs([...subs, { id: uid(), title, done: false, status: "Not Started" }])} />
      </>
    )}
    </>
  );
}

function SummaryBar({ items }) {
  const total = items.reduce((a, i) => a + i.count, 0);
  if (!total) return null;
  return (
    <div className="flex h-5 w-full overflow-hidden rounded-sm">
      {items
        .filter((i) => i.count > 0)
        .map((i) => (
          <div key={i.key} title={`${i.key}: ${i.count}`} style={{ width: `${(i.count / total) * 100}%`, backgroundColor: i.color }} />
        ))}
    </div>
  );
}

function AddRow({ colSpan, groupColor, onAdd, groupLabel }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title);
    setTitle("");
  }
  return (
    <tr className="border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900/40">
      <td className="w-1.5 p-0" style={{ backgroundColor: `${groupColor}55` }} />
      <td />
      <td colSpan={colSpan} className="px-3 py-1.5">
        {open ? (
          <form onSubmit={submit} className="flex items-center gap-2">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => !title.trim() && setOpen(false)}
              placeholder={`New task in ${groupLabel} — press Enter`}
              className="w-80 rounded border border-indigo-400 bg-white px-2 py-1 text-sm outline-none dark:bg-slate-800 dark:text-slate-100"
            />
            <button type="submit" className="rounded bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white">
              Add
            </button>
          </form>
        ) : (
          <button onClick={() => setOpen(true)} className="flex items-center gap-1 text-sm text-slate-400 hover:text-indigo-600">
            <Plus size={14} /> Add task
          </button>
        )}
      </td>
    </tr>
  );
}

/* ---------- Excel-style column filter + sort ---------- */
const DATE_COLS = new Set(["received", "deadline", "completed", "updated"]);
const NO_LIST_COLS = new Set(["title", "hours"]);
const COL_LABEL = Object.fromEntries([["title", "Task"], ...COLUMNS.map((c) => [c.id, c.label])]);

function filterActive(f) {
  return !!f && ((f.hide && f.hide.length > 0) || f.from || f.to || f.text);
}
function dayOf(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d) ? "" : formatYMD(d);
}
/** The text a cell holds, used for the value list and for filtering. "" = blank. */
function cellValue(t, col) {
  switch (col) {
    case "status": return t.status || "";
    case "priority": return t.priority || "";
    case "assigner": return t.assigner || "";
    case "category": return t.category || "";
    case "subcategory": return t.subcategory || "";
    case "ball": return ballInfo(t)?.label || "";
    case "received": return getReceivedDate(t) || "";
    case "deadline": return t.deadline || "";
    case "completed": return dayOf(t.completedAt);
    case "updated": return dayOf(t.updatedAt || t.createdAt);
    case "progress": {
      const p = taskCompletionPct(t);
      return p === 0 ? "0%" : p === 100 ? "100%" : "1–99%";
    }
    default: return "";
  }
}
function passesFilter(t, col, f) {
  if (!f) return true;
  if (col === "title") return !f.text || (t.title || "").toLowerCase().includes(f.text.toLowerCase());
  const v = cellValue(t, col);
  if (f.hide && f.hide.includes(v)) return false;
  if (DATE_COLS.has(col) && (f.from || f.to)) {
    if (!v) return false;
    if (f.from && v < f.from) return false;
    if (f.to && v > f.to) return false;
  }
  return true;
}
function sortLabels(col) {
  if (DATE_COLS.has(col)) return ["Oldest → Newest", "Newest → Oldest"];
  if (["progress", "hours"].includes(col)) return ["Smallest → Largest", "Largest → Smallest"];
  return ["A → Z", "Z → A"];
}

function HeaderBtn({ id, label, sort, filtered, onOpen, left }) {
  const active = sort && sort.col === id;
  const SortIcon = active ? (sort.dir === "asc" ? ArrowUp : ArrowDown) : null;
  return (
    <button
      onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
      title="Sort / filter this column"
      className={classNames(
        "group inline-flex max-w-full items-center gap-1 rounded px-1 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800",
        left ? "" : "justify-center",
        active || filtered ? "text-indigo-600 dark:text-indigo-400" : ""
      )}
    >
      <span className="truncate">{label}</span>
      {SortIcon && <SortIcon size={12} />}
      {filtered ? <Filter size={11} className="fill-current" /> : <ChevronDown size={12} className="opacity-0 group-hover:opacity-60" />}
    </button>
  );
}

function ColumnMenu({ col, rect, tasks, sort, setSort, filter, setFilter, onClose }) {
  const ref = useRef(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    function away(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    function onScroll(e) {
      if (ref.current && ref.current.contains(e.target)) return;
      onClose();
    }
    document.addEventListener("mousedown", away);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", away);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose]);

  const f = filter || {};
  const hide = f.hide || [];
  const isDate = DATE_COLS.has(col);
  const [asc, desc] = sortLabels(col);

  // distinct values + counts
  const values = useMemo(() => {
    if (NO_LIST_COLS.has(col)) return [];
    const m = new Map();
    tasks.forEach((t) => {
      const v = cellValue(t, col);
      m.set(v, (m.get(v) || 0) + 1);
    });
    const arr = [...m.entries()].map(([key, count]) => ({ key, count }));
    const order = col === "status" ? STATUSES : col === "priority" ? ["High", "Medium", "Low"] : col === "progress" ? ["0%", "1–99%", "100%"] : null;
    arr.sort((a, b) => {
      if (a.key === "" || b.key === "") return a.key === "" ? 1 : -1;
      if (order) return order.indexOf(a.key) - order.indexOf(b.key);
      if (isDate) return a.key < b.key ? -1 : 1;
      return a.key.localeCompare(b.key);
    });
    return arr;
  }, [tasks, col, isDate]);
  const label = (k) => (k === "" ? "(Blanks)" : isDate ? formatDateDisplay(k) : k);
  const listed = values.filter((v) => label(v.key).toLowerCase().includes(q.toLowerCase()));
  const allListedOn = listed.length > 0 && listed.every((v) => !hide.includes(v.key));
  const setHide = (next) => setFilter({ ...f, hide: next });

  const left = Math.min(Math.max(8, rect.left), window.innerWidth - 276);
  const top = Math.min(rect.bottom + 4, Math.max(8, window.innerHeight - 480));
  const clear = () => setFilter(null);

  return (
    <div
      ref={ref}
      style={{ position: "fixed", top, left, zIndex: 9999, width: 268 }}
      className="anim-menu rounded-xl border border-slate-200 bg-white p-2 text-xs shadow-2xl dark:border-slate-700 dark:bg-slate-900"
    >
      <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{COL_LABEL[col]}</p>
      <div className="grid grid-cols-2 gap-1">
        {[["asc", asc, ArrowUp], ["desc", desc, ArrowDown]].map(([dir, text, Icon]) => {
          const on = sort && sort.col === col && sort.dir === dir;
          return (
            <button
              key={dir}
              onClick={() => setSort(on ? null : { col, dir })}
              className={classNames(
                "flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 font-medium",
                on ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              )}
            >
              <Icon size={12} /> {text}
            </button>
          );
        })}
      </div>

      {col === "title" && (
        <div className="mt-2 px-1">
          <p className="mb-1 text-slate-500">Title contains</p>
          <input autoFocus value={f.text || ""} onChange={(e) => setFilter({ ...f, text: e.target.value })} placeholder="type to filter…" className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800" />
        </div>
      )}

      {isDate && (
        <div className="mt-2 grid grid-cols-2 gap-1 px-1">
          <label className="text-slate-500">
            From
            <input type="date" value={f.from || ""} onChange={(e) => setFilter({ ...f, from: e.target.value })} className="mt-0.5 w-full rounded-md border border-slate-200 bg-white px-1.5 py-1 dark:border-slate-700 dark:bg-slate-800" />
          </label>
          <label className="text-slate-500">
            To
            <input type="date" value={f.to || ""} onChange={(e) => setFilter({ ...f, to: e.target.value })} className="mt-0.5 w-full rounded-md border border-slate-200 bg-white px-1.5 py-1 dark:border-slate-700 dark:bg-slate-800" />
          </label>
        </div>
      )}

      {values.length > 0 && (
        <>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="mt-2 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800" />
          <div className="mt-1 max-h-56 overflow-y-auto rounded-md border border-slate-100 p-1 dark:border-slate-800">
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 font-medium hover:bg-slate-100 dark:hover:bg-slate-800">
              <input
                type="checkbox"
                checked={allListedOn}
                onChange={() => {
                  const keys = listed.map((v) => v.key);
                  setHide(allListedOn ? [...new Set([...hide, ...keys])] : hide.filter((k) => !keys.includes(k)));
                }}
              />
              (Select all)
            </label>
            {listed.map((v) => (
              <div key={v.key} className="group flex items-center rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={!hide.includes(v.key)} onChange={() => setHide(hide.includes(v.key) ? hide.filter((k) => k !== v.key) : [...hide, v.key])} />
                  <span className="truncate text-slate-700 dark:text-slate-200">{label(v.key)}</span>
                  <span className="text-slate-400">({v.count})</span>
                </label>
                <button onClick={() => setHide(values.map((x) => x.key).filter((k) => k !== v.key))} className="ml-1 hidden rounded px-1.5 py-0.5 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 group-hover:block dark:text-indigo-300 dark:hover:bg-indigo-500/10">
                  only
                </button>
              </div>
            ))}
            {listed.length === 0 && <p className="px-2 py-2 text-slate-400">No match</p>}
          </div>
        </>
      )}

      <div className="mt-2 flex items-center justify-between px-1">
        <button onClick={clear} disabled={!filterActive(f)} className="rounded-md px-2 py-1 font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800">
          Clear filter
        </button>
        <button onClick={onClose} className="rounded-md bg-indigo-600 px-3 py-1 font-semibold text-white hover:bg-indigo-700">
          Done
        </button>
      </div>
    </div>
  );
}


export function BoardView({
  tasks,
  categories,
  assigners,
  holidaySet,
  workSchedule,
  categoryColors,
  sla,
  onOpen,
  onStatusChange,
  onPatchTask,
  onQuickAddTo,
  onHoverTask,
  onUnhoverTask,
}) {
  const [groupBy, setGroupBy] = useState(() => load("lpt_board_group", "status"));
  const [hidden, setHidden] = useState(() => load("lpt_board_hidden4", ["hours", "updated", "received", "progress"]));
  const [collapsed, setCollapsed] = useState({});
  const [openSubs, setOpenSubs] = useState({});
  const [personFilter, setPersonFilter] = useState("");
  const [menu, setMenu] = useState(null); // "group" | "hide" | null
  const [sort, setSort] = useState(() => load("lpt_board_sort", null)); // {col, dir} | null
  useEffect(() => save("lpt_board_sort", sort), [sort]);

  useEffect(() => save("lpt_board_group", groupBy), [groupBy]);
  useEffect(() => save("lpt_board_hidden4", hidden), [hidden]);

  const cols = COLUMNS.filter((c) => !hidden.includes(c.id)).map((c) => c.id);
  const visibleCols = COLUMNS.filter((c) => cols.includes(c.id));

  const [filters, setFilters] = useState({}); // { col: {hide:[], from, to, text} }
  const [colMenu, setColMenu] = useState(null); // { col, rect }
  const activeFilterCols = Object.keys(filters).filter((c) => filterActive(filters[c]));

  const base = useMemo(() => (personFilter ? tasks.filter((t) => t.assigner === personFilter) : tasks), [tasks, personFilter]);
  const shown = useMemo(
    () => base.filter((t) => activeFilterCols.every((c) => passesFilter(t, c, filters[c]))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base, filters]
  );

  const groups = useMemo(() => {
    const defs = [];
    if (groupBy === "status") {
      STATUSES.forEach((s) => defs.push({ key: s, label: s, color: STATUS_COLORS[s], match: (t) => t.status === s, patch: { status: s } }));
    } else if (groupBy === "priority") {
      ["High", "Medium", "Low"].forEach((p) => defs.push({ key: p, label: p + " priority", color: PRIORITY_COLORS[p], match: (t) => t.priority === p, patch: { priority: p } }));
    } else if (groupBy === "category") {
      categories.forEach((c) =>
        defs.push({ key: c.name, label: c.name, color: categoryColors[c.name] || stringToColor(c.name), match: (t) => t.category === c.name, patch: { category: c.name, subcategory: c.subcategories?.[0]?.name || "" } })
      );
    } else if (groupBy === "assigner") {
      assigners.forEach((a) => defs.push({ key: a.name, label: a.name, color: stringToColor(a.name), match: (t) => t.assigner === a.name, patch: { assigner: a.name } }));
      defs.push({ key: "__none", label: "No assigner", color: "#a1a5b3", match: (t) => !t.assigner || !assigners.some((a) => a.name === t.assigner), patch: { assigner: "" } });
    } else {
      defs.push({ key: "__all", label: "All tasks", color: "#579bfc", match: () => true, patch: {} });
    }
    // Tasks that fit no group (e.g. a deleted category) go to "Other"
    const claimed = new Set();
    const result = defs.map((d) => {
      const items = shown.filter((t) => !claimed.has(t.id) && d.match(t));
      items.forEach((t) => claimed.add(t.id));
      return { ...d, items };
    });
    const rest = shown.filter((t) => !claimed.has(t.id));
    if (rest.length) result.push({ key: "__other", label: "Other", color: "#a1a5b3", items: rest, patch: {} });
    // hide empty groups except for status/priority where an empty group is a useful drop target
    if (sort) {
      const ORD = { status: STATUSES, priority: ["High", "Medium", "Low"] };
      const key = (t) => {
        switch (sort.col) {
          case "title": return (t.title || "").toLowerCase();
          case "status": return STATUSES.indexOf(t.status);
          case "priority": return ORD.priority.indexOf(t.priority);
          case "received": return String(getReceivedDate(t) || "") + (t.receivedTime || "");
          case "deadline": { const m = deadlineMoment(t); return m ? +m : null; }
          case "assigner": return (t.assigner || "").toLowerCase() || null;
          case "ball": return inScope(t) ? ["me", "boss", "done"].indexOf(ballOf(t)) : null;
          case "completed": return t.completedAt || null;
          case "category": return (t.category || "").toLowerCase() || null;
          case "subcategory": return (t.subcategory || "").toLowerCase() || null;
          case "progress": return taskCompletionPct(t);
          case "hours": return taskTotalHours(t, holidaySet, workSchedule);
          case "updated": return t.updatedAt || 0;
          default: return null;
        }
      };
      const f = sort.dir === "asc" ? 1 : -1;
      result.forEach((g) => {
        g.items = [...g.items].sort((a, b) => {
          const x = key(a), y = key(b);
          if (x == null && y == null) return 0;
          if (x == null) return 1; // empties always last
          if (y == null) return -1;
          return (x < y ? -1 : x > y ? 1 : 0) * f;
        });
      });
    }
    return result.filter((g) => g.items.length > 0 || groupBy === "status" || groupBy === "priority");
  }, [shown, groupBy, categories, assigners, categoryColors, sort, holidaySet, workSchedule]);

  const th = "h-9 border-l border-slate-100 px-3 text-center text-xs font-medium text-slate-500 dark:border-slate-800";

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="relative flex flex-wrap items-center gap-2 text-sm">
        <div className="relative">
          <button
            onClick={() => setMenu(menu === "group" ? null : "group")}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Layers size={14} /> Group by: <span className="text-indigo-600 dark:text-indigo-400">{GROUP_OPTIONS.find((g) => g.id === groupBy)?.label}</span>
          </button>
          {menu === "group" && (
            <div className="anim-menu absolute left-0 top-9 z-30 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              {GROUP_OPTIONS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setGroupBy(g.id);
                    setMenu(null);
                  }}
                  className={classNames("block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800", g.id === groupBy && "font-semibold text-indigo-600")}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <select
          value={personFilter}
          onChange={(e) => setPersonFilter(e.target.value)}
          className="rounded-md bg-transparent px-2 py-1.5 text-sm font-medium text-slate-600 outline-none hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <option value="">Person: everyone</option>
          {assigners.map((a) => (
            <option key={a.id} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>

        <div className="relative">
          <button
            onClick={() => setMenu(menu === "hide" ? null : "hide")}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <EyeOff size={14} /> Columns{hidden.length ? ` (${COLUMNS.length - hidden.length}/${COLUMNS.length})` : ""}
          </button>
          {menu === "hide" && (
            <div className="anim-menu absolute left-0 top-9 z-30 w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              {COLUMNS.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={!hidden.includes(c.id)}
                    onChange={() => setHidden((h) => (h.includes(c.id) ? h.filter((x) => x !== c.id) : [...h, c.id]))}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeFilterCols.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-slate-500">Filtering:</span>
          {activeFilterCols.map((c) => (
            <button
              key={c}
              onClick={() => setFilters((f) => ({ ...f, [c]: null }))}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300"
              title="Remove this filter"
            >
              {COL_LABEL[c]} <X size={11} />
            </button>
          ))}
          <button onClick={() => setFilters({})} className="font-medium text-slate-500 underline hover:text-slate-700">
            Clear all
          </button>
          <span className="text-slate-400">· {shown.length} of {base.length} tasks</span>
        </div>
      )}
      {colMenu && (
        <ColumnMenu
          key={colMenu.col}
          col={colMenu.col}
          rect={colMenu.rect}
          tasks={base}
          sort={sort}
          setSort={setSort}
          filter={filters[colMenu.col]}
          setFilter={(v) => setFilters((f) => ({ ...f, [colMenu.col]: v }))}
          onClose={() => setColMenu(null)}
        />
      )}

      {/* Groups */}
      {groups.map((g) => {
        const isCollapsed = !!collapsed[g.key];
        const statusItems = STATUSES.map((s) => ({ key: s, color: STATUS_COLORS[s], count: g.items.filter((t) => t.status === s).length }));
        const prioItems = ["High", "Medium", "Low"].map((p) => ({ key: p, color: PRIORITY_COLORS[p], count: g.items.filter((t) => t.priority === p).length }));
        const dates = g.items.map((t) => t.deadline).filter(Boolean).sort();
        return (
          <div key={g.key}>
            <button
              onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))}
              className="mb-1 flex items-center gap-2 text-lg font-semibold"
              style={{ color: g.color }}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
              {g.label}
              <span className="text-sm font-normal text-slate-400">{g.items.length} task{g.items.length === 1 ? "" : "s"}</span>
            </button>
            {!isCollapsed && (
              <div className="no-scrollbar overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full table-fixed border-collapse" style={{ minWidth: 380 + visibleCols.reduce((a, c) => a + c.px, 0) }}>
                  <colgroup>
                    <col style={{ width: 6 }} />
                    <col style={{ width: 36 }} />
                    <col />
                    {visibleCols.map((c) => (
                      <col key={c.id} style={{ width: c.px }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
                      <th className="w-1.5 p-0" style={{ backgroundColor: g.color }} />
                      <th className="w-9" />
                      <th className="h-9 min-w-[260px] px-3 text-left text-xs font-medium text-slate-500">
                        <HeaderBtn id="title" label="Task" sort={sort} filtered={filterActive(filters.title)} onOpen={(rect) => setColMenu({ col: "title", rect })} left />
                      </th>
                      {visibleCols.map((c) => (
                        <th key={c.id} className={th}>
                          <HeaderBtn id={c.id} label={c.label} sort={sort} filtered={filterActive(filters[c.id])} onOpen={(rect) => setColMenu({ col: c.id, rect })} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((t) => (
                      <BoardRow
                        key={t.id}
                        task={t}
                        groupColor={g.color}
                        cols={cols}
                        sla={sla}
                        expanded={!!openSubs[t.id]}
                        onToggleExpand={() => setOpenSubs((o) => ({ ...o, [t.id]: !o[t.id] }))}
                        span={visibleCols.length + 1}
                        holidaySet={holidaySet}
                        workSchedule={workSchedule}
                        categoryColors={categoryColors}
                        onOpen={onOpen}
                        onStatusChange={onStatusChange}
                        onPatchTask={onPatchTask}
                        onHoverTask={onHoverTask}
                        onUnhoverTask={onUnhoverTask}
                      />
                    ))}
                    <AddRow colSpan={visibleCols.length + 2} groupColor={g.color} groupLabel={g.label} onAdd={(title) => onQuickAddTo(title, g.patch || {})} />
                    {/* Summary row */}
                    <tr className="bg-white dark:bg-slate-900/40">
                      <td className="w-1.5" />
                      <td />
                      <td />
                      {visibleCols.map((c) => (
                        <td key={c.id} className="px-2 py-2">
                          {c.id === "status" && <SummaryBar items={statusItems} />}
                          {c.id === "priority" && <SummaryBar items={prioItems} />}
                          {c.id === "deadline" && dates.length > 0 && (
                            <div className="whitespace-nowrap rounded-full bg-slate-700 px-2 py-0.5 text-center text-[11px] font-medium text-white">
                              {formatDateTimeDisplay(dates[0]).replace(/ \d{4}$/, "")} – {formatDateTimeDisplay(dates[dates.length - 1]).replace(/ \d{4}$/, "")}
                            </div>
                          )}
                          {c.id === "progress" && g.items.length > 0 && (
                            <p className="text-center text-[11px] font-medium text-slate-500">
                              {Math.round(g.items.reduce((a, t) => a + taskCompletionPct(t), 0) / g.items.length)}% avg
                            </p>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
      {groups.length === 0 && <p className="py-10 text-center text-sm text-slate-400">No tasks match your filters.</p>}
    </div>
  );
}
