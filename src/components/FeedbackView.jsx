import React from "react";
import { MessageSquare, Trash2, ExternalLink } from "lucide-react";
import { EmptyState } from "./ui";
import { formatRelativeTime } from "../lib/timeUtils";

const KIND_STYLE = {
  Note: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  Recommendation: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  Question: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};

/** Notes & recommendations that viewers left through your share link. */
export function FeedbackView({ comments, tasks, shareToken, seenAt, onOpenTask, onDelete }) {
  if (!shareToken) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Sharing is off"
        description="Create a share link in Settings. Notes people leave on it will appear here."
      />
    );
  }
  if (comments.length === 0) {
    return <EmptyState icon={MessageSquare} title="No feedback yet" description="When someone leaves a note on your shared link, it shows up here." />;
  }
  const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {comments.map((c) => {
        const task = byId[c.taskId];
        const fresh = c.createdAt > (seenAt || 0);
        return (
          <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={"rounded-full px-2 py-0.5 font-semibold " + (KIND_STYLE[c.kind] || KIND_STYLE.Note)}>{c.kind}</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{c.author || "Anonymous"}</span>
              <span className="text-slate-400">{formatRelativeTime(new Date(c.createdAt).toISOString()) || "just now"}</span>
              {fresh && <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">NEW</span>}
              <button onClick={() => window.confirm("Delete this message?") && onDelete(c.id)} className="ml-auto text-slate-400 hover:text-rose-600" title="Delete">
                <Trash2 size={14} />
              </button>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100">{c.text}</p>
            <div className="mt-2 text-xs text-slate-500">
              {c.taskId ? (
                task ? (
                  <button onClick={() => onOpenTask(task)} className="inline-flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400">
                    <ExternalLink size={12} /> On task: {task.title}
                  </button>
                ) : (
                  <span>On task: {c.taskTitle || "(deleted task)"}</span>
                )
              ) : (
                <span>About the whole list</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
