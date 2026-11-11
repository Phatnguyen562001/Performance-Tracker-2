import React from "react";
import { Send, CornerUpLeft, CheckCircle2, Undo2, Hourglass, ArrowRight } from "lucide-react";
import { applyMove, undoLastHandoff, setHandoffTime, legsOf, ballOf, fmtSpan, deadlineMoment, toDateTimeLocalValue, classNames, getWorkflow, stageById, currentStage, eventsOf, inScope, DONE_STAGE } from "../lib/timeUtils";

/** { id, label, color, kind: "me"|"boss"|"done" } or null when Ball is off for this task. */
export function ballInfo(task) {
  if (!inScope(task)) return null;
  const kind = ballOf(task);
  if (kind === "done") return { id: "done", label: DONE_STAGE.label, color: DONE_STAGE.color, kind };
  const st = currentStage(task);
  return { id: st.id, label: st.label, color: st.color || "#a1a5b3", kind };
}
/** Stages you can move this task to from where it is now. */
export function moveOptions(task) {
  const wf = getWorkflow();
  const cur = ballInfo(task);
  const list = [...wf.stages, DONE_STAGE].filter((s) => s.id !== cur?.id);
  return list;
}

function fmt(d) {
  if (!d) return "—";
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Ball control + timeline. Works on a saved task or on the task-dialog form: it only calls onPatch(patch). */
export function CyclePanel({ task, onPatch, compact = false }) {
  if (!inScope(task)) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-700">
        Ball is switched off for “{task.category}{task.subcategory ? ` / ${task.subcategory}` : ""}”. Turn it on in Settings → Review workflow (Ball).
      </p>
    );
  }
  const info = ballInfo(task);
  const kind = info.kind;
  const legs = legsOf(task);
  const events = eventsOf(task);
  const openMine = legs.find((l) => l.kind === "mine" && l.open);
  const dl = deadlineMoment(task);
  const opts = moveOptions(task);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: info.color }}>
            {info.label}
          </span>
          {kind === "me" && openMine && dl && (
            <span className="text-xs text-slate-600 dark:text-slate-300">
              Round {openMine.n} target {openMine.limitH != null ? fmtSpan(openMine.limitH) : "—"}
              {openMine.biz ? " (business hours)" : ""} · used {fmtSpan(openMine.usedH)}
              {openMine.ok ? " · on track" : " · over target"}
            </span>
          )}
          {kind === "boss" && <span className="text-xs text-slate-600 dark:text-slate-300">Your clock is paused. Waiting {fmtSpan(legs[legs.length - 1]?.usedH)}.</span>}
          {kind === "done" && <span className="text-xs text-slate-600 dark:text-slate-300">Finished. Un-tick Completed to re-open (new round with me).</span>}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Move ball to:</span>
          {opts.map((st) => (
            <button
              key={st.id}
              onClick={() => onPatch(applyMove(task, st.id))}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: st.color || "#6366f1" }}
            >
              {st.id === "done" ? <CheckCircle2 size={13} /> : st.mine ? <CornerUpLeft size={13} /> : <Send size={13} />}
              {st.label}
              {st.mine && <span className="font-normal opacity-80">(my clock)</span>}
            </button>
          ))}
          {events.length > 0 && (
            <button onClick={() => onPatch(undoLastHandoff(task))} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
              <Undo2 size={13} /> Undo last
            </button>
          )}
        </div>
        {!compact && <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Time limits and what each stage does are set in Settings → Review workflow (Ball).</p>}
      </div>

      {legs.length > 0 && (
        <ol className="space-y-1.5">
          {legs.map((l, i) =>
            l.kind === "mine" ? (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-xs dark:border-slate-800">
                <span className="w-9 font-semibold text-slate-700 dark:text-slate-200">R{l.n}</span>
                <span className="text-slate-500">
                  {fmt(l.start)} → {l.end ? fmt(l.end) : "now"}
                </span>
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="font-mono text-slate-600 dark:text-slate-300">
                    {fmtSpan(l.usedH)}
                    {l.limitH != null ? ` / ${fmtSpan(l.limitH)}` : ""}
                  </span>
                  {l.kpi === false ? (
                    <span className="rounded-full bg-slate-400 px-2 py-0.5 text-[10px] font-bold text-white">Not in KPI</span>
                  ) : (
                    <span className={classNames("rounded-full px-2 py-0.5 text-[10px] font-bold text-white", l.ok ? "bg-emerald-500" : "bg-rose-500")}>
                      {l.ok ? (l.open ? "On track" : "Met") : l.open ? "Over" : "Missed"}
                    </span>
                  )}
                </span>
              </li>
            ) : (
              <li key={i} className="flex flex-wrap items-center gap-2 px-3 py-1 text-[11px] text-sky-600 dark:text-sky-400">
                <Hourglass size={11} /> {stageById(l.stage).label}: {l.end ? (l.approved ? "approved after" : "held it for") : "holding for"} {fmtSpan(l.usedH)} <span className="text-slate-400">(not counted)</span>
              </li>
            )
          )}
        </ol>
      )}

      {events.length > 0 && (
        <details className="rounded-lg border border-slate-100 p-2 text-xs dark:border-slate-800">
          <summary className="cursor-pointer text-slate-500">Edit times (if you forgot to click on time)</summary>
          <div className="mt-2 space-y-1.5">
            {events.map((e) => (
              <label key={e.id} className="flex flex-wrap items-center gap-2">
                <span className="flex w-52 items-center gap-1 text-slate-600 dark:text-slate-300">
                  <ArrowRight size={11} /> {stageById(e.to).label}
                </span>
                <input
                  type="datetime-local"
                  value={toDateTimeLocalValue(new Date(e.at))}
                  onChange={(ev) => {
                    const d = new Date(ev.target.value);
                    if (!isNaN(d)) onPatch(setHandoffTime(task, e.id, d));
                  }}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
