import React, { useState, useEffect, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";

import { STORAGE_KEYS, PALETTE } from "./lib/constants";
import {
  uid,
  todayYMD,
  taskCompletionPct,
  taskTotalHours,
  toDateTimeLocalValue,
  getTemplateSubtasks,
  buildAssignerDeptMap,
  DEFAULT_WORK_SESSIONS,
  getReceivedDate,
} from "./lib/timeUtils";
import { useLocalStorage } from "./lib/storage";
import { useAuth } from "./lib/useAuth";
import { useCloudDoc, makeFieldState } from "./lib/useCloudState";
import {
  buildSeedCategories,
  buildSeedDepartments,
  buildSeedAssigners,
  buildSeedTasks,
  buildSeedEverydayTasks,
  buildSeedEvents,
} from "./data/seedData";

import { Sidebar, TopBar } from "./components/Layout";
import { Login, LoadingScreen } from "./components/Login";
import { TaskModal } from "./components/TaskModal";
import { TasksView } from "./components/TasksViews";
import { CalendarPageView } from "./components/CalendarPageView";
import { EverydayView } from "./components/EverydayView";
import { DashboardView } from "./components/DashboardView";
import { AnalyticsView } from "./components/AnalyticsView";
import { TaskTypesView } from "./components/TaskTypesView";
import { SettingsView } from "./components/SettingsView";
import { PrintReport } from "./components/PrintReport";
import { ShareView } from "./components/ShareView";
import { makeShareToken, publishShare, removeShare, watchComments, deleteComment } from "./lib/share";
import { FeedbackView } from "./components/FeedbackView";

/* =========================================================================
   ROOT APP
   ========================================================================= */

export default function App() {
  // A share link (?share=TOKEN) opens a public read-only page — no login.
  const shareParam = new URLSearchParams(window.location.search).get("share");
  if (shareParam) return <ShareView token={shareParam} />;
  return <MainApp />;
}

function MainApp() {
  const { user, loading: authLoading, signIn, signOut, authError } = useAuth();
  const [theme, setTheme] = useLocalStorage(STORAGE_KEYS.theme, "light");

  // One Firestore document per signed-in user holds tasks + categories +
  // departments + assigners + holidays + workSchedule + everyday tasks/
  // completions + calendar events. These field-scoped [value, setValue] pairs
  // behave exactly like the old useLocalStorage ones, so every function below
  // (saveTask, deleteTask, importData, ...) needed no changes at all.
  const [cloudDoc, setCloudDoc] = useCloudDoc(user?.uid);
  const [tasks, setTasks] = makeFieldState(cloudDoc, setCloudDoc, "tasks", null);
  const [categories, setCategories] = makeFieldState(cloudDoc, setCloudDoc, "categories", null);
  const [departments, setDepartments] = makeFieldState(cloudDoc, setCloudDoc, "departments", null);
  const [assigners, setAssigners] = makeFieldState(cloudDoc, setCloudDoc, "assigners", null);
  const [holidays, setHolidays] = makeFieldState(cloudDoc, setCloudDoc, "holidays", []);
  const [workSchedule, setWorkSchedule] = makeFieldState(cloudDoc, setCloudDoc, "workSchedule", DEFAULT_WORK_SESSIONS);
  const [everydayTasks, setEverydayTasks] = makeFieldState(cloudDoc, setCloudDoc, "everydayTasks", null);
  const [everydayCompletions, setEverydayCompletions] = makeFieldState(cloudDoc, setCloudDoc, "everydayCompletions", {});
  const [events, setEvents] = makeFieldState(cloudDoc, setCloudDoc, "events", null);
  const [shareToken, setShareToken] = makeFieldState(cloudDoc, setCloudDoc, "shareToken", null);
  const [commentsSeenAt, setCommentsSeenAt] = makeFieldState(cloudDoc, setCloudDoc, "commentsSeenAt", 0);
  const [comments, setComments] = useState([]);
  const [shareIncludeNotes, setShareIncludeNotes] = makeFieldState(cloudDoc, setCloudDoc, "shareIncludeNotes", false);

  const [view, setView] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    category: "",
    subcategory: "",
    priority: "",
    status: "",
    assigner: "",
    department: "",
    from: "",
    to: "",
  });
  const [modalTask, setModalTask] = useState(undefined); // undefined = closed, null = new, object = edit
  const [printData, setPrintData] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null); // { task, timerId } | null

  // A brand-new user has no cloud document yet (confirmed by onSnapshot
  // reporting "doesn't exist", not just "still loading") — seed it once.
  useEffect(() => {
    if (user && cloudDoc === null) {
      setCloudDoc({
        tasks: buildSeedTasks(),
        categories: buildSeedCategories(),
        departments: buildSeedDepartments(),
        assigners: buildSeedAssigners(),
        holidays: [],
        workSchedule: DEFAULT_WORK_SESSIONS,
        everydayTasks: buildSeedEverydayTasks(),
        everydayCompletions: {},
        events: buildSeedEvents(),
      });
    }
  }, [user, cloudDoc, setCloudDoc]);

  // Keep the public read-only copy in step with the private data.
  useEffect(() => {
    if (!user || !shareToken || !tasks) return undefined;
    const timer = setTimeout(() => {
      publishShare(shareToken, { uid: user.uid, ownerName: user.displayName, tasks, holidaySet: new Set(holidays), workSchedule }).catch((e) =>
        console.error("Share sync error:", e)
      );
    }, 1500);
    return () => clearTimeout(timer);
  }, [user, shareToken, tasks, holidays, workSchedule]);

  // Notes left by viewers of the share link (only the owner can read them).
  useEffect(() => {
    if (!user || !shareToken) {
      setComments([]);
      return undefined;
    }
    return watchComments(shareToken, setComments, (e) => console.error("Feedback sync error:", e));
  }, [user, shareToken]);

  const unreadFeedback = comments.filter((c) => c.createdAt > (commentsSeenAt || 0)).length;

  // Opening the Feedback tab marks everything as read.
  useEffect(() => {
    if (view === "feedback" && comments.length > 0 && unreadFeedback > 0) {
      const t = setTimeout(() => setCommentsSeenAt(Date.now()), 2500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [view, comments, unreadFeedback]);

  function enableShare(regenerate) {
    const old = shareToken;
    const token = makeShareToken();
    setShareToken(token);
    if (regenerate && old) removeShare(old).catch(() => {});
  }
  function disableShare() {
    const old = shareToken;
    setShareToken(null);
    if (old) removeShare(old).catch(() => {});
  }

  const safeTasks = tasks || [];
  const safeCategories = categories || [];
  const safeDepartments = departments || [];
  const safeAssigners = assigners || [];
  const safeEverydayTasks = everydayTasks || [];
  const safeEvents = events || [];
  const holidaySet = useMemo(() => new Set(holidays), [holidays]);
  const categoryColors = useMemo(() => {
    const m = {};
    safeCategories.forEach((c, i) => {
      m[c.name] = PALETTE[i % PALETTE.length];
    });
    return m;
  }, [safeCategories]);
  const assignerDeptMap = useMemo(() => buildAssignerDeptMap(safeAssigners), [safeAssigners]);

  const saveTask = useCallback(
    (data) => {
      const now = new Date().toISOString();
      if (modalTask && modalTask.id) {
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id !== modalTask.id) return t;
            let completedAt = t.completedAt;
            if (data.status === "Completed" && t.status !== "Completed") completedAt = new Date().toISOString();
            if (data.status !== "Completed") completedAt = null;
            return { ...t, ...data, completedAt, updatedAt: now };
          })
        );
      } else {
        setTasks((prev) => [
          ...(prev || []),
          {
            ...data,
            id: uid(),
            createdAt: now,
            updatedAt: now,
            completedAt: data.status === "Completed" ? now : null,
          },
        ]);
      }
      setModalTask(undefined);
    },
    [modalTask, setTasks]
  );

  const deleteTask = useCallback(
    (id) => {
      setTasks((prev) => {
        const target = prev.find((t) => t.id === id);
        if (target) {
          const timerId = setTimeout(() => {
            setPendingDelete((pd) => (pd && pd.task.id === id ? null : pd));
          }, 6000);
          setPendingDelete((old) => {
            if (old) clearTimeout(old.timerId);
            return { task: target, timerId };
          });
        }
        return prev.filter((t) => t.id !== id);
      });
      setModalTask(undefined);
    },
    [setTasks]
  );

  function undoDelete() {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timerId);
    setTasks((prev) => [...prev, pendingDelete.task]);
    setPendingDelete(null);
  }

  function saveEvent(data) {
    setEvents((prev) => {
      const list = prev || [];
      if (data.id && list.some((e) => e.id === data.id)) {
        return list.map((e) => (e.id === data.id ? { ...e, ...data } : e));
      }
      return [...list, { ...data, id: uid() }];
    });
  }
  function deleteEvent(id) {
    setEvents((prev) => (prev || []).filter((e) => e.id !== id));
  }

  const changeStatus = useCallback(
    (id, status) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          let completedAt = t.completedAt;
          if (status === "Completed" && t.status !== "Completed") completedAt = new Date().toISOString();
          if (status !== "Completed") completedAt = null;
          return { ...t, status, completedAt };
        })
      );
    },
    [setTasks]
  );

  // Simple stopwatch: first click saves "now" as the task's runningStart; second
  // click ("End") saves "now" as the end, turns the pair into a session, and
  // marks the task Completed — stopping the clock means the work is done.
  const toggleTimer = useCallback(
    (taskId) => {
      const now = toDateTimeLocalValue(new Date());
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          if (t.runningStart) {
            return {
              ...t,
              runningStart: null,
              sessions: [...(t.sessions || []), { id: uid(), start: t.runningStart, end: now }],
              status: "Completed",
              completedAt: new Date().toISOString(),
            };
          }
          return { ...t, runningStart: now };
        })
      );
    },
    [setTasks]
  );

  // Minimal-friction capture: only a title is required, everything else takes
  // sensible defaults (and the subcategory's template, if one is set).
  const quickAddTask = useCallback(
    (title) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      const firstCat = safeCategories[0];
      const firstSub = firstCat?.subcategories[0];
      const now = new Date().toISOString();
      setTasks((prev) => [
        ...(prev || []),
        {
          id: uid(),
          title: trimmed,
          description: "",
          assigner: "",
          receivedDate: todayYMD(),
          deadline: todayYMD(),
          priority: "Medium",
          category: firstCat?.name || "",
          subcategory: firstSub?.name || "",
          status: "Not Started",
          trackBusinessHours: true,
          subtasks: firstSub ? getTemplateSubtasks(safeCategories, firstCat.name, firstSub.name) : [],
          sessions: [],
          createdAt: now,
          updatedAt: now,
          completedAt: null,
        },
      ]);
    },
    [safeCategories, setTasks]
  );

  function exportData() {
    const payload = {
      app: "legal-performance-tracker",
      version: 4,
      exportedAt: new Date().toISOString(),
      tasks: safeTasks,
      categories: safeCategories,
      departments: safeDepartments,
      assigners: safeAssigners,
      holidays,
      workSchedule,
      everydayTasks: safeEverydayTasks,
      everydayCompletions,
      events: safeEvents,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `legal-performance-tracker-backup-${todayYMD()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      let data;
      try {
        data = JSON.parse(e.target.result);
      } catch {
        alert("This file isn't valid JSON.");
        return;
      }
      if (!Array.isArray(data.tasks) || !Array.isArray(data.categories)) {
        alert("This doesn't look like a Legal Performance Tracker backup file.");
        return;
      }
      if (
        !window.confirm(
          `Import ${data.tasks.length} task(s) and ${data.categories.length} categor${data.categories.length === 1 ? "y" : "ies"}? This will REPLACE all data currently in the app.`
        )
      ) {
        return;
      }
      setTasks(data.tasks);
      setCategories(data.categories);
      if (Array.isArray(data.holidays)) setHolidays(data.holidays);
      // Older backups predate later fields (Departments & Assigners / Work Schedule /
      // Everyday / Calendar events) — keep current values if the file has none.
      if (Array.isArray(data.departments)) setDepartments(data.departments);
      if (Array.isArray(data.assigners)) setAssigners(data.assigners);
      if (Array.isArray(data.workSchedule)) setWorkSchedule(data.workSchedule);
      if (Array.isArray(data.everydayTasks)) setEverydayTasks(data.everydayTasks);
      if (data.everydayCompletions && typeof data.everydayCompletions === "object") setEverydayCompletions(data.everydayCompletions);
      if (Array.isArray(data.events)) setEvents(data.events);
    };
    reader.readAsText(file);
  }

  function exportExcel(list) {
    const rows = list.map((t) => ({
      Title: t.title,
      Category: t.category,
      Subcategory: t.subcategory,
      Priority: t.priority,
      Status: t.status,
      Assigner: t.assigner,
      Department: assignerDeptMap[t.assigner] || "",
      Received: getReceivedDate(t),
      Deadline: t.deadline,
      "Business hours only": t.trackBusinessHours !== false ? "Yes" : "No",
      "Completion %": taskCompletionPct(t),
      "Estimated Hours": t.estimate || "",
      "Total Hours": +taskTotalHours(t, holidaySet, workSchedule).toFixed(2),
      Rounds: t.rounds?.length || 0,
      Description: t.description,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 30 },
      { wch: 14 },
      { wch: 24 },
      { wch: 10 },
      { wch: 14 },
      { wch: 22 },
      { wch: 16 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 10 },
      { wch: 40 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, `legal-performance-tracker-${todayYMD()}.xlsx`);
  }

  function exportPdf(list) {
    setPrintData(list);
    setTimeout(() => {
      window.print();
      setPrintData(null);
    }, 50);
  }

  const titles = {
    dashboard: ["Dashboard", "Overview of your legal & compliance performance"],
    everyday: ["Everyday", "Small daily habits — separate from your regular tasks"],
    calendar: ["Calendar", "Task deadlines and your own plans, in one place"],
    tasks: ["Tasks", "Manage, filter and track every task"],
    types: ["Task Types", "Performance measured separately per Task Type (Subcategory)"],
    analytics: ["Analytics", "Trends across time, category and workload"],
    feedback: ["Feedback", "Notes and recommendations left by people viewing your shared link"],
    settings: ["Settings", "Office hours, holidays and category configuration"],
  };

  if (authLoading) return <LoadingScreen />;
  if (!user) return <Login onSignIn={signIn} error={authError} />;
  if (cloudDoc === undefined || cloudDoc === null) return <LoadingScreen />;

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="app-shell min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b0e14] dark:text-slate-100">
        <Sidebar view={view} setView={setView} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} user={user} onSignOut={signOut} unreadFeedback={unreadFeedback} />
        <div className="lg:pl-64">
          <TopBar
            title={titles[view][0]}
            subtitle={titles[view][1]}
            search={search}
            setSearch={setSearch}
            theme={theme}
            setTheme={setTheme}
            onNewTask={() => setModalTask(null)}
            setMobileOpen={setMobileOpen}
            showSearch={view === "tasks"}
          />
          <main className="px-4 py-5 lg:px-8">
            {view === "dashboard" && (
              <DashboardView
                tasks={safeTasks}
                holidaySet={holidaySet}
                workSchedule={workSchedule}
                categoryCount={safeCategories.length}
                onOpen={(t) => setModalTask(t)}
                onViewTypes={() => setView("types")}
              />
            )}
            {view === "everyday" && (
              <EverydayView
                everydayTasks={safeEverydayTasks}
                everydayCompletions={everydayCompletions}
                setEverydayTasks={setEverydayTasks}
                setEverydayCompletions={setEverydayCompletions}
              />
            )}
            {view === "calendar" && (
              <CalendarPageView
                tasks={safeTasks}
                events={safeEvents}
                categoryColors={categoryColors}
                onOpenTask={(t) => setModalTask(t)}
                onSaveEvent={saveEvent}
                onDeleteEvent={deleteEvent}
              />
            )}
            {view === "tasks" && (
              <TasksView
                tasks={safeTasks}
                holidaySet={holidaySet}
                workSchedule={workSchedule}
                categories={safeCategories}
                categoryColors={categoryColors}
                assigners={safeAssigners}
                departments={safeDepartments}
                assignerDeptMap={assignerDeptMap}
                filters={filters}
                setFilters={setFilters}
                search={search}
                onOpen={(t) => setModalTask(t)}
                onStatusChange={changeStatus}
                onExportExcel={exportExcel}
                onExportPdf={exportPdf}
                onToggleTimer={toggleTimer}
                onQuickAdd={quickAddTask}
              />
            )}
            {view === "types" && (
              <TaskTypesView
                tasks={safeTasks}
                holidaySet={holidaySet}
                workSchedule={workSchedule}
                categories={safeCategories}
                categoryColors={categoryColors}
                onOpenTask={(t) => setModalTask(t)}
              />
            )}
            {view === "analytics" && (
              <AnalyticsView
                tasks={safeTasks}
                holidaySet={holidaySet}
                workSchedule={workSchedule}
                categoryColors={categoryColors}
                assignerDeptMap={assignerDeptMap}
                theme={theme}
              />
            )}
            {view === "feedback" && (
              <FeedbackView
                comments={comments}
                tasks={safeTasks}
                shareToken={shareToken}
                seenAt={commentsSeenAt}
                onOpenTask={(t) => setModalTask(t)}
                onDelete={(id) => deleteComment(shareToken, id).catch((e) => console.error(e))}
              />
            )}
            {view === "settings" && (
              <SettingsView
                holidays={holidays}
                setHolidays={setHolidays}
                workSchedule={workSchedule}
                setWorkSchedule={setWorkSchedule}
                categories={safeCategories}
                setCategories={setCategories}
                departments={safeDepartments}
                setDepartments={setDepartments}
                assigners={safeAssigners}
                setAssigners={setAssigners}
                tasks={safeTasks}
                setTasks={setTasks}
                userId={user.uid}
                onResetDemo={() => {
                  exportData(); // safety: download a backup file first
                  setTasks(buildSeedTasks());
                  setCategories(buildSeedCategories());
                  setDepartments(buildSeedDepartments());
                  setAssigners(buildSeedAssigners());
                  setWorkSchedule(DEFAULT_WORK_SESSIONS);
                  setEverydayTasks(buildSeedEverydayTasks());
                  setEverydayCompletions({});
                  setEvents(buildSeedEvents());
                }}
                onExportData={exportData}
                onImportData={importData}
                shareToken={shareToken}
                shareIncludeNotes={shareIncludeNotes}
                onEnableShare={enableShare}
                onDisableShare={disableShare}
                onShareNotes={setShareIncludeNotes}
              />
            )}
          </main>
        </div>

        {pendingDelete && (
          <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl dark:bg-slate-100 dark:text-slate-900">
            <span className="max-w-[220px] truncate">Deleted "{pendingDelete.task.title}"</span>
            <button onClick={undoDelete} className="shrink-0 font-medium text-indigo-300 hover:underline dark:text-indigo-600">
              Undo
            </button>
          </div>
        )}
      </div>

      {modalTask !== undefined && (
        <TaskModal
          key={modalTask ? modalTask.id : "new"}
          task={modalTask}
          categories={safeCategories}
          assigners={safeAssigners}
          holidaySet={holidaySet}
          workSchedule={workSchedule}
          onClose={() => setModalTask(undefined)}
          onSave={saveTask}
          onDelete={deleteTask}
        />
      )}

      {printData && <PrintReport tasks={printData} holidaySet={holidaySet} workSchedule={workSchedule} />}
    </div>
  );
}

