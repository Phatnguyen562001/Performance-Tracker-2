import React, { useEffect, useMemo, useState } from "react";
import { watchShare } from "../lib/share";
import { STATUSES, PRIORITY_STYLES, STATUS_STYLES } from "../lib/constants";
import { formatDateDisplay, todayYMD, formatRelativeTime } from "../lib/timeUtils";
import { Badge, ProgressBar } from "./ui";

/** Public, read-only page opened from a share link. No sign-in needed. */
export function ShareView({ token }) {
  const [data, setData] = useState(undefined);
  const [err, setErr] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const dark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

  useEffect(() => watchShare(token, setData, () => setErr(true)), [token]);

  const tasks = useMemo(() => {
    const list = (data?.tasks || []).filter((t) => {
      if (status && t.status !== status) return false;
      if (q && !`${t.title} ${t.category} ${t.subcategory} ${t.assigner}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    return list.sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
  }, [data, q, status]);

  const today = todayYMD();
  const all = data?.tasks || [];
  const stats = {
    total: all.length,
    done: all.filter((t) => t.status === "Completed").length,
    overdue: all.filter((t) => t.status !== "Completed" && t.deadline && t.deadline < today).length,
  };

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-[#0b0e14] dark:text-slate-100">
        <div className="mx-auto max-w-6xl">
          {data === undefined && !err && <p className="text-sm text-slate-500">Loading…</p>}
          {(err || data === null) && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
              <p className="text-base font-semibold">This link isn't available</p>
              <p className="mt-1 text-sm text-slate-500">The owner may have stopped sharing, or the link is incorrect.</p>
            </div>
          )}
          {data && (
            <>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h1 className="text-xl font-bold">Task list{data.ownerName ? ` — ${data.ownerName}` : ""}</h1>
                  <p className="text-xs text-slate-500">
                    Read-only view · updated {formatRelativeTime(new Date(data.updatedAt).toISOString()) || "just now"}
                  </p>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="rounded-lg bg-white px-3 py-1.5 font-medium shadow-sm dark:bg-slate-900">{stats.total} tasks</span>
                  <span className="rounded-lg bg-white px-3 py-1.5 font-medium text-emerald-600 shadow-sm dark:bg-slate-900">{stats.done} completed</span>
                  <span className="rounded-lg bg-white px-3 py-1.5 font-medium text-rose-600 shadow-sm dark:bg-slate-900">{stats.overdue} overdue</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search…"
                  className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="">All statuses</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-900/60">
                    <tr>
                      {["Task", "Category", "Priority", "Status", "Assigner", "Received", "Deadline", "Progress"].map((h) => (
                        <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900/40">
                    {tasks.map((t) => {
                      const overdue = t.status !== "Completed" && t.deadline && t.deadline < today;
                      return (
                        <tr key={t.id}>
                          <td className="px-4 py-3 text-sm">
                            <p className="font-medium">{t.title}</p>
                            {t.description && <p className="mt-0.5 max-w-md whitespace-pre-wrap text-xs text-slate-500">{t.description}</p>}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {t.category}
                            <br />
                            {t.subcategory}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={PRIORITY_STYLES[t.priority]}>{t.priority}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={STATUS_STYLES[t.status]}>{t.status}</Badge>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">{t.assigner || "—"}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">{formatDateDisplay(t.receivedDate) || "—"}</td>
                          <td className={"whitespace-nowrap px-4 py-3 text-sm " + (overdue ? "font-medium text-rose-600" : "")}>
                            {formatDateDisplay(t.deadline) || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20">
                                <ProgressBar pct={t.pct} />
                              </div>
                              <span className="font-mono text-xs text-slate-500">{t.pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {tasks.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                          No tasks match.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
