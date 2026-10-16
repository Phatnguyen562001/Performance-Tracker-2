import { doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { taskCompletionPct, getReceivedDate, sessionMinutes, taskUsesBusinessHours } from "./timeUtils";

/** Unguessable link id (~143 bits of randomness). */
export function makeShareToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function shareUrl(token) {
  return `${window.location.origin}/?share=${token}`;
}

/** Everything a viewer needs to see the whole task (read-only). Hours are
 *  pre-computed here because the viewer has no access to your holidays/work hours. */
function sanitizeTask(t, ctx) {
  const businessOnly = taskUsesBusinessHours(t);
  const sessions = (t.sessions || []).map((s) => ({
    id: s.id,
    start: s.start || "",
    end: s.end || "",
    overtime: !!s.overtime,
    hours: +(sessionMinutes(s, businessOnly, ctx.holidaySet, ctx.workSchedule) / 60).toFixed(2),
  }));
  return {
    id: t.id,
    title: t.title || "",
    description: t.description || "",
    category: t.category || "",
    subcategory: t.subcategory || "",
    priority: t.priority || "",
    status: t.status || "",
    assigner: t.assigner || "",
    receivedDate: getReceivedDate(t) || "",
    deadline: t.deadline || "",
    completedAt: t.completedAt || null,
    createdAt: t.createdAt || null,
    updatedAt: t.updatedAt || null,
    businessHoursOnly: businessOnly,
    estimate: t.estimate || null,
    totalHours: +sessions.reduce((a, s) => a + s.hours, 0).toFixed(2),
    pct: taskCompletionPct(t),
    subtasks: (t.subtasks || []).map((s) => ({ id: s.id, title: s.title || "", done: !!s.done })),
    rounds: (t.rounds || []).map((r) => ({
      id: r.id,
      date: r.date || "",
      label: r.label || "",
      recipient: r.recipient || "",
      note: r.note || "",
      color: r.color || "",
    })),
    sessions,
  };
}

export function publishShare(token, { uid, ownerName, tasks, holidaySet, workSchedule }) {
  const ctx = { holidaySet: holidaySet || new Set(), workSchedule };
  return setDoc(doc(db, "shares", token), {
    ownerUid: uid,
    ownerName: ownerName || "",
    updatedAt: Date.now(),
    fullDetail: true,
    tasks: tasks.map((t) => sanitizeTask(t, ctx)),
  });
}

export function removeShare(token) {
  return deleteDoc(doc(db, "shares", token));
}

export function watchShare(token, onData, onError) {
  return onSnapshot(doc(db, "shares", token), (snap) => onData(snap.exists() ? snap.data() : null), onError);
}
