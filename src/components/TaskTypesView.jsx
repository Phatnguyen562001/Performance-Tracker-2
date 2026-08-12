import React, { useState, useMemo } from "react";
import { ArrowLeft, X, Zap, Hourglass, ListChecks, TrendingUp, BarChart3, Clock, Layers } from "lucide-react";
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, Line } from "recharts";
import { PRIORITY_STYLES } from "../lib/constants";
import {
  classNames,
  formatYMD,
  formatDateDisplay,
  formatHours,
  taskTotalHours,
  inDateRange,
  buildTrailingBuckets,
  computeTypeStats,
  softStyle,
} from "../lib/timeUtils";
import { Badge, StatCard, EmptyState, inputClass } from "./ui";

/* =========================================================================
   TASK TYPE (SUBCATEGORY) PERFORMANCE
   ========================================================================= */

export function TypeCard({ group, color, onClick }) {
  const hasData = group.count > 0;
  return (
    <button
      onClick={onClick}
      className="flex w-full flex-col rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-indigo-500/50"
    >
      <div className="mb-2 flex items-center justify-between">
        <Badge className="border-0 px-1.5 py-0" style={softStyle(color)}>
          {group.category}
        </Badge>
        <span className="font-mono text-[11px] text-slate-400">{group.count} completed</span>
      </div>
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{group.subcategory}</p>
      {hasData ? (
        <>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="font-mono text-2xl font-semibold text-slate-900 dark:text-slate-50">{group.avg.toFixed(1)}</span>
            <span className="text-xs text-slate-400">avg hrs / task</span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Zap size={11} className="text-emerald-500" /> {group.min.toFixed(1)}h
            </span>
            <span className="flex items-center gap-1">
              <Hourglass size={11} className="text-rose-500" /> {group.max.toFixed(1)}h
            </span>
          </div>
        </>
      ) : (
        <p className="mt-2.5 text-sm text-slate-400">No completed tasks yet</p>
      )}
    </button>
  );
}

export function TypeDetailModal({ group, color, holidaySet, onClose, onOpenTask }) {
  const [periodType, setPeriodType] = useState("month");
  const bucketCount = periodType === "quarter" ? 4 : 6;
  const buckets = useMemo(() => buildTrailingBuckets(periodType, bucketCount), [periodType, bucketCount]);

  const trend = useMemo(() => {
    return buckets.map((b) => {
      const inBucket = group.tasks.filter((t) => t.completedAt && inDateRange(new Date(t.completedAt), b));
      const hrs = inBucket.map((t) => taskTotalHours(t, holidaySet));
      const avg = hrs.length ? hrs.reduce((s, v) => s + v, 0) / hrs.length : 0;
      return { label: b.label, completed: inBucket.length, avg: +avg.toFixed(1) };
    });
  }, [buckets, group.tasks, holidaySet]);

  const sortedTasks = useMemo(
    () => [...group.tasks].sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || "")),
    [group.tasks]
  );

  const tooltipStyle = { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, color: "#1e293b" };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 px-4 py-6 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <ArrowLeft size={16} />
              </button>
              <Badge className="border-0 px-1.5 py-0" style={softStyle(color)}>
                {group.category}
              </Badge>
            </div>
            <h2 className="mt-1.5 text-base font-semibold text-slate-900 dark:text-slate-50">{group.subcategory}</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={ListChecks} label="Completed" value={group.count} />
            <StatCard icon={TrendingUp} label="Average" value={formatHours(group.avg)} accent="text-indigo-600 dark:text-indigo-400" />
            <StatCard icon={BarChart3} label="Median" value={formatHours(group.median)} accent="text-indigo-600 dark:text-indigo-400" />
            <StatCard icon={Clock} label="Total hours" value={formatHours(group.total)} accent="text-amber-600 dark:text-amber-400" />
            <StatCard icon={Zap} label="Fastest" value={group.count ? formatHours(group.min) : "—"} accent="text-emerald-600 dark:text-emerald-400" />
            <StatCard icon={Hourglass} label="Longest" value={group.count ? formatHours(group.max) : "—"} accent="text-rose-600 dark:text-rose-400" />
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Completion trend</p>
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/60">
                <button
                  onClick={() => setPeriodType("month")}
                  className={classNames("rounded-md px-2.5 py-1 text-xs font-medium transition", periodType === "month" ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300" : "text-slate-500")}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setPeriodType("quarter")}
                  className={classNames("rounded-md px-2.5 py-1 text-xs font-medium transition", periodType === "quarter" ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300" : "text-slate-500")}
                >
                  Quarterly
                </button>
              </div>
            </div>
            {group.count === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">No completed tasks yet for this type.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                  <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="completed" name="Completed" fill={color} radius={[6, 6, 0, 0]} barSize={22} />
                  <Line yAxisId="right" type="monotone" dataKey="avg" name="Avg hours" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Completed tasks ({sortedTasks.length})</p>
            {sortedTasks.length === 0 ? (
              <EmptyState icon={ListChecks} title="No completed tasks" description="Once tasks of this type are marked Completed, they will show up here." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-900/60">
                    <tr>
                      {["Title", "Assigner", "Priority", "Completed on", "Hours"].map((h) => (
                        <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900/40">
                    {sortedTasks.map((t) => (
                      <tr key={t.id} onClick={() => onOpenTask(t)} className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="max-w-[220px] truncate px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-100">{t.title}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{t.assigner}</td>
                        <td className="px-3 py-2">
                          <Badge className={PRIORITY_STYLES[t.priority]}>{t.priority}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                          {t.completedAt ? formatDateDisplay(formatYMD(new Date(t.completedAt))) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-sm text-slate-600 dark:text-slate-300">
                          {formatHours(taskTotalHours(t, holidaySet))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TaskTypesView({ tasks, holidaySet, categories, categoryColors, onOpenTask }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("");

  const groups = useMemo(() => computeTypeStats(categories, tasks, holidaySet), [categories, tasks, holidaySet]);
  const visibleGroups = useMemo(
    () =>
      groups
        .filter((g) => !categoryFilter || g.category === categoryFilter)
        .sort((a, b) => b.count - a.count || a.subcategory.localeCompare(b.subcategory)),
    [groups, categoryFilter]
  );
  const selectedGroup = useMemo(() => groups.find((g) => g.key === selectedKey) || null, [groups, selectedKey]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/60">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Performance is measured separately per Task Type, instead of averaging everything together. Click a card for
          full detail.
        </p>
        <select className={classNames(inputClass, "w-48")} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {visibleGroups.length === 0 ? (
        <EmptyState icon={Layers} title="No task types yet" description="Create categories and subcategories in Settings to see performance breakdowns here." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleGroups.map((g) => (
            <TypeCard key={g.key} group={g} color={categoryColors[g.category] || "#64748b"} onClick={() => setSelectedKey(g.key)} />
          ))}
        </div>
      )}

      {selectedGroup && (
        <TypeDetailModal
          group={selectedGroup}
          color={categoryColors[selectedGroup.category] || "#64748b"}
          holidaySet={holidaySet}
          onClose={() => setSelectedKey(null)}
          onOpenTask={(t) => {
            setSelectedKey(null);
            onOpenTask(t);
          }}
        />
      )}
    </div>
  );
}

