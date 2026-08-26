import React, { useState, useMemo } from "react";
import { CheckCircle2, ChevronDown, Circle, Plus, Sparkles, Trash2, Sun } from "lucide-react";
import { uid, classNames, todayYMD, getQuoteOfDay } from "../lib/timeUtils";
import { ProgressBar, EmptyState, IconButton, inputClass } from "./ui";

/* =========================================================================
   EVERYDAY TASKS — a simple, separate daily checklist with a quote of the day
   ========================================================================= */

export function EverydayView({ everydayTasks, everydayCompletions, setEverydayTasks, setEverydayCompletions }) {
  const [expandedId, setExpandedId] = useState(null);
  const [newTitle, setNewTitle] = useState("");

  const today = todayYMD();
  const doneIds = useMemo(() => new Set(everydayCompletions[today] || []), [everydayCompletions, today]);
  const quote = useMemo(() => getQuoteOfDay(), []);

  const total = everydayTasks.length;
  const doneCount = everydayTasks.filter((t) => doneIds.has(t.id)).length;
  const allDone = total > 0 && doneCount === total;

  function toggleDone(id) {
    setEverydayCompletions((prev) => {
      const list = prev[today] || [];
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      return { ...prev, [today]: next };
    });
  }
  function addTask(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setEverydayTasks((prev) => [...prev, { id: uid(), title: newTitle.trim(), note: "" }]);
    setNewTitle("");
  }
  function updateTask(id, patch) {
    setEverydayTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }
  function removeTask(id) {
    setEverydayTasks((prev) => prev.filter((t) => t.id !== id));
    setEverydayCompletions((prev) => {
      const list = prev[today] || [];
      if (!list.includes(id)) return prev;
      return { ...prev, [today]: list.filter((x) => x !== id) };
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 text-center dark:border-indigo-500/20 dark:from-indigo-500/10 dark:to-slate-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-400">
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <p className="mt-2 text-base font-medium italic leading-snug text-slate-700 dark:text-slate-200">"{quote}"</p>
      </div>

      {total > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <ProgressBar pct={total ? (doneCount / total) * 100 : 0} color="#4f46e5" />
          </div>
          <span className="shrink-0 font-mono text-xs text-slate-500 dark:text-slate-400">
            {doneCount}/{total}
          </span>
        </div>
      )}

      {allDone && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
          <Sparkles size={18} />
          <p className="text-sm font-semibold">Good job! Every task on today's list is done. 🎉</p>
        </div>
      )}

      <div className="space-y-2">
        {everydayTasks.length === 0 && (
          <EmptyState icon={Sun} title="No everyday tasks yet" description="Add a few small recurring reminders below — they reset automatically each day." />
        )}
        {everydayTasks.map((t) => {
          const done = doneIds.has(t.id);
          const expanded = expandedId === t.id;
          return (
            <div
              key={t.id}
              className={classNames(
                "rounded-xl border transition",
                done ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/5" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60"
              )}
            >
              <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                <button onClick={() => toggleDone(t.id)} className="shrink-0 text-slate-400">
                  {done ? <CheckCircle2 size={19} className="text-emerald-500" /> : <Circle size={19} />}
                </button>
                <button
                  onClick={() => setExpandedId(expanded ? null : t.id)}
                  className={classNames("flex-1 text-left text-sm", done ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200")}
                >
                  {t.title}
                </button>
                <button onClick={() => setExpandedId(expanded ? null : t.id)} className="shrink-0 text-slate-300 hover:text-slate-500 dark:text-slate-600">
                  <ChevronDown size={15} className={classNames("transition-transform", expanded && "rotate-180")} />
                </button>
                <IconButton danger title="Remove" onClick={() => removeTask(t.id)}>
                  <Trash2 size={13} />
                </IconButton>
              </div>
              {expanded && (
                <div className="border-t border-slate-100 px-3.5 py-2.5 dark:border-slate-800">
                  <textarea
                    className={classNames(inputClass, "min-h-[60px] resize-y text-xs")}
                    value={t.note}
                    onChange={(e) => updateTask(t.id, { note: e.target.value })}
                    placeholder="Add a short note or detail for this task..."
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={addTask} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
        <Plus size={15} className="shrink-0 text-slate-400" />
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add an everyday task..."
          className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
        />
        {newTitle.trim() && (
          <button type="submit" className="shrink-0 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500">
            Add
          </button>
        )}
      </form>
      <p className="text-center text-[11px] text-slate-400">
        This list is separate from your regular Tasks — check marks reset automatically every day.
      </p>
    </div>
  );
}

