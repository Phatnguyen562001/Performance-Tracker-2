import React, { useState, useMemo } from "react";
import { X, AlertTriangle, GripVertical, CheckCircle2, Circle, Trash2, Plus, Clock } from "lucide-react";
import { PRIORITIES, STATUSES, MAX_SUBTASKS } from "../lib/constants";
import {
  uid,
  classNames,
  todayYMD,
  toDateTimeLocalValue,
  sessionMinutes,
  formatHours,
  formatClockTime,
  getTemplateSubtasks,
} from "../lib/timeUtils";
import { Field, IconButton, inputClass } from "./ui";

/* =========================================================================
   TASK MODAL (create / edit / detail)
   ========================================================================= */

export function TaskModal({ task, categories, assigners, onClose, onSave, onDelete, holidaySet }) {
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
      deadline: task?.deadline || todayYMD(),
      priority: task?.priority || "Medium",
      category: initCategory,
      subcategory: initSubcategory,
      status: task?.status || "Not Started",
      trackBusinessHours: task?.trackBusinessHours !== false,
      subtasks: task?.subtasks ? [...task.subtasks] : getTemplateSubtasks(categories, initCategory, initSubcategory),
      sessions: task?.sessions ? [...task.sessions] : [],
    };
  });
  const [tab, setTab] = useState("details");
  const [error, setError] = useState("");
  const [dragSubIdx, setDragSubIdx] = useState(null);

  const subcategoryOptions = useMemo(() => {
    return categories.find((c) => c.name === form.category)?.subcategories.map((s) => s.name) || [];
  }, [categories, form.category]);

  const totalHours = useMemo(() => {
    return form.sessions.reduce((sum, s) => sum + sessionMinutes(s, form.trackBusinessHours, holidaySet), 0) / 60;
  }, [form.sessions, form.trackBusinessHours, holidaySet]);

  function update(patch) {
    setForm((f) => ({ ...f, ...patch }));
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

  function addSession() {
    const now = new Date();
    setForm((f) => ({
      ...f,
      sessions: [...f.sessions, { id: uid(), start: toDateTimeLocalValue(now), end: toDateTimeLocalValue(now) }],
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
    onSave({ ...form, title: form.title.trim() });
  }

  const tabs = [
    { id: "details", label: "Details" },
    { id: "subtasks", label: `Subtasks (${form.subtasks.length}/${MAX_SUBTASKS})` },
    { id: "time", label: `Time log (${formatHours(totalHours)})` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 px-4 py-6 backdrop-blur-sm sm:items-center">
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
              <div className="grid grid-cols-2 gap-3">
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
                  {assigners.length === 0 && (
                    <p className="mt-1 text-[11px] text-slate-400">No assigners yet — add them in Settings → Assigners &amp; Departments.</p>
                  )}
                </Field>
                <Field label="Deadline">
                  <input
                    type="date"
                    className={inputClass}
                    value={form.deadline}
                    onChange={(e) => update({ deadline: e.target.value })}
                  />
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
              {form.sessions.map((s) => {
                const h = sessionMinutes(s, form.trackBusinessHours, holidaySet) / 60;
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
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">= {formatHours(h)} logged</span>
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

