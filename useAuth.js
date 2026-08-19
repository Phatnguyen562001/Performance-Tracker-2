import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

/**
 * Wraps Firebase Auth's Google Sign-In flow.
 * `user` is `undefined` while Firebase is still checking for an existing
 * session, `null` when signed out, or the Firebase user object when signed in.
 */
export function useAuth() {
  const [user, setUser] = useState(undefined);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return unsubscribe;
  }, []);

  const signIn = useCallback(async () => {
    setAuthError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      // Popup closed by the user isn't a real error worth showing.
      if (err?.code !== "auth/popup-closed-by-user" && err?.code !== "auth/cancelled-popup-request") {
        setAuthError(err?.message || "Sign-in failed. Please try again.");
      }
    }
  }, []);

  const signOut = useCallback(() => firebaseSignOut(auth), []);

  return { user, loading: user === undefined, signIn, signOut, authError };
}
