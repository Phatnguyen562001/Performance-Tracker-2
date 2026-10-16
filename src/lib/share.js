import { doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { taskCompletionPct, getReceivedDate } from "./timeUtils";

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

/** Only these fields ever leave the owner's private area. */
function sanitizeTask(t, includeNotes) {
  const out = {
    id: t.id,
    title: t.title || "",
    category: t.category || "",
    subcategory: t.subcategory || "",
    priority: t.priority || "",
    status: t.status || "",
    assigner: t.assigner || "",
    receivedDate: getReceivedDate(t) || "",
    deadline: t.deadline || "",
    completedAt: t.completedAt || null,
    pct: taskCompletionPct(t),
  };
  if (includeNotes) out.description = t.description || "";
  return out;
}

export function publishShare(token, { uid, ownerName, tasks, includeNotes }) {
  return setDoc(doc(db, "shares", token), {
    ownerUid: uid,
    ownerName: ownerName || "",
    updatedAt: Date.now(),
    includeNotes: !!includeNotes,
    tasks: tasks.map((t) => sanitizeTask(t, includeNotes)),
  });
}

export function removeShare(token) {
  return deleteDoc(doc(db, "shares", token));
}

export function watchShare(token, onData, onError) {
  return onSnapshot(doc(db, "shares", token), (snap) => onData(snap.exists() ? snap.data() : null), onError);
}
