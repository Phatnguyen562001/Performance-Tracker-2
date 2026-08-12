import React, { useState, useMemo } from "react";
import { ListChecks, CheckCircle2, TrendingUp, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  Line,
} from "recharts";
import { PRIORITIES, PRIORITY_HEX, PALETTE } from "../lib/constants";
import {
  classNames,
  parseYMD,
  formatHours,
  taskTotalHours,
  taskUsesBusinessHours,
  sessionMinutes,
  getPeriodRange,
  periodLabel,
  shiftPeriod,
  inDateRange,
  getSubBuckets,
} from "../lib/timeUtils";
import { StatCard, IconButton } from "./ui";

/* =========================================================================
   ANALYTICS VIEW
   ========================================================================= */

export function ChartCard({ title, children, className }) {
  return (
    <div className={classNames("rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60", className)}>
      <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      {children}
    </div>
  );
}

export function AnalyticsView({ tasks, holidaySet, categoryColors, assignerDeptMap, theme }) {
  const [periodType, setPeriodType] = useState("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const range = useMemo(() => getPeriodRange(periodType, anchor), [periodType, anchor]);

  const gridColor = theme === "dark" ? "#334155" : "#e2e8f0";
  const textColor = theme === "dark" ? "#94a3b8" : "#64748b";
  const tooltipStyle = {
    background: theme === "dark" ? "#1e293b" : "#ffffff",
    border: `1px solid ${gridColor}`,
    borderRadius: 8,
    fontSize: 12,
    color: theme === "dark" ? "#e2e8f0" : "#1e293b",
  };

  // Tasks "relevant" to this period = deadline falls inside the period.
  const periodTasks = useMemo(() => tasks.filter((t) => t.deadline && inDateRange(parseYMD(t.deadline), range)), [tasks, range]);
  const completedInPeriod = useMemo(
    () => tasks.filter((t) => t.status === "Completed" && t.completedAt && inDateRange(new Date(t.completedAt), range)),
    [tasks, range]
  );
  const hoursInPeriod = useMemo(() => {
    let total = 0;
    tasks.forEach((t) => {
      const businessOnly = taskUsesBusinessHours(t);
      (t.sessions || []).forEach((s) => {
        if (!s.start) return;
        if (inDateRange(new Date(s.start), range)) total += sessionMinutes(s, businessOnly, holidaySet) / 60;
      });
    });
    return total;
  }, [tasks, range, holidaySet]);

  const kpis = useMemo(
    () => ({
      total: periodTasks.length,
      completed: completedInPeriod.length,
      hours: hoursInPeriod,
      avgHours: periodTasks.length ? hoursInPeriod / periodTasks.length : 0,
    }),
    [periodTasks, completedInPeriod, hoursInPeriod]
  );

  const byCategory = useMemo(() => {
    const map = {};
    periodTasks.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [periodTasks]);

  const byPriority = useMemo(() => PRIORITIES.map((p) => ({ name: p, value: periodTasks.filter((t) => t.priority === p).length })), [periodTasks]);

  const trend = useMemo(() => {
    const buckets = getSubBuckets(periodType, anchor);
    return buckets.map((b) => {
      let completed = 0;
      let hours = 0;
      tasks.forEach((t) => {
        if (t.status === "Completed" && t.completedAt && inDateRange(new Date(t.completedAt), b)) completed += 1;
        const businessOnly = taskUsesBusinessHours(t);
        (t.sessions || []).forEach((s) => {
          if (s.start && inDateRange(new Date(s.start), b)) hours += sessionMinutes(s, businessOnly, holidaySet) / 60;
        });
      });
      return { label: b.label, completed, hours: +hours.toFixed(1) };
    });
  }, [tasks, periodType, anchor, holidaySet]);

  const avgBySubcategory = useMemo(() => {
    const bySub = {};
    periodTasks.forEach((t) => {
      const h = taskTotalHours(t, holidaySet);
      if (h <= 0) return;
      if (!bySub[t.subcategory]) bySub[t.subcategory] = { hours: 0, count: 0 };
      bySub[t.subcategory].hours += h;
      bySub[t.subcategory].count += 1;
    });
    return Object.entries(bySub)
      .map(([name, v]) => ({ name, avg: +(v.hours / v.count).toFixed(1) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8);
  }, [periodTasks, holidaySet]);

  const topAssigners = useMemo(() => {
    const map = {};
    periodTasks.forEach((t) => {
      if (!t.assigner) return;
      map[t.assigner] = (map[t.assigner] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [periodTasks]);

  const byDepartment = useMemo(() => {
    const map = {};
    periodTasks.forEach((t) => {
      const dept = t.assigner ? assignerDeptMap[t.assigner] : null;
      const key = dept || "No department";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [periodTasks, assignerDeptMap]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/60">
          <button
            onClick={() => setPeriodType("month")}
            className={classNames("rounded-md px-3 py-1.5 text-sm font-medium transition", periodType === "month" ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
          >
            Monthly
          </button>
          <button
            onClick={() => setPeriodType("quarter")}
            className={classNames("rounded-md px-3 py-1.5 text-sm font-medium transition", periodType === "quarter" ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
          >
            Quarterly
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <IconButton title="Previous period" onClick={() => setAnchor(shiftPeriod(periodType, anchor, -1))}>
            <ChevronLeft size={14} />
          </IconButton>
          <span className="min-w-[120px] text-center font-mono text-sm text-slate-700 dark:text-slate-200">{periodLabel(periodType, anchor)}</span>
          <IconButton title="Next period" onClick={() => setAnchor(shiftPeriod(periodType, anchor, 1))}>
            <ChevronRight size={14} />
          </IconButton>
          <button
            onClick={() => setAnchor(new Date())}
            className="ml-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            This {periodType}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={ListChecks} label={`Tasks (${periodLabel(periodType, anchor)})`} value={kpis.total} />
        <StatCard icon={CheckCircle2} label="Completed" value={kpis.completed} accent="text-emerald-600 dark:text-emerald-400" />
        <StatCard icon={Clock} label="Hours logged" value={formatHours(kpis.hours)} accent="text-amber-600 dark:text-amber-400" />
        <StatCard icon={TrendingUp} label="Avg hours / task" value={formatHours(kpis.avgHours)} accent="text-indigo-600 dark:text-indigo-400" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Tasks by Category">
          {byCategory.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-400">No tasks with a deadline in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {byCategory.map((entry) => (
                    <Cell key={entry.name} fill={categoryColors[entry.name] || "#64748b"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: textColor }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Tasks by Priority">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byPriority}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: textColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: textColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: theme === "dark" ? "#1e293b" : "#f8fafc" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {byPriority.map((entry) => (
                  <Cell key={entry.name} fill={PRIORITY_HEX[entry.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={`Completed tasks & hours logged — by ${periodType === "quarter" ? "month" : "week"}`} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: textColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
              <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 12, fill: textColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: textColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: theme === "dark" ? "#1e293b" : "#f8fafc" }} />
              <Legend wrapperStyle={{ fontSize: 12, color: textColor }} />
              <Bar yAxisId="left" dataKey="completed" name="Completed tasks" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={22} />
              <Line yAxisId="right" type="monotone" dataKey="hours" name="Hours logged" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Average hours by task type">
          {avgBySubcategory.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-400">No hours logged in this period yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={avgBySubcategory} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: textColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: textColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: theme === "dark" ? "#1e293b" : "#f8fafc" }} />
                <Bar dataKey="avg" name="Avg hours/task" radius={[0, 6, 6, 0]}>
                  {avgBySubcategory.map((entry, i) => (
                    <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Top assigners">
          {topAssigners.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-400">No tasks with a deadline in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topAssigners} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: textColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: textColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: theme === "dark" ? "#1e293b" : "#f8fafc" }} />
                <Bar dataKey="value" name="Tasks assigned" fill="#0d9488" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Tasks by Department" className="lg:col-span-2">
          {byDepartment.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-400">No tasks with a deadline in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, byDepartment.length * 40)}>
              <BarChart data={byDepartment} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: textColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11, fill: textColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: theme === "dark" ? "#1e293b" : "#f8fafc" }} />
                <Bar dataKey="value" name="Tasks" radius={[0, 6, 6, 0]}>
                  {byDepartment.map((entry, i) => (
                    <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <p className="mt-2 text-[11px] text-slate-400">Which department's assignees are handing out the most work this period.</p>
        </ChartCard>
      </div>
    </div>
  );
}

