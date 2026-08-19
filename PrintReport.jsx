import React from "react";
import { formatDateDisplay, formatHours, taskCompletionPct, taskTotalHours } from "../lib/timeUtils";

/* =========================================================================
   PRINT REPORT (used for PDF export)
   ========================================================================= */

export function PrintReport({ tasks, holidaySet }) {
  return (
    <div className="print-report hidden p-8 text-black">
      <h1 className="text-xl font-bold">Legal Performance Tracker — Task Report</h1>
      <p className="mb-4 text-xs text-slate-500">Generated {new Date().toLocaleString("en-GB")}</p>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {["Title", "Category", "Subcategory", "Priority", "Status", "Assigner", "Deadline", "Progress", "Hours"].map((h) => (
              <th key={h} className="border border-slate-300 bg-slate-100 px-2 py-1 text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id}>
              <td className="border border-slate-300 px-2 py-1">{t.title}</td>
              <td className="border border-slate-300 px-2 py-1">{t.category}</td>
              <td className="border border-slate-300 px-2 py-1">{t.subcategory}</td>
              <td className="border border-slate-300 px-2 py-1">{t.priority}</td>
              <td className="border border-slate-300 px-2 py-1">{t.status}</td>
              <td className="border border-slate-300 px-2 py-1">{t.assigner}</td>
              <td className="border border-slate-300 px-2 py-1">{formatDateDisplay(t.deadline)}</td>
              <td className="border border-slate-300 px-2 py-1">{taskCompletionPct(t)}%</td>
              <td className="border border-slate-300 px-2 py-1">{formatHours(taskTotalHours(t, holidaySet))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

