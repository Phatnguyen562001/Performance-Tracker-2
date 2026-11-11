import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { PALETTE, STATUSES } from "../lib/constants";
import { uid, normalizeWorkflow } from "../lib/timeUtils";
import { inputClass } from "./ui";

const small = inputClass.replace("w-full", "w-20");
const wcls = (w) => inputClass.replace("w-full", w);

function Section({ title, hint, children }) {
  return (
    <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function WorkflowCard({ workflow, onChange, categories = [], sla }) {
  const wf = normalizeWorkflow(workflow);
  const set = (patch) => onChange({ ...wf, ...patch });
  const setStage = (id, patch) => set({ stages: wf.stages.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const mineCount = wf.stages.filter((s) => s.mine).length;

  // ---- scope ----
  const items = wf.scope.items;
  const toggleItem = (key) => set({ scope: { ...wf.scope, items: items.includes(key) ? items.filter((k) => k !== key) : [...items, key] } });

  // ---- overrides ----
  const keyOptions = categories.flatMap((c) => [{ key: c.name, label: c.name + " (all)" }, ...c.subcategories.map((s) => ({ key: `${c.name}/${s.name}`, label: `${c.name} / ${s.name}` }))]);
  const setOv = (i, patch) => set({ overrides: wf.overrides.map((o, j) => (j === i ? { ...o, ...patch } : o)) });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Review workflow (Ball)</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Ball shows who holds a task right now. Your own clock only runs while the ball is in a stage marked “my clock”. Time spent in other stages is shown but never counted against you.
      </p>

      <Section title="1. Which tasks use Ball?">
        <div className="flex flex-wrap gap-4 text-sm text-slate-700 dark:text-slate-200">
          <label className="flex items-center gap-2">
            <input type="radio" checked={wf.scope.mode === "all"} onChange={() => set({ scope: { ...wf.scope, mode: "all" } })} /> All tasks
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={wf.scope.mode === "selected"} onChange={() => set({ scope: { ...wf.scope, mode: "selected" } })} /> Only the categories I tick
          </label>
        </div>
        {wf.scope.mode === "selected" && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {categories.map((c) => {
              const whole = items.includes(c.name);
              return (
                <div key={c.id} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                    <input type="checkbox" checked={whole} onChange={() => toggleItem(c.name)} /> {c.name}
                    <span className="text-xs font-normal text-slate-400">(all subcategories)</span>
                  </label>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 pl-6">
                    {c.subcategories.map((s) => (
                      <label key={s.id} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <input type="checkbox" disabled={whole} checked={whole || items.includes(`${c.name}/${s.name}`)} onChange={() => toggleItem(`${c.name}/${s.name}`)} /> {s.name}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="2. Stages (who can hold the ball)" hint="The first stage with “my clock” is where every task starts. “Done” always exists and completes the task.">
        <div className="space-y-2">
          {wf.stages.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-slate-100 p-2.5 dark:border-slate-800">
              <input type="color" value={s.color || "#579bfc"} onChange={(e) => setStage(s.id, { color: e.target.value })} className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0" title="Colour" />
              <input value={s.label} onChange={(e) => setStage(s.id, { label: e.target.value })} className={inputClass.replace("w-full", "w-44")} placeholder="Stage name" />
              <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
                <input type="checkbox" checked={!!s.mine} disabled={s.mine && mineCount <= 1} onChange={(e) => setStage(s.id, { mine: e.target.checked })} /> My clock runs
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                Status becomes
                <select value={s.status || "keep"} onChange={(e) => setStage(s.id, { status: e.target.value })} className={wcls("w-32")}>
                  <option value="keep">(keep)</option>
                  {STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </label>
              {s.mine && (
                <>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300" title="When the ball comes back to this stage, set a new deadline = now + that round's hours">
                    <input type="checkbox" checked={s.newDeadline !== false} onChange={(e) => setStage(s.id, { newDeadline: e.target.checked })} /> New deadline on entry
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300" title="Rounds in this stage count toward Dashboard KPI and late checks">
                    <input type="checkbox" checked={s.kpi !== false} onChange={(e) => setStage(s.id, { kpi: e.target.checked })} /> Counts in KPI
                  </label>
                </>
              )}
              <button
                onClick={() => set({ stages: wf.stages.filter((x) => x.id !== s.id) })}
                disabled={wf.stages.length <= 1 || (s.mine && mineCount <= 1)}
                className="ml-auto rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30"
                title="Remove stage"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => set({ stages: [...wf.stages, { id: uid(), label: "With …", color: PALETTE[wf.stages.length % PALETTE.length], mine: false, status: "Waiting" }] })}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Plus size={13} /> Add stage
        </button>
      </Section>

      <Section title="3. Time limits (per round)" hint={`Round 1 uses the standard response time from Auto deadline above (${sla?.hours || 48}h). A round = one stretch where the ball is with you.`}>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
          <label className="flex items-center gap-2">
            Round 2 (re-review)
            <input type="number" min="1" value={wf.limits.review} onChange={(e) => set({ limits: { ...wf.limits, review: e.target.value === "" ? "" : Math.max(1, Number(e.target.value)) } })} className={small} /> h
          </label>
          <label className="flex items-center gap-2">
            Round 3 and later
            <input type="number" min="1" value={wf.limits.later} onChange={(e) => set({ limits: { ...wf.limits, later: e.target.value === "" ? "" : Math.max(1, Number(e.target.value)) } })} className={small} /> h
          </label>
        </div>
        <label className="mt-3 flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" className="mt-0.5" checked={wf.business} onChange={(e) => set({ business: e.target.checked })} />
          <span>
            Count business hours only
            <span className="block text-xs text-slate-500">Uses your office hours and holidays below. Off = continuous hours (nights and weekends count).</span>
          </span>
        </label>
      </Section>

      <Section title="4. Different limits for some categories" hint="Leave a box empty to use the defaults above. A subcategory rule beats a category rule.">
        <div className="space-y-2">
          {wf.overrides.map((o, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 p-2.5 text-xs dark:border-slate-800">
              <select value={o.key || ""} onChange={(e) => setOv(i, { key: e.target.value })} className={wcls("w-56")}>
                <option value="">Choose category…</option>
                {keyOptions.map((k) => (
                  <option key={k.key} value={k.key}>
                    {k.label}
                  </option>
                ))}
              </select>
              {[
                ["first", "Round 1"],
                ["review", "Round 2"],
                ["later", "Round 3+"],
              ].map(([f, label]) => (
                <label key={f} className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  {label}
                  <input type="number" min="1" value={o[f] ?? ""} placeholder="default" onChange={(e) => setOv(i, { [f]: e.target.value === "" ? "" : Math.max(1, Number(e.target.value)) })} className={small} /> h
                </label>
              ))}
              <select value={o.business == null || o.business === "" ? "" : o.business ? "biz" : "cont"} onChange={(e) => setOv(i, { business: e.target.value === "" ? "" : e.target.value === "biz" })} className={wcls("w-40")}>
                <option value="">Default hours type</option>
                <option value="cont">Continuous hours</option>
                <option value="biz">Business hours</option>
              </select>
              <button onClick={() => set({ overrides: wf.overrides.filter((_, j) => j !== i) })} className="ml-auto rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500" title="Remove rule">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => set({ overrides: [...wf.overrides, { key: "", first: "", review: "", later: "", business: "" }] })} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
          <Plus size={13} /> Add a rule
        </button>
      </Section>

      <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
        Re-opening: if you un-tick Completed on a finished task, the ball goes back to the first “my clock” stage and a new round starts from that moment (Round 2+ limit).
        Changes here apply to future moves; rounds already finished keep the limit they had.
      </p>
    </div>
  );
}
