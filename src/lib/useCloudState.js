import { useState, useEffect, useRef, useCallback } from "react";
import {
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  getDocs,
  collection,
  runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Keeps ONE Firestore document per signed-in user (users/{uid}/data/main) in
 * sync with local React state, in real time.
 *
 * SAFETY RULES (added after a data-loss incident):
 *  1. "Document doesn't exist" is only believed when it comes from the SERVER,
 *     never from an empty/offline cache. Otherwise we stay in "loading".
 *  2. Nothing is ever written before the first real load finished.
 *  3. Writes only send the fields that actually changed (merge), so a bug can
 *     never replace the whole document with a partial one.
 *  4. A brand-new document is created inside a transaction that refuses to
 *     overwrite an existing one.
 *  5. A daily snapshot is saved to users/{uid}/backups/{YYYY-MM-DD} (last 30
 *     kept by the restore list) and a copy is mirrored in this browser.
 *
 * `data` is:  undefined = still loading,  null = confirmed new user,  object = loaded.
 */

const MAIN = (uid) => doc(db, "users", uid, "data", "main");
const localKey = (uid) => `lpt_mirror_${uid}`;

function todayKey() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function taskCount(d) {
  return d && Array.isArray(d.tasks) ? d.tasks.length : 0;
}

export function useCloudDoc(uid) {
  const [data, setDataState] = useState(undefined);
  const latest = useRef(undefined);

  useEffect(() => {
    latest.current = undefined;
    setDataState(undefined);
    if (!uid) return undefined;

    const unsubscribe = onSnapshot(
      MAIN(uid),
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.exists()) {
          const value = snap.data();
          latest.current = value;
          setDataState(value);
          // Mirror + daily backup only from real, non-empty data.
          if (!snap.metadata.fromCache && taskCount(value) > 0) {
            try {
              localStorage.setItem(localKey(uid), JSON.stringify(value));
            } catch (e) {
              /* ignore */
            }
            const bref = doc(db, "users", uid, "backups", todayKey());
            getDoc(bref)
              .then((b) => {
                if (!b.exists()) {
                  return setDoc(bref, { savedAt: Date.now(), taskCount: taskCount(value), data: JSON.stringify(value) });
                }
                return null;
              })
              .catch(() => {});
          }
        } else if (!snap.metadata.fromCache) {
          // Server confirmed: no document.
          latest.current = null;
          setDataState(null);
        }
        // else: empty cache result -> keep waiting for the server.
      },
      (err) => console.error("Firestore sync error:", err)
    );
    return unsubscribe;
  }, [uid]);

  const setData = useCallback(
    (updater) => {
      if (!uid) return;
      if (latest.current === undefined) {
        console.warn("Blocked a save before data finished loading.");
        return;
      }
      const base = latest.current || {};
      const next = typeof updater === "function" ? updater(base) : updater;
      if (!next || typeof next !== "object") return;

      // Brand-new user: create only if still missing.
      if (latest.current === null) {
        latest.current = next;
        setDataState(next);
        runTransaction(db, async (tx) => {
          const snap = await tx.get(MAIN(uid));
          if (snap.exists()) return; // never overwrite existing data
          tx.set(MAIN(uid), next);
        }).catch((err) => console.error("Firestore create error:", err));
        return;
      }

      // Safety net: if this save would remove or replace most tasks (mass
      // delete, Reset, Import, a bug...), first keep a full copy of what is
      // there right now so it can always be restored from Settings.
      try {
        const before = Array.isArray(base.tasks) ? base.tasks : [];
        const after = Array.isArray(next.tasks) ? next.tasks : [];
        if (before.length >= 3 && next.tasks !== base.tasks) {
          const afterIds = new Set(after.map((t) => t.id));
          const kept = before.filter((t) => afterIds.has(t.id)).length;
          if (kept < before.length * 0.5) {
            const label = "guard-" + new Date().toISOString().replace(/[:.]/g, "-");
            setDoc(doc(db, "users", uid, "backups", label), {
              savedAt: Date.now(),
              taskCount: before.length,
              data: JSON.stringify(base),
            }).catch((e) => console.error("Guard backup failed:", e));
          }
        }
      } catch (e) {
        console.error(e);
      }

      // Existing user: send ONLY the fields that changed.
      const patch = {};
      Object.keys(next).forEach((k) => {
        if (next[k] !== base[k]) patch[k] = next[k];
      });
      latest.current = next;
      setDataState(next);
      if (Object.keys(patch).length === 0) return;
      setDoc(MAIN(uid), patch, { merge: true }).catch((err) => {
        console.error("Firestore write error:", err);
      });
    },
    [uid]
  );

  return [data, setData];
}

/** Lists automatic daily backups, newest first. */
export async function listBackups(uid) {
  const snap = await getDocs(collection(db, "users", uid, "backups"));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.id < b.id ? 1 : -1))
    .slice(0, 40);
}

export function readLocalMirror(uid) {
  try {
    const raw = localStorage.getItem(localKey(uid));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/** Replaces the live document with a backup's content (used by Restore). */
export async function restoreFromObject(uid, obj) {
  await setDoc(MAIN(uid), obj);
}

export function makeFieldState(cloudDoc, setCloudDoc, field, fallback) {
  const value = cloudDoc && cloudDoc[field] !== undefined ? cloudDoc[field] : fallback;
  const setValue = (updater) => {
    setCloudDoc((prevDoc) => {
      const prevFieldValue = prevDoc && prevDoc[field] !== undefined ? prevDoc[field] : fallback;
      const nextFieldValue = typeof updater === "function" ? updater(prevFieldValue) : updater;
      return { ...(prevDoc || {}), [field]: nextFieldValue };
    });
  };
  return [value, setValue];
}
