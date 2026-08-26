import React, { useState, useRef, useEffect, useCallback } from "react";
import { CheckCircle2, Clock, Repeat, Target, UserCog } from "lucide-react";
import { classNames, taskCompletionPct, formatHours, formatRelativeTime } from "../lib/timeUtils";
import { stringToColor } from "../lib/constants";

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

/**
 * Hover-to-preview (not click): after a short delay while the mouse rests
 * over a task row/card, calls back with the trigger's on-screen position so
 * a single quick-info card can be rendered once, above any scrolling table
 * container (no ancestor "overflow" clipping to worry about).
 */
export function computeHoverPos(rect) {
  const width = 288;
  let left = rect.left;
  if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
  if (left < 12) left = 12;
  let top = rect.bottom + 6;
  if (top + 260 > window.innerHeight) top = Math.max(12, rect.top - 6 - 260);
  return { top, left };
}

export function useHoverIntent(onShow, onHide, delay = 350) {
  const showTimer = useRef(null);
  const hideTimer = useRef(null);

  const onMouseEnter = useCallback(
    (e) => {
      clearTimeout(hideTimer.current);
      const rect = e.currentTarget.getBoundingClientRect();
      showTimer.current = setTimeout(() => onShow(computeHoverPos(rect)), delay);
    },
    [onShow, delay]
  );

  const onMouseLeave = useCallback(() => {
    clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(() => onHide(), 100);
  }, [onHide]);

  useEffect(() => {
    return () => {
      clearTimeout(showTimer.current);
      clearTimeout(hideTimer.current);
    };
  }, []);

  return { onMouseEnter, onMouseLeave };
}

export function TaskQuickInfoCard({ task, assignerDeptMap, pos }) {
  const pct = taskCompletionPct(task);
  const doneSubtasks = task.subtasks?.filter((s) => s.done).length || 0;
  const lastTouched = formatRelativeTime(task.updatedAt || task.createdAt);
  return (
    <div
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
      className="w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
    >
      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{task.title}</p>
      <p className="truncate text-xs text-slate-400">
        {task.category} · {task.subcategory}
      </p>

      <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
        <p className="flex items-center gap-1.5">
          <UserCog size={11} className="shrink-0 text-slate-400" />
          {task.assigner || "Unassigned"}
          {assignerDeptMap[task.assigner] && <span className="text-slate-400">({assignerDeptMap[task.assigner]})</span>}
        </p>
        <p className="flex items-center gap-1.5">
          <CheckCircle2 size={11} className="shrink-0 text-slate-400" />
          {pct}% complete{task.subtasks?.length > 0 && ` (${doneSubtasks}/${task.subtasks.length} subtasks)`}
        </p>
        {task.estimate ? (
          <p className="flex items-center gap-1.5">
            <Target size={11} className="shrink-0 text-slate-400" />
            Estimated {formatHours(task.estimate)}
          </p>
        ) : null}
        {lastTouched && (
          <p className="flex items-center gap-1.5">
            <Clock size={11} className="shrink-0 text-slate-400" />
            Last touched {lastTouched}
          </p>
        )}
      </div>

      {task.description && (
        <p className="mt-2 line-clamp-2 border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {task.description}
        </p>
      )}

      {task.rounds?.length > 0 && (
        <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
          <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <Repeat size={11} /> Rounds ({task.rounds.length})
          </p>
          <div className="space-y-1">
            {task.rounds.slice(0, 3).map((r) => (
              <div key={r.id} className="flex items-start gap-1.5 text-[11px]">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: r.color || stringToColor(r.label || "Round") }} />
                <span className="truncate text-slate-600 dark:text-slate-300">
                  <span className="font-medium">{r.label}</span>
                  {r.note ? ` — ${r.note}` : ""}
                </span>
              </div>
            ))}
            {task.rounds.length > 3 && <p className="pl-3 text-[10px] text-slate-400">+{task.rounds.length - 3} more</p>}
          </div>
        </div>
      )}

      {!task.description && !(task.rounds?.length > 0) && (
        <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-400 dark:border-slate-800">
          Click the task to see full details, subtasks and time log.
        </p>
      )}
    </div>
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

