/* =========================================================================
   SIDEBAR
   ========================================================================= */

import React from "react";
import {
  LayoutDashboard,
  ListChecks,
  Layers,
  BarChart3,
  Settings as SettingsIcon,
  Scale,
  ShieldCheck,
  Menu,
  Search,
  Sun,
  Moon,
  Plus,
  Sparkles,
  CalendarDays,
  LogOut,
} from "lucide-react";
import { classNames } from "../lib/timeUtils";

/* =========================================================================
   SIDEBAR
   ========================================================================= */

export function Sidebar({ view, setView, mobileOpen, setMobileOpen, user, onSignOut }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "everyday", label: "Everyday", icon: Sparkles },
    { id: "calendar", label: "Calendar", icon: CalendarDays },
    { id: "tasks", label: "Tasks", icon: ListChecks },
    { id: "types", label: "Task Types", icon: Layers },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];
  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside
        className={classNames(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Scale size={17} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-slate-900 dark:text-slate-50">Legal Performance</p>
            <p className="text-[11px] leading-tight text-slate-400">Tracker</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {items.map((it) => {
            const Icon = it.icon;
            const active = view === it.id;
            return (
              <button
                key={it.id}
                onClick={() => {
                  setView(it.id);
                  setMobileOpen(false);
                }}
                className={classNames(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60"
                )}
              >
                <Icon size={16} />
                {it.label}
              </button>
            );
          })}
        </nav>
        <div className="mx-3 mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
            <ShieldCheck size={13} /> Office hours engine
          </div>
          <p className="mt-1 leading-snug">
            Mon–Fri, per-task toggle &amp; custom hours in Settings. Configure holidays &amp; categories there too.
          </p>
        </div>
        {user && (
          <div className="mx-3 mb-4 flex items-center gap-2 rounded-lg border border-slate-200 p-2 dark:border-slate-800">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-7 w-7 shrink-0 rounded-full" />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">{user.displayName || user.email}</p>
              <p className="truncate text-[11px] text-slate-400">{user.email}</p>
            </div>
            <button
              onClick={onSignOut}
              title="Sign out"
              className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}


/* =========================================================================
   TOP BAR
   ========================================================================= */

export function TopBar({ title, subtitle, search, setSearch, theme, setTheme, onNewTask, setMobileOpen, showSearch }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-center gap-3 px-4 py-3 lg:px-8">
        <button
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h1>
          {subtitle && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {showSearch && (
          <div className="relative hidden w-64 sm:block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-500/20"
            />
          </div>
        )}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-md border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        {onNewTask && (
          <button
            onClick={onNewTask}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
          >
            <Plus size={15} /> <span className="hidden sm:inline">New Task</span>
          </button>
        )}
      </div>
    </header>
  );
}

