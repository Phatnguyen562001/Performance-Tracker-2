import React, { useMemo } from "react";
import { ListChecks, CheckCircle2, TrendingUp, AlertTriangle, ArrowUpRight, Clock, FolderTree } from "lucide-react";
import {
  formatYMD,
  addDays,
  todayYMD,
  formatDateDisplay,
  formatHours,
  taskTotalHours,
  isTaskOverdue,
  isTaskCompletedLate,
} from "../lib/timeUtils";
import { StatCard, ProgressBar } from "./ui";

/* =========================================================================
   DASHBOARD VIEW
   ========================================================================= */

export function DashboardView({ tasks, holidaySet, workSchedule, categoryCount, onOpen, onViewTypes }) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "Completed").length;
    const inProgress = tasks.filter((t) => t.status === "In Progress").length;
    const overdue = tasks.filter(isTaskOverdue).length;
    const completedLate = tasks.filter(isTaskCompletedLate).length;
    const totalHours = tasks.reduce((sum, t) => sum + taskTotalHours(t, holidaySet, workSchedule), 0);
    const completionRate = total ? (completed / total) * 100 : 0;
    const avgHoursPerTask = total ? totalHours / total : 0;

    const bySub = {};
    tasks.forEach((t) => {
      const h = taskTotalHours(t, holidaySet, workSchedule);
      if (h <= 0) return;
      if (!bySub[t.subcategory]) bySub[t.subcategory] = { hours: 0, count: 0 };
      bySub[t.subcategory].hours += h;
      bySub[t.subcategory].count += 1;
    });
    const avgBySub = Object.entries(bySub)
      .map(([name, v]) => ({ name, avg: v.hours / v.count }))
      .sort((a, b) => b.avg - a.avg);

    return { total, completed, inProgress, overdue, completedLate, totalHours, completionRate, avgHoursPerTask, avgBySub };
  }, [tasks, holidaySet, workSchedule]);

  const upcoming = useMemo(() => {
    const today = todayYMD();
    const limit = formatYMD(addDays(new Date(), 7));
    return tasks
      .filter((t) => t.status !== "Completed" && t.deadline >= today && t.deadline <= limit)
      .sort((a, b) => a.deadline.localeCompare(b.deadline))
      .slice(0, 6);
  }, [tasks]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={ListChecks} label="Total Tasks" value={stats.total} />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} accent="text-emerald-600 dark:text-emerald-400" />
        <StatCard icon={TrendingUp} label="In Progress" value={stats.inProgress} accent="text-indigo-600 dark:text-indigo-400" />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue} accent="text-rose-600 dark:text-rose-400" />
        <StatCard icon={Clock} label="Completed Late" value={stats.completedLate} accent="text-amber-600 dark:text-amber-400" />
        <StatCard icon={ArrowUpRight} label="Completion Rate" value={`${stats.completionRate.toFixed(0)}%`} accent="text-emerald-600 dark:text-emerald-400" />
        <StatCard icon={Clock} label="Total Hours" value={formatHours(stats.totalHours)} accent="text-amber-600 dark:text-amber-400" />
        <StatCard icon={Clock} label="Avg Hours / Task" value={formatHours(stats.avgHoursPerTask)} accent="text-amber-600 dark:text-amber-400" />
        <StatCard icon={FolderTree} label="Categories" value={categoryCount} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Average hours per task type</p>
            <button onClick={onViewTypes} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              Full breakdown <ArrowUpRight size={12} />
            </button>
          </div>
          {stats.avgBySub.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Log work sessions to see averages here.</p>
          ) : (
            <div className="space-y-2.5">
              {stats.avgBySub.slice(0, 8).map((row) => (
                <div key={row.name} className="flex items-center gap-3 text-sm">
                  <span className="w-40 shrink-0 truncate text-slate-600 dark:text-slate-300">{row.name}</span>
                  <div className="flex-1">
                    <ProgressBar pct={Math.min(100, (row.avg / (stats.avgBySub[0].avg || 1)) * 100)} />
                  </div>
                  <span className="w-16 shrink-0 text-right font-mono text-xs text-slate-500 dark:text-slate-400">
                    {formatHours(row.avg)}/task
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60 lg:col-span-2">
          <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Upcoming deadlines (7 days)</p>
          {upcoming.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Nothing due in the next 7 days.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onOpen(t)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-left text-sm transition hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-slate-800 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/5"
                >
                  <span className="truncate pr-2 text-slate-700 dark:text-slate-200">{t.title}</span>
                  <span className="shrink-0 font-mono text-xs text-slate-500 dark:text-slate-400">{formatDateDisplay(t.deadline)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

