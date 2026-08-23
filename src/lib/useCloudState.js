import { useState, useEffect, useRef, useCallback } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Keeps ONE Firestore document per signed-in user (users/{uid}/data/main) in
 * sync with local React state, in real time.
 *
 * Returned as [data, setData] with the exact same calling convention as
 * React's useState (accepts a value or an updater function) — this is what
 * lets the rest of the app use it exactly like the old useLocalStorage hook,
 * with no other code changes required.
 *
 * `data` is:
 *   - undefined  while the first read from Firestore is still in flight
 *   - null       once confirmed the document doesn't exist yet (new user)
 *   - the object otherwise
 *
 * A single document (instead of one Firestore doc per task) keeps this simple
 * and is comfortably within Firestore's 1MB/document limit for personal-scale
 * use (hundreds of tasks). If task volume grows much larger later, this is the
 * one place that would need to change to a `tasks` subcollection instead.
 */
export function useCloudDoc(uid) {
  const [data, setDataState] = useState(undefined);
  const latest = useRef(undefined);

  useEffect(() => {
    latest.current = undefined;
    setDataState(undefined);
    if (!uid) return undefined;

    const ref = doc(db, "users", uid, "data", "main");
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        const value = snap.exists() ? snap.data() : null;
        latest.current = value;
        setDataState(value);
      },
      (err) => {
        console.error("Firestore sync error:", err);
      }
    );
    return unsubscribe;
  }, [uid]);

  const setData = useCallback(
    (updater) => {
      if (!uid) return;
      const base = latest.current || {};
      const next = typeof updater === "function" ? updater(base) : updater;
      latest.current = next;
      setDataState(next);
      setDoc(doc(db, "users", uid, "data", "main"), next).catch((err) => {
        console.error("Firestore write error:", err);
      });
    },
    [uid]
  );

  return [data, setData];
}

/**
 * Builds a useState-style [value, setValue] pair scoped to a single field of
 * the shared cloud document, e.g. makeFieldState(cloudDoc, setCloudDoc, "tasks").
 * Every existing setTasks/setCategories/... call site in the app keeps working
 * unchanged, since this preserves the "value or updater function" convention.
 */
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
