import React, { useState, useMemo } from "react";
import { X, AlertTriangle, GripVertical, CheckCircle2, Circle, Trash2, Plus, Clock, ChevronRight, Zap } from "lucide-react";
import { PRIORITIES, STATUSES, MAX_SUBTASKS, ROUND_TYPE_SUGGESTIONS, stringToColor } from "../lib/constants";
import {
  uid,
  classNames,
  todayYMD,
  toDateTimeLocalValue,
  sessionMinutes,
  formatHours,
  formatClockTime,
  formatDateDisplay,
  getTemplateSubtasks,
  isTaskCompletedLate,
  lateText,
  getReceivedDate,
  nowHM,
  computeAutoDeadline,
} from "../lib/timeUtils";
import { Field, IconButton, inputClass } from "./ui";

/* =========================================================================
   TASK MODAL (create / edit / detail)
   ========================================================================= */


/* =========================================================================
   ROUNDS FLOW CHART — visual chain of a task's back-and-forth cycles
   ========================================================================= */

export function RoundsFlow({ rounds, fullText = false }) {
  const [openId, setOpenId] = useState(null);
  if (rounds.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-xs text-slate-400 dark:border-slate-700">
        No rounds logged yet — add the first one below.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/30">
      <div className="flex items-stretch gap-1.5" style={{ minWidth: "max-content" }}>
        {rounds.map((r, idx) => {
          const color = r.color || stringToColor(r.label || "Round");
          const expanded = fullText || openId === r.id;
          const long = (r.note || "").length > 60;
          return (
            <React.Fragment key={r.id}>
              <div
                onClick={() => long && !fullText && setOpenId(expanded ? null : r.id)}
                className={"flex shrink-0 flex-col gap-1 rounded-lg border px-3 py-2 " + (expanded ? "w-80" : "w-44") + (long && !fullText ? " cursor-pointer" : "")}
                style={{ borderColor: `${color}40`, backgroundColor: `${color}14` }}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  {r.label || "Round"}
                </div>
                <p
                  className={"whitespace-pre-wrap break-words text-xs font-medium leading-snug text-slate-700 dark:text-slate-200 " + (expanded ? "" : "line-clamp-2")}
                >
                  {r.note || "—"}
                </p>
                {long && !fullText && (
                  <p className="text-[10px] font-medium" style={{ color }}>
                    {expanded ? "Click to collapse" : "Click to read all"}
                  </p>
                )}
                {r.recipient && (
                  <p className="truncate text-[10px] text-slate-500 dark:text-slate-400" title={r.recipient}>
                    → {r.recipient}
                  </p>
                )}
                <p className="font-mono text-[10px] text-slate-400">{formatDateDisplay(r.date)}</p>
              </div>
              {idx < rounds.length - 1 && (
                <div className="flex shrink-0 items-center text-slate-300 dark:text-slate-600">
                  <ChevronRight size={16} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/** Received/deadline defaults. A NEW task gets received = now and, if the
 *  auto-deadline setting is on, deadline = received + N hours. */
function initialDates(task, sla) {
  if (task) {
    return {
      receivedDate: task.receivedDate || getReceivedDate(task) || todayYMD(),
      receivedTime: task.receivedTime || "",
      deadline: task.deadline || todayYMD(),
      deadlineTime: task.deadlineTime || "",
      deadlineAuto: !!task.deadlineAuto,
    };
  }
  const receivedDate = todayYMD();
  const receivedTime = nowHM();
  if (sla.enabled) {
    return { receivedDate, receivedTime, ...computeAutoDeadline(receivedDate, receivedTime, sla.hours), deadlineAuto: true };
  }
  return { receivedDate, receivedTime, deadline: receivedDate, deadlineTime: "", deadlineAuto: false };
}

const dateInputClass = inputClass.replace("w-full", "min-w-0 flex-1");
const timeInputClass = inputClass.replace("w-full", "w-32 shrink-0");

export function TaskModal({ task, categories, assigners, departments = [], onAddAssigner, sla = { enabled: false, hours: 48 }, onClose, onSave, onDelete, holidaySet, workSchedule }) {
  const isEdit = !!task;
  const firstCat = categories[0]?.name || "";
  const firstSub = categories[0]?.subcategories[0]?.name || "";
  const [form, setForm] = useState(() => {
    const initCategory = task?.category || firstCat;
    const initSubcategory = task?.subcategory || firstSub;
    return {
      title: task?.title || "",
      description: task?.description || "",
      assigner: task?.assigner || "",
      ...initialDates(task, sla),
      priority: task?.priority || "Medium",
      category: initCategory,
      subcategory: initSubcategory,
      status: task?.status || "Not Started",
      trackBusinessHours: task?.trackBusinessHours !== false,
      subtasks: task?.subtasks ? [...task.subtasks] : getTemplateSubtasks(categories, initCategory, initSubcategory),
      sessions: task?.sessions ? [...task.sessions] : [],
      rounds: task?.rounds ? [...task.rounds] : [],
      estimate: task?.estimate ?? "",
    };
  });
  const [tab, setTab] = useState("details");
  const [error, setError] = useState("");
  const [dragSubIdx, setDragSubIdx] = useState(null);

  const subcategoryOptions = useMemo(() => {
    return categories.find((c) => c.name === form.category)?.subcategories.map((s) => s.name) || [];
  }, [categories, form.category]);

  const totalHours = useMemo(() => {
    return form.sessions.reduce((sum, s) => sum + sessionMinutes(s, form.trackBusinessHours, holidaySet, workSchedule), 0) / 60;
  }, [form.sessions, form.trackBusinessHours, holidaySet, workSchedule]);

  function update(patch) {
    setForm((f) => ({ ...f, ...patch }));
  }

  // Changing the received date/time re-computes the deadline while it is still on "auto".
  function changeReceived(patch) {
    setForm((f) => {
      const next = { ...f, ...patch };
      if (sla.enabled && f.deadlineAuto) Object.assign(next, computeAutoDeadline(next.receivedDate, next.receivedTime, sla.hours));
      return next;
    });
  }
  function resetToAuto() {
    setForm((f) => ({ ...f, ...computeAutoDeadline(f.receivedDate, f.receivedTime, sla.hours), deadlineAuto: true }));
  }

  // Quick-add assigner (inline, without leaving the task form)
  const [newAssignerOpen, setNewAssignerOpen] = useState(false);
  const [newAssignerName, setNewAssignerName] = useState("");
  const [newAssignerDept, setNewAssignerDept] = useState("");
  const [newAssignerErr, setNewAssignerErr] = useState("");
  function submitNewAssigner() {
    const name = newAssignerName.trim();
    if (!name) {
      setNewAssignerErr("Enter a name.");
      return;
    }
    const existing = assigners.find((a) => a.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      update({ assigner: existing.name });
    } else {
      onAddAssigner && onAddAssigner({ id: uid(), name, department: newAssignerDept });
      update({ assigner: name });
    }
    setNewAssignerName("");
    setNewAssignerDept("");
    setNewAssignerErr("");
    setNewAssignerOpen(false);
  }

  // For brand-new tasks, pre-fill the checklist from the type's template — but
  // only while the subtask list is still empty, so it never overwrites edits.
  function setCategory(cat) {
    const subs = categories.find((c) => c.name === cat)?.subcategories || [];
    const nextSub = subs[0]?.name || "";
    setForm((f) => ({
      ...f,
      category: cat,
      subcategory: nextSub,
      subtasks: !isEdit && f.subtasks.length === 0 ? getTemplateSubtasks(categories, cat, nextSub) : f.subtasks,
    }));
  }

  function setSubcategory(sub) {
    setForm((f) => ({
      ...f,
      subcategory: sub,
      subtasks: !isEdit && f.subtasks.length === 0 ? getTemplateSubtasks(categories, f.category, sub) : f.subtasks,
    }));
  }

  function addSubtask() {
    if (form.subtasks.length >= MAX_SUBTASKS) return;
    setForm((f) => ({ ...f, subtasks: [...f.subtasks, { id: uid(), title: "", done: false }] }));
  }
  function updateSubtask(id, patch) {
    setForm((f) => ({ ...f, subtasks: f.subtasks.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  }
  function removeSubtask(id) {
    setForm((f) => ({ ...f, subtasks: f.subtasks.filter((s) => s.id !== id) }));
  }
  function reorderSubtask(targetIdx) {
    if (dragSubIdx === null || dragSubIdx === targetIdx) return;
    setForm((f) => {
      const arr = [...f.subtasks];
      const [moved] = arr.splice(dragSubIdx, 1);
      arr.splice(targetIdx, 0, moved);
      return { ...f, subtasks: arr };
    });
    setDragSubIdx(null);
  }

  // Rounds are always appended in the order they happened — this is what the
  // flow chart reads left-to-right, so no separate reordering is needed.
  function addRound() {
    setForm((f) => ({
      ...f,
      rounds: [...f.rounds, { id: uid(), date: todayYMD(), label: "Sent", recipient: "", note: "", color: stringToColor("Sent") }],
    }));
  }
  function updateRound(id, patch) {
    setForm((f) => ({ ...f, rounds: f.rounds.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  }
  function removeRound(id) {
    setForm((f) => ({ ...f, rounds: f.rounds.filter((r) => r.id !== id) }));
  }

  function addSession() {
    const now = new Date();
    setForm((f) => ({
      ...f,
      sessions: [...f.sessions, { id: uid(), start: toDateTimeLocalValue(now), end: toDateTimeLocalValue(now), overtime: false }],
    }));
  }
  function updateSession(id, patch) {
    setForm((f) => ({ ...f, sessions: f.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  }
  function removeSession(id) {
    setForm((f) => ({ ...f, sessions: f.sessions.filter((s) => s.id !== id) }));
  }

  function handleSubmit() {
    if (!form.title.trim()) {
      setError("Task title is required.");
      setTab("details");
      return;
    }
    setError("");
    const estimateNum = form.estimate === "" || form.estimate === null ? null : Number(form.estimate);
    onSave({ ...form, title: form.title.trim(), estimate: estimateNum && estimateNum > 0 ? estimateNum : null });
  }

  const tabs = [
    { id: "details", label: "Details" },
    { id: "rounds", label: `Rounds (${form.rounds.length})` },
    { id: "subtasks", label: `Subtasks (${form.subtasks.length}/${MAX_SUBTASKS})` },
    { id: "time", label: `Time log (${formatHours(totalHours)})` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 px-4 py-6 sm:items-center">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            {isEdit ? "Edit Task" : "New Task"}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-100 px-5 dark:border-slate-800">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={classNames(
                "border-b-2 px-2 py-2.5 text-sm font-medium transition",
                tab === t.id
                  ? "border-indigo-600 text-indigo-700 dark:text-indigo-300"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {tab === "details" && (
            <div className="space-y-3">
              <Field label="Task title" required>
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => update({ title: e.target.value })}
                  placeholder="e.g. Review vendor supply agreement"
                />
              </Field>
              <Field label="Description">
                <textarea
                  className={classNames(inputClass, "min-h-[70px] resize-y")}
                  value={form.description}
                  onChange={(e) => update({ description: e.target.value })}
                  placeholder="Add relevant context or scope..."
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Received (date & time)">
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className={dateInputClass}
                      value={form.receivedDate}
                      onChange={(e) => changeReceived({ receivedDate: e.target.value })}
                    />
                    <input
                      type="time"
                      className={timeInputClass}
                      value={form.receivedTime}
                      onChange={(e) => changeReceived({ receivedTime: e.target.value })}
                    />
                  </div>
                </Field>
                <Field label="Deadline (date & time)">
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className={dateInputClass}
                      value={form.deadline}
                      onChange={(e) => update({ deadline: e.target.value, deadlineAuto: false })}
                    />
                    <input
                      type="time"
                      className={timeInputClass}
                      value={form.deadlineTime}
                      onChange={(e) => update({ deadlineTime: e.target.value, deadlineAuto: false })}
                    />
                  </div>
                  {sla.enabled && form.deadlineAuto && (
                    <p className="mt-1 text-[11px] text-indigo-600 dark:text-indigo-400">Auto: received + {sla.hours}h</p>
                  )}
                  {sla.enabled && !form.deadlineAuto && (
                    <button type="button" onClick={resetToAuto} className="mt-1 text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                      Reset to auto (received + {sla.hours}h)
                    </button>
                  )}
                  {form.receivedDate && form.deadline && form.deadline < form.receivedDate && (
                    <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Deadline is before the received date.</p>
                  )}
                  {isEdit && isTaskCompletedLate(task) && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                      <Clock size={11} /> Completed {lateText(task)} after this deadline.
                    </p>
                  )}
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <Field label="Assigner">
                  <select className={inputClass} value={form.assigner} onChange={(e) => update({ assigner: e.target.value })}>
                    <option value="">Select assigner…</option>
                    {form.assigner && !assigners.some((a) => a.name === form.assigner) && (
                      <option value={form.assigner}>{form.assigner} (not in list)</option>
                    )}
                    {assigners.map((a) => (
                      <option key={a.id} value={a.name}>
                        {a.name}
                        {a.department ? ` — ${a.department}` : ""}
                      </option>
                    ))}
                  </select>
                  {!newAssignerOpen && (
                    <button type="button" onClick={() => setNewAssignerOpen(true)} className="mt-1 text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                      + Add a new assigner
                    </button>
                  )}
                  {newAssignerOpen && (
                    <div className="mt-2 space-y-2 rounded-lg border border-indigo-200 bg-indigo-50/50 p-2.5 dark:border-indigo-500/30 dark:bg-indigo-500/5">
                      <input
                        autoFocus
                        className={inputClass}
                        placeholder="New assigner's name"
                        value={newAssignerName}
                        onChange={(e) => setNewAssignerName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            submitNewAssigner();
                          }
                        }}
                      />
                      <select className={inputClass} value={newAssignerDept} onChange={(e) => setNewAssignerDept(e.target.value)}>
                        <option value="">No department</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                      {newAssignerErr && <p className="text-[11px] text-rose-600">{newAssignerErr}</p>}
                      <div className="flex gap-2">
                        <button type="button" onClick={submitNewAssigner} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
                          Add &amp; select
                        </button>
                        <button type="button" onClick={() => setNewAssignerOpen(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Priority">
                  <select className={inputClass} value={form.priority} onChange={(e) => update({ priority: e.target.value })}>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select className={inputClass} value={form.status} onChange={(e) => update({ status: e.target.value })}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <select className={inputClass} value={form.category} onChange={(e) => setCategory(e.target.value)}>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Subcategory">
                  <select
                    className={inputClass}
                    value={form.subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    disabled={subcategoryOptions.length === 0}
                  >
                    {subcategoryOptions.length === 0 && <option value="">No subcategories</option>}
                    {subcategoryOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          )}

          {tab === "rounds" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                For work that goes back and forth (e.g. contract review cycles) — log each round here instead of
                creating separate tasks. The chart below reads left-to-right in the order you add them.
              </p>

              <RoundsFlow rounds={form.rounds} />

              <datalist id="round-type-suggestions">
                {[...new Set([...ROUND_TYPE_SUGGESTIONS, ...form.rounds.map((r) => r.label).filter(Boolean)])].map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>

              <div className="space-y-2 pt-1">
                {form.rounds.map((r) => (
                  <div key={r.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Type">
                        <div className="flex items-stretch gap-1.5">
                          <input
                            className={inputClass}
                            list="round-type-suggestions"
                            value={r.label}
                            onChange={(e) => updateRound(r.id, { label: e.target.value })}
                            placeholder="e.g. Sent, Received, Internal..."
                          />
                          <input
                            type="color"
                            value={r.color || stringToColor(r.label || "Round")}
                            onChange={(e) => updateRound(r.id, { color: e.target.value })}
                            title="Pick a color for this round"
                            className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800"
                          />
                        </div>
                      </Field>
                      <Field label="Recipient">
                        <input
                          className={inputClass}
                          value={r.recipient || ""}
                          onChange={(e) => updateRound(r.id, { recipient: e.target.value })}
                          placeholder="e.g. Vendor Legal Team"
                        />
                      </Field>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Field label="Date">
                        <input type="date" className={inputClass} value={r.date} onChange={(e) => updateRound(r.id, { date: e.target.value })} />
                      </Field>
                      <div className="flex items-end justify-end">
                        <IconButton danger title="Remove round" onClick={() => removeRound(r.id)}>
                          <Trash2 size={14} />
                        </IconButton>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Field label="Note">
                        <textarea
                          className={classNames(inputClass, "min-h-[64px] resize-y")}
                          value={r.note}
                          onChange={(e) => updateRound(r.id, { note: e.target.value })}
                          placeholder='e.g. "V1 sent to vendor for comments"'
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addRound}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:hover:border-indigo-500"
              >
                <Plus size={13} /> Add round
              </button>
            </div>
          )}

          {tab === "subtasks" && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Up to {MAX_SUBTASKS} subtasks. Drag the handle to reorder. Completion % updates automatically from the
                subtasks marked done.
              </p>
              {form.subtasks.map((s, idx) => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", s.id);
                    setDragSubIdx(idx);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    reorderSubtask(idx);
                  }}
                  className={classNames("flex items-center gap-2 rounded-lg", dragSubIdx === idx && "opacity-40")}
                >
                  <span className="cursor-grab text-slate-300 hover:text-slate-500 dark:text-slate-600">
                    <GripVertical size={15} />
                  </span>
                  <button onClick={() => updateSubtask(s.id, { done: !s.done })} className="shrink-0 text-slate-400">
                    {s.done ? <CheckCircle2 size={19} className="text-emerald-500" /> : <Circle size={19} />}
                  </button>
                  <input
                    className={classNames(inputClass, s.done && "line-through text-slate-400")}
                    value={s.title}
                    onChange={(e) => updateSubtask(s.id, { title: e.target.value })}
                    placeholder={`Subtask ${idx + 1}`}
                  />
                  <IconButton danger title="Remove" onClick={() => removeSubtask(s.id)}>
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              ))}
              {form.subtasks.length < MAX_SUBTASKS && (
                <button
                  onClick={addSubtask}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:hover:border-indigo-500"
                >
                  <Plus size={13} /> Add subtask
                </button>
              )}
            </div>
          )}

          {tab === "time" && (
            <div className="space-y-3">
              {isEdit && task.runningStart && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Started at {formatClockTime(task.runningStart)} — press the same button in the task list to end it.
                </div>
              )}
              <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <Clock size={14} /> Count only Business Hours
                </span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-indigo-600"
                  checked={form.trackBusinessHours}
                  onChange={(e) => update({ trackBusinessHours: e.target.checked })}
                />
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {form.trackBusinessHours
                  ? "Only Mon–Fri, 08:00–12:00 & 13:00–17:00 is counted. Evenings, weekends and holidays are excluded."
                  : "Total elapsed time is counted, including evenings, weekends and overtime."}
              </p>
              <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2 text-sm dark:bg-indigo-500/10">
                <span className="text-indigo-700 dark:text-indigo-300">Total hours logged</span>
                <span className="font-mono text-base font-semibold text-indigo-700 dark:text-indigo-300">
                  {formatHours(totalHours)}
                </span>
              </div>

              <Field label="Estimated time (optional)">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className={classNames(inputClass, "w-28")}
                    value={form.estimate}
                    onChange={(e) => update({ estimate: e.target.value })}
                    placeholder="e.g. 4"
                  />
                  <span className="text-xs text-slate-400">hours</span>
                  {form.estimate !== "" && Number(form.estimate) > 0 && (
                    <span className="text-xs text-slate-400">
                      ({totalHours > Number(form.estimate) ? "+" : ""}
                      {(totalHours - Number(form.estimate)).toFixed(1)}h vs. logged so far)
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Not shown on the task list — used only to compare estimate vs. actual on the Analytics page.
                </p>
              </Field>

              {form.sessions.map((s) => {
                const h = sessionMinutes(s, form.trackBusinessHours, holidaySet, workSchedule) / 60;
                return (
                  <div key={s.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Start">
                        <input
                          type="datetime-local"
                          className={inputClass}
                          value={s.start}
                          onChange={(e) => updateSession(s.id, { start: e.target.value })}
                        />
                      </Field>
                      <Field label="End">
                        <input
                          type="datetime-local"
                          className={inputClass}
                          value={s.end}
                          onChange={(e) => updateSession(s.id, { end: e.target.value })}
                        />
                      </Field>
                    </div>
                    <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-amber-600"
                        checked={!!s.overtime}
                        onChange={(e) => updateSession(s.id, { overtime: e.target.checked })}
                      />
                      <Zap size={12} className="text-amber-500" />
                      Overtime — count full hours, even outside business hours
                    </label>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        = {formatHours(h)} logged {s.overtime && <span className="text-amber-600 dark:text-amber-400">(overtime)</span>}
                      </span>
                      <IconButton danger title="Remove session" onClick={() => removeSession(s.id)}>
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  </div>
                );
              })}
              <button
                onClick={addSession}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:hover:border-indigo-500"
              >
                <Plus size={13} /> Add work session
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <div>
            {isEdit && (
              <button
                onClick={() => onDelete(task.id)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              {isEdit ? "Save changes" : "Create task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

