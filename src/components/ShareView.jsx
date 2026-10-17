import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Zap } from "lucide-react";
import { watchShare, addComment, COMMENT_KINDS } from "../lib/share";
import { STATUSES, PRIORITY_STYLES, STATUS_STYLES } from "../lib/constants";
import { formatDateDisplay, todayYMD, formatRelativeTime, formatHours, formatClockTime } from "../lib/timeUtils";
import { Badge, ProgressBar } from "./ui";
import { RoundsFlow } from "./TaskModal";

function Section({ title, children }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      {children}
    </div>
  );
}

function CommentBox({ token, task }) {
  const [author, setAuthor] = useState(() => {
    try {
      return localStorage.getItem("lpt_viewer_name") || "";
    } catch (e) {
      return "";
    }
  });
  const [kind, setKind] = useState("Note");
  const [text, setText] = useState("");
  const [sent, setSent] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const general = !task;

  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    setErr("");
    try {
      try {
        localStorage.setItem("lpt_viewer_name", author);
      } catch (e) {
        /* ignore */
      }
      await addComment(token, { author: author.trim(), kind, text: text.trim(), taskId: task?.id, taskTitle: task?.title });
      setSent((s) => [{ kind, text: text.trim(), at: Date.now() }, ...s]);
      setText("");
    } catch (e) {
      setErr("Couldn't send. Please try again later.");
    }
    setBusy(false);
  }

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-500/30 dark:bg-indigo-500/5">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
        {general ? "Leave a note about this list" : "Leave a note or recommendation on this task"}
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Your name (optional)"
          maxLength={80}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          {COMMENT_KINDS.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Write your message…"
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">Only the owner of this list can read your message.</span>
        <button
          onClick={submit}
          disabled={busy || !text.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
        >
          {busy ? "Sending…" : "Send"}
        </button>
      </div>
      {err && <p className="mt-1 text-xs text-rose-600">{err}</p>}
      {sent.map((m, i) => (
        <p key={i} className="mt-2 rounded-md bg-white px-2.5 py-1.5 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          <span className="font-semibold text-emerald-600">✓ Sent ({m.kind}):</span> {m.text}
        </p>
      ))}
    </div>
  );
}

function TaskDetail({ t, token }) {
  const doneSub = t.subtasks?.filter((s) => s.done).length || 0;
  return (
    <div className="space-y-4 bg-slate-50/70 px-5 py-4 dark:bg-slate-900/70">
      <div className="grid gap-x-6 gap-y-1 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4 dark:text-slate-300">
        <p>
          <span className="text-slate-400">Category:</span> {t.category} · {t.subcategory}
        </p>
        <p>
          <span className="text-slate-400">Assigner:</span> {t.assigner || "—"}
        </p>
        <p>
          <span className="text-slate-400">Received:</span> {formatDateDisplay(t.receivedDate) || "—"}
        </p>
        <p>
          <span className="text-slate-400">Deadline:</span> {formatDateDisplay(t.deadline) || "—"}
        </p>
        <p>
          <span className="text-slate-400">Time counted:</span> {t.businessHoursOnly ? "business hours only" : "all elapsed time"}
        </p>
        {t.estimate ? (
          <p>
            <span className="text-slate-400">Estimate:</span> {formatHours(t.estimate)}
          </p>
        ) : null}
        <p>
          <span className="text-slate-400">Total logged:</span> {formatHours(t.totalHours || 0)}
        </p>
        {t.completedAt && (
          <p>
            <span className="text-slate-400">Completed:</span> {formatDateDisplay(t.completedAt.slice(0, 10))}
          </p>
        )}
      </div>

      <Section title="Description">
        <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{t.description || <span className="text-slate-400">No description.</span>}</p>
      </Section>

      <Section title={`Rounds (${t.rounds?.length || 0})`}>
        {t.rounds?.length > 0 ? (
          <RoundsFlow rounds={t.rounds} fullText />
        ) : (
          <p className="text-xs text-slate-400">No rounds logged.</p>
        )}
      </Section>

      <Section title={`Subtasks (${doneSub}/${t.subtasks?.length || 0})`}>
        {t.subtasks?.length > 0 ? (
          <ul className="space-y-1">
            {t.subtasks.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                {s.done ? <CheckCircle2 size={15} className="text-emerald-500" /> : <Circle size={15} className="text-slate-300" />}
                <span className={s.done ? "text-slate-400 line-through" : ""}>{s.title || "(untitled)"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400">No subtasks.</p>
        )}
      </Section>

      <Section title={`Time log (${t.sessions?.length || 0})`}>
        {t.sessions?.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100 text-slate-500 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-1.5 text-left font-semibold">Start</th>
                  <th className="px-3 py-1.5 text-left font-semibold">End</th>
                  <th className="px-3 py-1.5 text-left font-semibold">Counted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {t.sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap px-3 py-1.5 font-mono">{s.start ? `${formatDateDisplay(s.start.slice(0, 10))} ${formatClockTime(s.start)}` : "—"}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 font-mono">{s.end ? `${formatDateDisplay(s.end.slice(0, 10))} ${formatClockTime(s.end)}` : "—"}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 font-mono">
                      {formatHours(s.hours)}
                      {s.overtime && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-amber-600">
                          <Zap size={11} /> overtime
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400">No time logged.</p>
        )}
      </Section>

      <CommentBox token={token} task={t} />
    </div>
  );
}

/** Public, read-only page opened from a share link. No sign-in needed. */
export function ShareView({ token }) {
  const [data, setData] = useState(undefined);
  const [err, setErr] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState({});
  const dark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

  useEffect(() => watchShare(token, setData, () => setErr(true)), [token]);

  const tasks = useMemo(() => {
    const list = (data?.tasks || []).filter((t) => {
      if (status && t.status !== status) return false;
      if (q && !`${t.title} ${t.category} ${t.subcategory} ${t.assigner} ${t.description || ""}`.toLowerCase().includes(q.toLowerCase())) return false;
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
  const allOpen = tasks.length > 0 && tasks.every((t) => open[t.id]);

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
                    Read-only view · updated {formatRelativeTime(new Date(data.updatedAt).toISOString()) || "just now"} · click a task to see everything
                  </p>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="rounded-lg bg-white px-3 py-1.5 font-medium shadow-sm dark:bg-slate-900">{stats.total} tasks</span>
                  <span className="rounded-lg bg-white px-3 py-1.5 font-medium text-emerald-600 shadow-sm dark:bg-slate-900">{stats.done} completed</span>
                  <span className="rounded-lg bg-white px-3 py-1.5 font-medium text-rose-600 shadow-sm dark:bg-slate-900">{stats.overdue} overdue</span>
                </div>
              </div>

              <details className="mt-4 rounded-lg">
                <summary className="cursor-pointer text-sm font-medium text-indigo-600 dark:text-indigo-300">
                  Leave a note about the whole list
                </summary>
                <div className="mt-2">
                  <CommentBox token={token} task={null} />
                </div>
              </details>

              <div className="mt-4 flex flex-wrap items-center gap-2">
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
                <button
                  onClick={() => setOpen(allOpen ? {} : Object.fromEntries(tasks.map((t) => [t.id, true])))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300"
                >
                  {allOpen ? "Collapse all" : "Expand all"}
                </button>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-900/60">
                    <tr>
                      <th className="w-8" />
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
                      const isOpen = !!open[t.id];
                      return (
                        <React.Fragment key={t.id}>
                          <tr className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40" onClick={() => setOpen((o) => ({ ...o, [t.id]: !o[t.id] }))}>
                            <td className="pl-3 text-slate-400">{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                            <td className="px-4 py-3 text-sm font-medium">{t.title}</td>
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
                          {isOpen && (
                            <tr>
                              <td colSpan={9} className="p-0">
                                <TaskDetail t={t} token={token} />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {tasks.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
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
