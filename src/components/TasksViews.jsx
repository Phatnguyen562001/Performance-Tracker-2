import React, { useState, useMemo } from "react";
import {
  ListChecks,
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  Printer,
  Table2,
  KanbanSquare,
  Play,
  Square,
  Plus,
} from "lucide-react";
import { STATUSES, PRIORITY_DOT, PRIORITY_STYLES, STATUS_STYLES } from "../lib/constants";
import {
  classNames,
  formatYMD,
  addDays,
  formatDateDisplay,
  formatClockTime,
  formatHours,
  todayYMD,
  monthKey,
  taskCompletionPct,
  taskTotalHours,
  isTaskOverdue,
  taskUsesBusinessHours,
  softStyle,
  solidStyle,
} from "../lib/timeUtils";
import { Badge, ProgressBar, EmptyState, IconButton } from "./ui";
import { FilterBar } from "./FilterBar";

/* =========================================================================
   TASK CARD (used in Kanban)
   ========================================================================= */

export function TaskCard({ task, holidaySet, catColor, onClick, draggable, onDragStart, onToggleTimer }) {
  const pct = taskCompletionPct(task);
  const overdue = isTaskOverdue(task);
  const hours = taskTotalHours(task, holidaySet);
  const isRunning = !!task.runningStart;
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/50"
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <Badge className="border-0 px-1.5 py-0" style={softStyle(catColor)}>
          {task.category}
        </Badge>
        <span className={classNames("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[task.priority])} title={task.priority} />
        {!taskUsesBusinessHours(task) && <Clock size={11} className="text-amber-500" titleAccess="Elapsed time" />}
      </div>
      <p className="text-sm font-medium leading-snug text-slate-800 dark:text-slate-100">{task.title}</p>
      <p className="mt-0.5 truncate text-xs text-slate-400">{task.subcategory}</p>
      <div className="mt-2.5">
        <ProgressBar pct={pct} color={catColor} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className={classNames("flex items-center gap-1", overdue && "font-medium text-rose-600 dark:text-rose-400")}>
          <CalendarDays size={12} /> {formatDateDisplay(task.deadline)}
        </span>
        <span className="flex items-center gap-1 font-mono">
          <Clock size={12} /> {formatHours(hours)}
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleTimer(task.id);
        }}
        className={classNames(
          "mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition",
          isRunning
            ? "bg-rose-600 text-white hover:bg-rose-500"
            : "border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300"
        )}
      >
        {isRunning ? (
          <>
            <Square size={12} className="fill-current" /> End (started {formatClockTime(task.runningStart)})
          </>
        ) : (
          <>
            <Play size={12} className="fill-current" /> Start
          </>
        )}
      </button>
    </div>
  );
}


/* =========================================================================
   TASKS VIEW: TABLE / KANBAN / CALENDAR
   ========================================================================= */

export function TaskTable({ tasks, holidaySet, categoryColors, assignerDeptMap, onOpen, onToggleTimer }) {
  if (tasks.length === 0) {
    return <EmptyState icon={ListChecks} title="No tasks found" description="Try adjusting your filters or create a new task to get started." />;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900/60">
          <tr>
            {["Task", "Category", "Priority", "Status", "Assigner", "Deadline", "Progress", "Hours", "Timer"].map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900/40">
          {tasks.map((t) => {
            const pct = taskCompletionPct(t);
            const overdue = isTaskOverdue(t);
            const hours = taskTotalHours(t, holidaySet);
            const color = categoryColors[t.category] || "#64748b";
            const isRunning = !!t.runningStart;
            return (
              <tr
                key={t.id}
                onClick={() => onOpen(t)}
                className={classNames("cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40", isRunning && "bg-rose-50/60 dark:bg-rose-500/5")}
              >
                <td className="max-w-[220px] px-4 py-3">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{t.title}</p>
                  <p className="truncate text-xs text-slate-400">{t.subcategory}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge className="border-0" style={softStyle(color)}>
                    {t.category}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge className={PRIORITY_STYLES[t.priority]}>{t.priority}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge className={STATUS_STYLES[t.status]}>{t.status}</Badge>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  {t.assigner || <span className="text-slate-300 dark:text-slate-600">—</span>}
                  {assignerDeptMap[t.assigner] && <span className="ml-1.5 text-xs text-slate-400">({assignerDeptMap[t.assigner]})</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <span className={classNames("flex items-center gap-1", overdue ? "font-medium text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-300")}>
                    {overdue && <AlertTriangle size={12} />}
                    {formatDateDisplay(t.deadline)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20">
                      <ProgressBar pct={pct} color={color} />
                    </div>
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{pct}%</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    {formatHours(hours)}
                    {!taskUsesBusinessHours(t) && <Clock size={11} className="text-amber-500" />}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTimer(t.id);
                    }}
                    className={classNames(
                      "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                      isRunning
                        ? "bg-rose-600 text-white hover:bg-rose-500"
                        : "border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300"
                    )}
                  >
                    {isRunning ? (
                      <>
                        <Square size={11} className="fill-current" /> End ({formatClockTime(t.runningStart)})
                      </>
                    ) : (
                      <>
                        <Play size={11} className="fill-current" /> Start
                      </>
                    )}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function KanbanBoard({ tasks, holidaySet, categoryColors, onOpen, onStatusChange, onToggleTimer }) {
  const [draggingId, setDraggingId] = useState(null);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {STATUSES.map((status) => {
        const items = tasks.filter((t) => t.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              if (id) onStatusChange(id, status);
              setDraggingId(null);
            }}
            className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/30"
          >
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{status}</span>
              <span className="rounded-full bg-slate-200 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {items.length}
              </span>
            </div>
            <div className="flex-1 space-y-2 px-2.5 pb-3">
              {items.map((t) => (
                <div key={t.id} className={draggingId === t.id ? "opacity-40" : ""}>
                  <TaskCard
                    task={t}
                    holidaySet={holidaySet}
                    catColor={categoryColors[t.category] || "#64748b"}
                    onClick={() => onOpen(t)}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", t.id);
                      setDraggingId(t.id);
                    }}
                    onToggleTimer={onToggleTimer}
                  />
                </div>
              ))}
              {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-xs text-slate-400 dark:border-slate-700">
                  Drop task here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CalendarView({ tasks, categoryColors, onOpen }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = addDays(firstOfMonth, -startOffset);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (!t.deadline) return;
      if (!map[t.deadline]) map[t.deadline] = [];
      map[t.deadline].push(t);
    });
    return map;
  }, [tasks]);

  const today = todayYMD();

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </p>
        <div className="flex items-center gap-1">
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
      </div>
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
          const items = tasksByDate[ymd] || [];
          const isToday = ymd === today;
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <div
              key={i}
              className={classNames(
                "min-h-[92px] border-b border-r border-slate-100 p-1.5 dark:border-slate-800",
                !inMonth && "bg-slate-50/60 dark:bg-slate-900/20",
                isWeekend && inMonth && "bg-slate-50/40 dark:bg-slate-800/20"
              )}
            >
              <span
                className={classNames(
                  "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                  isToday
                    ? "bg-indigo-600 font-semibold text-white"
                    : inMonth
                    ? "text-slate-600 dark:text-slate-300"
                    : "text-slate-300 dark:text-slate-600"
                )}
              >
                {d.getDate()}
              </span>
              <div className="mt-1 space-y-1">
                {items.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onOpen(t)}
                    title={t.title}
                    style={solidStyle(categoryColors[t.category] || "#64748b")}
                    className={classNames(
                      "block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium",
                      isTaskOverdue(t) && "ring-1 ring-rose-400"
                    )}
                  >
                    {t.title}
                  </button>
                ))}
                {items.length > 3 && <p className="px-1 text-[10px] text-slate-400">+{items.length - 3} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* =========================================================================
   TASKS VIEW WRAPPER
   ========================================================================= */

export function TasksView({
  tasks,
  holidaySet,
  categories,
  categoryColors,
  assigners,
  departments,
  assignerDeptMap,
  filters,
  setFilters,
  search,
  onOpen,
  onStatusChange,
  onExportExcel,
  onExportPdf,
  onToggleTimer,
  onQuickAdd,
}) {
  const [viewMode, setViewMode] = useState("table");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState(null); // null = all months
  const [quickTitle, setQuickTitle] = useState("");

  function submitQuickAdd(e) {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onQuickAdd(quickTitle);
    setQuickTitle("");
  }

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (search && !`${t.title} ${t.description}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (filters.category && t.category !== filters.category) return false;
      if (filters.subcategory && t.subcategory !== filters.subcategory) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.status && t.status !== filters.status) return false;
      if (filters.assigner && t.assigner !== filters.assigner) return false;
      if (filters.department && assignerDeptMap[t.assigner] !== filters.department) return false;
      if (filters.from && t.deadline < filters.from) return false;
      if (filters.to && t.deadline > filters.to) return false;
      if (monthCursor && (!t.deadline || !t.deadline.startsWith(monthKey(monthCursor)))) return false;
      return true;
    });
  }, [tasks, search, filters, monthCursor, assignerDeptMap]);

  function shiftMonthCursor(dir) {
    setMonthCursor((cur) => {
      const base = cur || new Date();
      return new Date(base.getFullYear(), base.getMonth() + dir, 1);
    });
  }

  const modeBtn = (id, Icon, label) => (
    <button
      onClick={() => setViewMode(id)}
      className={classNames(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
        viewMode === id
          ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300"
          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
      )}
    >
      <Icon size={14} /> {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <form
        onSubmit={submitQuickAdd}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 dark:border-slate-800 dark:bg-slate-900/60 dark:focus-within:ring-indigo-500/20"
      >
        <Plus size={15} className="shrink-0 text-slate-400" />
        <input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Quick add a task — type a title and press Enter…"
          className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
        />
        {quickTitle.trim() && (
          <button type="submit" className="shrink-0 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500">
            Add
          </button>
        )}
      </form>

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        categories={categories}
        assigners={assigners}
        departments={departments}
        open={filtersOpen}
        setOpen={setFiltersOpen}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/60">
            {modeBtn("table", Table2, "Table")}
            {modeBtn("kanban", KanbanSquare, "Kanban")}
            {modeBtn("calendar", CalendarDays, "Calendar")}
          </div>
          {viewMode !== "calendar" && (
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900/60">
              <IconButton title="Previous month" onClick={() => shiftMonthCursor(-1)}>
                <ChevronLeft size={14} />
              </IconButton>
              <button
                onClick={() => setMonthCursor(null)}
                title="Click to show all months"
                className={classNames(
                  "min-w-[110px] rounded-md px-2 py-1 text-center font-mono text-xs font-medium transition",
                  monthCursor ? "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800" : "text-indigo-600 dark:text-indigo-400"
                )}
              >
                {monthCursor ? monthCursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "All months"}
              </button>
              <IconButton title="Next month" onClick={() => shiftMonthCursor(1)}>
                <ChevronRight size={14} />
              </IconButton>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} task(s)</span>
          <button
            onClick={() => onExportExcel(filtered)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button
            onClick={() => onExportPdf(filtered)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Printer size={13} /> PDF
          </button>
        </div>
      </div>

      {viewMode === "table" && (
        <TaskTable
          tasks={filtered}
          holidaySet={holidaySet}
          categoryColors={categoryColors}
          assignerDeptMap={assignerDeptMap}
          onOpen={onOpen}
          onToggleTimer={onToggleTimer}
        />
      )}
      {viewMode === "kanban" && (
        <KanbanBoard
          tasks={filtered}
          holidaySet={holidaySet}
          categoryColors={categoryColors}
          onOpen={onOpen}
          onStatusChange={onStatusChange}
          onToggleTimer={onToggleTimer}
        />
      )}
      {viewMode === "calendar" && <CalendarView tasks={filtered} categoryColors={categoryColors} onOpen={onOpen} />}
    </div>
  );
}

