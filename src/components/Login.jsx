import React from "react";
import { Scale, AlertTriangle } from "lucide-react";

function Shell({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-[#0b0e14]">
      {children}
    </div>
  );
}

export function LoadingScreen() {
  return (
    <Shell>
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600 dark:border-slate-700 dark:border-t-indigo-400" />
        <p className="text-sm">Loading…</p>
      </div>
    </Shell>
  );
}

export function Login({ onSignIn, error }) {
  return (
    <Shell>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <Scale size={22} />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-50">Legal Performance Tracker</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sign in to access your tasks and dashboard.</p>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-left text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertTriangle size={14} className="shrink-0" /> {error}
          </div>
        )}

        <button
          onClick={onSignIn}
          className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.8 2.73v2.27h2.92c1.7-1.57 2.68-3.88 2.68-6.64z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.27c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34C2.44 15.98 5.48 18 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.97 10.71A5.4 5.4 0 013.68 9c0-.6.1-1.18.29-1.71V4.95H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.05l3.01-2.34z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.95l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"
            />
          </svg>
          Sign in with Google
        </button>

        <p className="mt-5 text-[11px] leading-snug text-slate-400">
          Your data is private to your Google account and stored securely in the cloud.
        </p>
      </div>
    </Shell>
  );
}
