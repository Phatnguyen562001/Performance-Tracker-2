import React, { useState, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { uid, classNames, todayYMD, formatYMD, addDays, isTaskOverdue, solidStyle } from "../lib/timeUtils";
import { Field, IconButton, inputClass } from "./ui";

/* =========================================================================
   CALENDAR (planning) — a dedicated Google-Calendar-like page that shows
   Task deadlines automatically alongside your own free-form Plans.
   ========================================================================= */

export function EventModal({ event, onClose, onSave, onDelete }) {
  const isEdit = !!event?.id;
  const [form, setForm] = useState(() => ({
    title: event?.title || "",
    date: event?.date || todayYMD(),
    time: event?.time || "",
    note: event?.note || "",
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{isEdit ? "Edit plan" : "New plan"}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3 px-4 py-4">
          <Field label="Title" required>
            <input
              autoFocus
              className={inputClass}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Call with vendor legal team"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Date">
              <input type="date" className={inputClass} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </Field>
            <Field label="Time (optional)">
              <input type="time" className={inputClass} value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
            </Field>
          </div>
          <Field label="Note (optional)">
            <textarea
              className={classNames(inputClass, "min-h-[60px] resize-y")}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Any detail worth remembering..."
            />
          </Field>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          {isEdit ? (
            <button onClick={() => onDelete(event.id)} className="flex items-center gap-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg px-2 py-1.5 dark:hover:bg-rose-500/10">
              <Trash2 size={14} /> Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              Cancel
            </button>
            <button
              onClick={() => {
                if (!form.title.trim()) return;
                onSave({ ...event, ...form, title: form.title.trim() });
              }}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CalendarPageView({ tasks, events, categoryColors, onOpenTask, onSaveEvent, onDeleteEvent }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [editingEvent, setEditingEvent] = useState(undefined); // undefined = closed, object = editing/new

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = addDays(firstOfMonth, -startOffset);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = todayYMD();

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (!t.deadline) return;
      (map[t.deadline] = map[t.deadline] || []).push(t);
    });
    return map;
  }, [tasks]);
  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      if (!e.date) return;
      (map[e.date] = map[e.date] || []).push(e);
    });
    Object.values(map).forEach((list) => list.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99")));
    return map;
  }, [events]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          <p className="min-w-[150px] text-sm font-semibold text-slate-800 dark:text-slate-100">
            {cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </p>
          <IconButton title="Previous month" onClick={() => setCursor(new Date(year, month - 1, 1))}>
            <ChevronLeft size={14} />
          </IconButton>
          <button
            onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Today
          </button>
          <IconButton title="Next month" onClick={() => setCursor(new Date(year, month + 1, 1))}>
            <ChevronRight size={14} />
          </IconButton>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-400" /> Task deadline
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-violet-500" /> Your plan
          </span>
        </div>
        <button
          onClick={() => setEditingEvent({ date: today })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
        >
          <Plus size={13} /> Add plan
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
        <div className="grid grid-cols-7 border-b border-slate-100 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const ymd = formatYMD(d);
            const inMonth = d.getMonth() === month;
            const dayTasks = tasksByDate[ymd] || [];
            const dayEvents = eventsByDate[ymd] || [];
            const isToday = ymd === today;
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const items = [...dayEvents.map((e) => ({ ...e, __kind: "event" })), ...dayTasks.map((t) => ({ ...t, __kind: "task" }))];
            return (
              <div
                key={i}
                className={classNames(
                  "group min-h-[104px] border-b border-r border-slate-100 p-1.5 dark:border-slate-800",
                  !inMonth && "bg-slate-50/60 dark:bg-slate-900/20",
                  isWeekend && inMonth && "bg-slate-50/40 dark:bg-slate-800/20"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={classNames(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                      isToday ? "bg-indigo-600 font-semibold text-white" : inMonth ? "text-slate-600 dark:text-slate-300" : "text-slate-300 dark:text-slate-600"
                    )}
                  >
                    {d.getDate()}
                  </span>
                  <button
                    onClick={() => setEditingEvent({ date: ymd })}
                    title="Add plan on this day"
                    className="hidden h-4 w-4 items-center justify-center rounded text-slate-300 hover:bg-slate-100 hover:text-indigo-600 group-hover:flex dark:hover:bg-slate-800"
                  >
                    <Plus size={11} />
                  </button>
                </div>
                <div className="mt-1 space-y-1">
                  {items.slice(0, 3).map((it) =>
                    it.__kind === "event" ? (
                      <button
                        key={`e-${it.id}`}
                        onClick={() => setEditingEvent(it)}
                        title={it.title}
                        className="flex w-full items-center gap-1 truncate rounded bg-violet-100 px-1.5 py-0.5 text-left text-[11px] font-medium text-violet-700 hover:bg-violet-200 dark:bg-violet-500/15 dark:text-violet-300"
                      >
                        {it.time && <span className="font-mono text-[10px] opacity-80">{it.time}</span>}
                        <span className="truncate">{it.title}</span>
                      </button>
                    ) : (
                      <button
                        key={`t-${it.id}`}
                        onClick={() => onOpenTask(it)}
                        title={it.title}
                        style={solidStyle(categoryColors[it.category] || "#64748b")}
                        className={classNames("block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium", isTaskOverdue(it) && "ring-1 ring-rose-400")}
                      >
                        {it.title}
                      </button>
                    )
                  )}
                  {items.length > 3 && <p className="px-1 text-[10px] text-slate-400">+{items.length - 3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editingEvent !== undefined && (
        <EventModal
          event={editingEvent}
          onClose={() => setEditingEvent(undefined)}
          onSave={(data) => {
            onSaveEvent(data);
            setEditingEvent(undefined);
          }}
          onDelete={(id) => {
            onDeleteEvent(id);
            setEditingEvent(undefined);
          }}
        />
      )}
    </div>
  );
}

