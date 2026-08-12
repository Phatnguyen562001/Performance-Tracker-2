import React, { useState, useRef } from "react";
import { GripVertical, Pencil, Plus, RotateCcw, Tag, Trash2, ListPlus, Download, Upload, Building2, UserCog } from "lucide-react";
import { PALETTE, MAX_SUBTASKS } from "../lib/constants";
import { uid, classNames, formatDateDisplay } from "../lib/timeUtils";
import { IconButton, inputClass } from "./ui";

/* =========================================================================
   CATEGORY MANAGER (Settings)
   ========================================================================= */

export function CategoryManager({ categories, setCategories, tasks, setTasks }) {
  const [newCatName, setNewCatName] = useState("");
  const [newSubName, setNewSubName] = useState({});
  const [dragCat, setDragCat] = useState(null);
  const [dragSub, setDragSub] = useState(null); // { catId, index }
  const [expandedSubId, setExpandedSubId] = useState(null);
  const [templateInputs, setTemplateInputs] = useState({});

  function addTemplateItem(cat, sub) {
    const text = (templateInputs[sub.id] || "").trim();
    if (!text) return;
    if ((sub.template || []).length >= MAX_SUBTASKS) return;
    setCategories((cs) =>
      cs.map((c) =>
        c.id === cat.id
          ? { ...c, subcategories: c.subcategories.map((s) => (s.id === sub.id ? { ...s, template: [...(s.template || []), text] } : s)) }
          : c
      )
    );
    setTemplateInputs((m) => ({ ...m, [sub.id]: "" }));
  }

  function removeTemplateItem(cat, sub, idx) {
    setCategories((cs) =>
      cs.map((c) =>
        c.id === cat.id
          ? { ...c, subcategories: c.subcategories.map((s) => (s.id === sub.id ? { ...s, template: (s.template || []).filter((_, i) => i !== idx) } : s)) }
          : c
      )
    );
  }

  function addCategory() {
    const name = newCatName.trim();
    if (!name) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      alert("Category already exists.");
      return;
    }
    setCategories((cs) => [...cs, { id: uid(), name, subcategories: [] }]);
    setNewCatName("");
  }

  function renameCategory(cat) {
    const name = window.prompt("Rename category", cat.name);
    if (!name || !name.trim() || name.trim() === cat.name) return;
    const newName = name.trim();
    if (categories.some((c) => c.id !== cat.id && c.name.toLowerCase() === newName.toLowerCase())) {
      alert("Category already exists.");
      return;
    }
    setCategories((cs) => cs.map((c) => (c.id === cat.id ? { ...c, name: newName } : c)));
    setTasks((ts) => ts.map((t) => (t.category === cat.name ? { ...t, category: newName } : t)));
  }

  function deleteCategory(cat) {
    if (categories.length <= 1) {
      alert("At least one category is required.");
      return;
    }
    const count = tasks.filter((t) => t.category === cat.name).length;
    if (count > 0 && !window.confirm(`${count} task(s) use "${cat.name}". Delete this category and move them to another category?`)) {
      return;
    }
    const fallback = categories.find((c) => c.id !== cat.id);
    setCategories((cs) => cs.filter((c) => c.id !== cat.id));
    if (count > 0) {
      setTasks((ts) =>
        ts.map((t) => (t.category === cat.name ? { ...t, category: fallback.name, subcategory: fallback.subcategories[0]?.name || "" } : t))
      );
    }
  }

  function addSubcategory(cat) {
    const name = (newSubName[cat.id] || "").trim();
    if (!name) return;
    if (cat.subcategories.some((s) => s.name.toLowerCase() === name.toLowerCase())) return;
    setCategories((cs) => cs.map((c) => (c.id === cat.id ? { ...c, subcategories: [...c.subcategories, { id: uid(), name }] } : c)));
    setNewSubName((m) => ({ ...m, [cat.id]: "" }));
  }

  function renameSubcategory(cat, sub) {
    const name = window.prompt("Rename subcategory", sub.name);
    if (!name || !name.trim() || name.trim() === sub.name) return;
    const newName = name.trim();
    setCategories((cs) =>
      cs.map((c) => (c.id === cat.id ? { ...c, subcategories: c.subcategories.map((s) => (s.id === sub.id ? { ...s, name: newName } : s)) } : c))
    );
    setTasks((ts) => ts.map((t) => (t.category === cat.name && t.subcategory === sub.name ? { ...t, subcategory: newName } : t)));
  }

  function deleteSubcategory(cat, sub) {
    const count = tasks.filter((t) => t.category === cat.name && t.subcategory === sub.name).length;
    if (count > 0 && !window.confirm(`${count} task(s) use "${sub.name}". Delete and reassign them?`)) return;
    const fallback = cat.subcategories.find((s) => s.id !== sub.id);
    setCategories((cs) => cs.map((c) => (c.id === cat.id ? { ...c, subcategories: c.subcategories.filter((s) => s.id !== sub.id) } : c)));
    if (count > 0) {
      setTasks((ts) =>
        ts.map((t) => (t.category === cat.name && t.subcategory === sub.name ? { ...t, subcategory: fallback ? fallback.name : "" } : t))
      );
    }
  }

  function dropCategory(targetIdx) {
    if (dragCat === null || dragCat === targetIdx) return;
    setCategories((cs) => {
      const arr = [...cs];
      const [moved] = arr.splice(dragCat, 1);
      arr.splice(targetIdx, 0, moved);
      return arr;
    });
    setDragCat(null);
  }

  function dropSubcategory(cat, targetIdx) {
    if (!dragSub || dragSub.catId !== cat.id || dragSub.index === targetIdx) return;
    setCategories((cs) =>
      cs.map((c) => {
        if (c.id !== cat.id) return c;
        const arr = [...c.subcategories];
        const [moved] = arr.splice(dragSub.index, 1);
        arr.splice(targetIdx, 0, moved);
        return { ...c, subcategories: arr };
      })
    );
    setDragSub(null);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Categories &amp; Subcategories</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Create, rename, delete and reorder freely (drag the handle). Renaming or deleting updates existing tasks automatically.
      </p>

      <div className="mt-4 space-y-3">
        {categories.map((cat, idx) => (
          <div
            key={cat.id}
            draggable
            onDragStart={() => setDragCat(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dropCategory(idx)}
            className={classNames("rounded-lg border border-slate-200 dark:border-slate-700", dragCat === idx && "opacity-40")}
          >
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
              <span className="cursor-grab text-slate-300 hover:text-slate-500 dark:text-slate-600">
                <GripVertical size={15} />
              </span>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
              <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">{cat.name}</span>
              <span className="text-xs text-slate-400">{cat.subcategories.length} sub</span>
              <IconButton title="Rename" onClick={() => renameCategory(cat)}>
                <Pencil size={13} />
              </IconButton>
              <IconButton danger title="Delete" onClick={() => deleteCategory(cat)}>
                <Trash2 size={13} />
              </IconButton>
            </div>
            <div className="space-y-1 px-3 py-2 pl-9">
              {cat.subcategories.map((sub, sIdx) => (
                <div key={sub.id}>
                  <div
                    draggable
                    onDragStart={() => setDragSub({ catId: cat.id, index: sIdx })}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dropSubcategory(cat, sIdx)}
                    className={classNames(
                      "flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60",
                      dragSub && dragSub.catId === cat.id && dragSub.index === sIdx && "opacity-40"
                    )}
                  >
                    <span className="cursor-grab text-slate-300 hover:text-slate-500 dark:text-slate-600">
                      <GripVertical size={13} />
                    </span>
                    <Tag size={12} className="text-slate-400" />
                    <span className="flex-1 text-slate-600 dark:text-slate-300">{sub.name}</span>
                    {sub.template?.length > 0 && <span className="text-[10px] text-slate-400">{sub.template.length} template item(s)</span>}
                    <IconButton
                      title="Edit default subtask checklist"
                      onClick={() => setExpandedSubId(expandedSubId === sub.id ? null : sub.id)}
                    >
                      <ListPlus size={12} />
                    </IconButton>
                    <IconButton title="Rename" onClick={() => renameSubcategory(cat, sub)}>
                      <Pencil size={12} />
                    </IconButton>
                    <IconButton danger title="Delete" onClick={() => deleteSubcategory(cat, sub)}>
                      <Trash2 size={12} />
                    </IconButton>
                  </div>
                  {expandedSubId === sub.id && (
                    <div className="ml-9 mt-1 mb-2 space-y-1.5 rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Default subtasks auto-filled when a new "{sub.name}" task is created.
                      </p>
                      {(sub.template || []).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <span className="flex-1 text-slate-600 dark:text-slate-300">{item}</span>
                          <IconButton danger title="Remove" onClick={() => removeTemplateItem(cat, sub, idx)}>
                            <Trash2 size={11} />
                          </IconButton>
                        </div>
                      ))}
                      {(sub.template || []).length < MAX_SUBTASKS && (
                        <div className="flex gap-1.5 pt-0.5">
                          <input
                            className={classNames(inputClass, "py-1 text-xs")}
                            placeholder="Add checklist item"
                            value={templateInputs[sub.id] || ""}
                            onChange={(e) => setTemplateInputs((m) => ({ ...m, [sub.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && addTemplateItem(cat, sub)}
                          />
                          <button
                            onClick={() => addTemplateItem(cat, sub)}
                            className="shrink-0 rounded-lg border border-dashed border-slate-300 px-2.5 text-xs font-medium text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <input
                  className={classNames(inputClass, "py-1.5 text-xs")}
                  placeholder="New subcategory"
                  value={newSubName[cat.id] || ""}
                  onChange={(e) => setNewSubName((m) => ({ ...m, [cat.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addSubcategory(cat)}
                />
                <button
                  onClick={() => addSubcategory(cat)}
                  className="shrink-0 rounded-lg border border-dashed border-slate-300 px-2.5 text-xs font-medium text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <input
          className={inputClass}
          placeholder="New category name"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCategory()}
        />
        <button onClick={addCategory} className="shrink-0 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500">
          Add category
        </button>
      </div>
    </div>
  );
}


/* =========================================================================
   ASSIGNER & DEPARTMENT MANAGER (Settings)
   ========================================================================= */

export function AssignerManager({ departments, setDepartments, assigners, setAssigners, tasks, setTasks }) {
  const [newDeptName, setNewDeptName] = useState("");
  const [newAssignerName, setNewAssignerName] = useState("");
  const [newAssignerDept, setNewAssignerDept] = useState("");

  function addDepartment() {
    const name = newDeptName.trim();
    if (!name) return;
    if (departments.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      alert("Department already exists.");
      return;
    }
    setDepartments((ds) => [...ds, { id: uid(), name }]);
    setNewDeptName("");
  }

  function renameDepartment(dept) {
    const name = window.prompt("Rename department", dept.name);
    if (!name || !name.trim() || name.trim() === dept.name) return;
    const newName = name.trim();
    if (departments.some((d) => d.id !== dept.id && d.name.toLowerCase() === newName.toLowerCase())) {
      alert("Department already exists.");
      return;
    }
    setDepartments((ds) => ds.map((d) => (d.id === dept.id ? { ...d, name: newName } : d)));
    setAssigners((as) => as.map((a) => (a.department === dept.name ? { ...a, department: newName } : a)));
  }

  function deleteDepartment(dept) {
    const count = assigners.filter((a) => a.department === dept.name).length;
    if (count > 0 && !window.confirm(`${count} assigner(s) belong to "${dept.name}". Delete this department and clear it from them?`)) {
      return;
    }
    setDepartments((ds) => ds.filter((d) => d.id !== dept.id));
    if (count > 0) {
      setAssigners((as) => as.map((a) => (a.department === dept.name ? { ...a, department: "" } : a)));
    }
  }

  function addAssigner() {
    const name = newAssignerName.trim();
    if (!name) return;
    if (assigners.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
      alert("Assigner already exists.");
      return;
    }
    setAssigners((as) => [...as, { id: uid(), name, department: newAssignerDept }]);
    setNewAssignerName("");
  }

  function renameAssigner(assigner) {
    const name = window.prompt("Rename assigner", assigner.name);
    if (!name || !name.trim() || name.trim() === assigner.name) return;
    const newName = name.trim();
    if (assigners.some((a) => a.id !== assigner.id && a.name.toLowerCase() === newName.toLowerCase())) {
      alert("Assigner already exists.");
      return;
    }
    setAssigners((as) => as.map((a) => (a.id === assigner.id ? { ...a, name: newName } : a)));
    setTasks((ts) => ts.map((t) => (t.assigner === assigner.name ? { ...t, assigner: newName } : t)));
  }

  function deleteAssigner(assigner) {
    const count = tasks.filter((t) => t.assigner === assigner.name).length;
    if (count > 0 && !window.confirm(`${count} task(s) are assigned to "${assigner.name}". Delete and clear them from those tasks?`)) {
      return;
    }
    setAssigners((as) => as.filter((a) => a.id !== assigner.id));
    if (count > 0) {
      setTasks((ts) => ts.map((t) => (t.assigner === assigner.name ? { ...t, assigner: "" } : t)));
    }
  }

  function setAssignerDepartment(assigner, deptName) {
    setAssigners((as) => as.map((a) => (a.id === assigner.id ? { ...a, department: deptName } : a)));
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Assigners &amp; Departments</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Pick assigners from this list on a task instead of typing a name each time. Renaming or deleting updates
        existing tasks automatically.
      </p>

      <div className="mt-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <Building2 size={12} /> Departments
        </p>
        <div className="space-y-1">
          {departments.length === 0 && <p className="text-sm text-slate-400">No departments yet.</p>}
          {departments.map((d) => (
            <div key={d.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60">
              <Building2 size={12} className="text-slate-400" />
              <span className="flex-1 text-slate-700 dark:text-slate-200">{d.name}</span>
              <IconButton title="Rename" onClick={() => renameDepartment(d)}>
                <Pencil size={12} />
              </IconButton>
              <IconButton danger title="Delete" onClick={() => deleteDepartment(d)}>
                <Trash2 size={12} />
              </IconButton>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            className={classNames(inputClass, "py-1.5 text-xs")}
            placeholder="New department"
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addDepartment()}
          />
          <button
            onClick={addDepartment}
            className="shrink-0 rounded-lg border border-dashed border-slate-300 px-2.5 text-xs font-medium text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <UserCog size={12} /> Assigners
        </p>
        <div className="space-y-1">
          {assigners.length === 0 && <p className="text-sm text-slate-400">No assigners yet.</p>}
          {assigners.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60">
              <UserCog size={12} className="text-slate-400" />
              <span className="flex-1 text-slate-700 dark:text-slate-200">{a.name}</span>
              <select
                className={classNames(inputClass, "w-40 py-1 text-xs")}
                value={a.department || ""}
                onChange={(e) => setAssignerDepartment(a, e.target.value)}
              >
                <option value="">No department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
              <IconButton title="Rename" onClick={() => renameAssigner(a)}>
                <Pencil size={12} />
              </IconButton>
              <IconButton danger title="Delete" onClick={() => deleteAssigner(a)}>
                <Trash2 size={12} />
              </IconButton>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            className={classNames(inputClass, "py-1.5 text-xs")}
            placeholder="New assigner name"
            value={newAssignerName}
            onChange={(e) => setNewAssignerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addAssigner()}
          />
          <select className={classNames(inputClass, "w-40 py-1.5 text-xs")} value={newAssignerDept} onChange={(e) => setNewAssignerDept(e.target.value)}>
            <option value="">No department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            onClick={addAssigner}
            className="shrink-0 rounded-lg border border-dashed border-slate-300 px-2.5 text-xs font-medium text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}


/* =========================================================================
   SETTINGS VIEW
   ========================================================================= */

export function SettingsView({
  holidays,
  setHolidays,
  categories,
  setCategories,
  departments,
  setDepartments,
  assigners,
  setAssigners,
  tasks,
  setTasks,
  onResetDemo,
  onExportData,
  onImportData,
}) {
  const [newHoliday, setNewHoliday] = useState("");
  const importInputRef = useRef(null);

  function addHoliday() {
    if (!newHoliday) return;
    if (holidays.includes(newHoliday)) return;
    setHolidays([...holidays, newHoliday].sort());
    setNewHoliday("");
  }
  function removeHoliday(d) {
    setHolidays(holidays.filter((h) => h !== d));
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Office hours</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Fixed at Monday–Friday, 08:00–12:00 and 13:00–17:00. Whether a task counts only business hours or full elapsed
          time is set per task, on the task's Time log tab.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
            <p className="text-xs text-slate-400">Morning session</p>
            <p className="font-mono text-slate-700 dark:text-slate-200">08:00 – 12:00</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
            <p className="text-xs text-slate-400">Afternoon session</p>
            <p className="font-mono text-slate-700 dark:text-slate-200">13:00 – 17:00</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Public holidays</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Dates added here are excluded from business-hours calculations.
        </p>
        <div className="mt-3 flex gap-2">
          <input type="date" className={inputClass} value={newHoliday} onChange={(e) => setNewHoliday(e.target.value)} />
          <button onClick={addHoliday} className="shrink-0 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500">
            Add
          </button>
        </div>
        <div className="mt-3 space-y-1.5">
          {holidays.length === 0 && <p className="text-sm text-slate-400">No holidays configured yet.</p>}
          {holidays.map((h) => (
            <div key={h} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-1.5 text-sm dark:border-slate-800">
              <span className="font-mono text-slate-600 dark:text-slate-300">{formatDateDisplay(h)}</span>
              <IconButton danger title="Remove" onClick={() => removeHoliday(h)}>
                <Trash2 size={13} />
              </IconButton>
            </div>
          ))}
        </div>
      </div>

      <CategoryManager categories={categories} setCategories={setCategories} tasks={tasks} setTasks={setTasks} />

      <AssignerManager
        departments={departments}
        setDepartments={setDepartments}
        assigners={assigners}
        setAssigners={setAssigners}
        tasks={tasks}
        setTasks={setTasks}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Data</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          All data is stored locally in this browser only. Back it up regularly — clearing browser data or switching
          devices/browsers will lose everything that isn't exported.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={onExportData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Download size={14} /> Export backup (.json)
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Upload size={14} /> Import backup
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportData(file);
              e.target.value = "";
            }}
          />
          <button
            onClick={onResetDemo}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RotateCcw size={14} /> Reset to demo data
          </button>
        </div>
      </div>
    </div>
  );
}

