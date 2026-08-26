import { uid, formatYMD, addDays, toDateTimeLocalValue } from "../lib/timeUtils";

/* =========================================================================
   SEED DATA
   ========================================================================= */

export function buildSeedCategories() {
  const mk = (names) => names.map((name) => ({ id: uid(), name }));
  return [
    { id: uid(), name: "Legal", subcategories: mk(["Contract Review", "Licensing", "Internal Documents", "Legal Advice", "Others"]) },
    {
      id: uid(),
      name: "Compliance",
      subcategories: mk([
        "Internal Regulation Review",
        "Internal Audit",
        "Investigation",
        "Complaint Handling",
        "Ticket",
        "Risk Assessment",
        "Others",
      ]),
    },
    { id: uid(), name: "Human Resources", subcategories: mk(["Recruitment", "Employee Relations", "Policy", "Others"]) },
    { id: uid(), name: "Finance", subcategories: mk(["Budgeting", "Invoicing", "Reporting", "Others"]) },
    { id: uid(), name: "Procurement", subcategories: mk(["Vendor Management", "Purchase Orders", "Others"]) },
    { id: uid(), name: "Operations", subcategories: mk(["Process Improvement", "Logistics", "Others"]) },
    { id: uid(), name: "IT", subcategories: mk(["Support Ticket", "System Access", "Others"]) },
    { id: uid(), name: "Personal", subcategories: mk(["Training", "Admin", "Others"]) },
    { id: uid(), name: "Others", subcategories: mk(["General"]) },
  ];
}

export function buildSeedDepartments() {
  return ["Legal", "Compliance", "Finance", "Human Resources", "Marketing", "IT"].map((name) => ({ id: uid(), name }));
}

export function buildSeedAssigners() {
  return [
    { id: uid(), name: "Nguyen Van A", department: "Finance" },
    { id: uid(), name: "Tran Thi B", department: "Legal" },
    { id: uid(), name: "Le Van C", department: "Compliance" },
    { id: uid(), name: "Pham Thi D", department: "Human Resources" },
    { id: uid(), name: "Hoang Van E", department: "Marketing" },
    { id: uid(), name: "IT Service Desk", department: "IT" },
  ];
}

export function buildSeedEverydayTasks() {
  return [
    { id: uid(), title: "Check emails & urgent notices", note: "Scan inbox first thing — flag anything with a court/regulatory deadline." },
    { id: uid(), title: "Review today's deadlines", note: "Glance at the Dashboard's Upcoming Deadlines list." },
    { id: uid(), title: "Log time for yesterday", note: "Make sure yesterday's work sessions are all entered before they're forgotten." },
  ];
}

export function buildSeedEvents() {
  const today = new Date();
  const mk = (offsetDays) => formatYMD(addDays(today, offsetDays));
  return [
    { id: uid(), title: "Weekly team sync", date: mk(2), time: "09:30", note: "Quick status round — no prep needed." },
    { id: uid(), title: "Call with vendor legal team", date: mk(4), time: "14:00", note: "" },
  ];
}

export function buildSeedTasks() {
  const today = new Date();
  const mk = (offsetDays) => formatYMD(addDays(today, offsetDays));
  const dt = (offsetDays, h, m) => {
    const d = addDays(today, offsetDays);
    d.setHours(h, m, 0, 0);
    return toDateTimeLocalValue(d);
  };
  const base = (over) => ({
    id: uid(),
    trackBusinessHours: true,
    createdAt: addDays(today, -3).toISOString(),
    completedAt: null,
    ...over,
  });

  return [
    base({
      title: "Review vendor supply agreement",
      description: "Review and redline the master supply agreement with new logistics vendor.",
      assigner: "Nguyen Van A",
      deadline: mk(5),
      priority: "High",
      category: "Legal",
      subcategory: "Contract Review",
      status: "In Progress",
      subtasks: [
        { id: uid(), title: "First read-through", done: true },
        { id: uid(), title: "Redline draft", done: true },
        { id: uid(), title: "Send comments to vendor", done: false },
      ],
      sessions: [{ id: uid(), start: dt(-2, 9, 0), end: dt(-2, 11, 30) }, { id: uid(), start: dt(-1, 14, 0), end: dt(-1, 17, 0) }],
      rounds: [
        { id: uid(), date: mk(-6), label: "Internal", recipient: "Tran Thi B - Supervisor", note: "Supervisor reviewed draft comments, agreed to proceed" },
        { id: uid(), date: mk(-5), label: "Sent", recipient: "Vendor Legal Team", note: "V1 sent to vendor for comments" },
        { id: uid(), date: mk(-2), label: "Received", recipient: "Vendor Legal Team", note: "Vendor returned with counter-proposals on liability cap" },
      ],
    }),
    base({
      title: "Renew business operation license",
      description: "Prepare and submit renewal dossier for annual operating license.",
      assigner: "Tran Thi B",
      deadline: mk(-2),
      priority: "High",
      category: "Legal",
      subcategory: "Licensing",
      status: "Waiting",
      subtasks: [
        { id: uid(), title: "Collect documents", done: true },
        { id: uid(), title: "Submit to authority", done: true },
        { id: uid(), title: "Follow up approval", done: false },
      ],
      sessions: [{ id: uid(), start: dt(-10, 8, 0), end: dt(-9, 12, 0) }],
      createdAt: addDays(today, -12).toISOString(),
    }),
    base({
      title: "Q3 internal audit - Procurement",
      description: "Conduct quarterly internal audit for the procurement department.",
      assigner: "Le Van C",
      deadline: mk(-15),
      priority: "Medium",
      category: "Compliance",
      subcategory: "Internal Audit",
      status: "Completed",
      subtasks: [
        { id: uid(), title: "Fieldwork", done: true },
        { id: uid(), title: "Draft findings", done: true },
        { id: uid(), title: "Final report", done: true },
      ],
      sessions: [
        { id: uid(), start: dt(-25, 8, 0), end: dt(-24, 17, 0) },
        { id: uid(), start: dt(-23, 8, 0), end: dt(-22, 17, 0) },
      ],
      createdAt: addDays(today, -30).toISOString(),
      completedAt: addDays(today, -16).toISOString(),
    }),
    base({
      title: "Employee data handling complaint",
      description: "Investigate complaint related to personal data handling by HR.",
      assigner: "Pham Thi D",
      deadline: mk(3),
      priority: "High",
      category: "Compliance",
      subcategory: "Complaint Handling",
      status: "In Progress",
      subtasks: [
        { id: uid(), title: "Interview parties", done: true },
        { id: uid(), title: "Review evidence", done: false },
      ],
      sessions: [{ id: uid(), start: dt(-1, 13, 0), end: dt(-1, 16, 0) }],
      createdAt: addDays(today, -4).toISOString(),
    }),
    base({
      title: "Update employee handbook policy",
      description: "Draft update to reflect new labor code requirements.",
      assigner: "Nguyen Van A",
      deadline: mk(10),
      priority: "Low",
      category: "Legal",
      subcategory: "Internal Documents",
      status: "Not Started",
      subtasks: [],
      sessions: [],
      createdAt: addDays(today, -1).toISOString(),
    }),
    base({
      title: "Advise on new marketing campaign",
      description: "Legal review for compliance of new advertising campaign claims.",
      assigner: "Hoang Van E",
      deadline: mk(-30),
      priority: "Medium",
      category: "Legal",
      subcategory: "Legal Advice",
      status: "Completed",
      subtasks: [{ id: uid(), title: "Review claims", done: true }],
      sessions: [{ id: uid(), start: dt(-33, 9, 0), end: dt(-33, 12, 0) }],
      createdAt: addDays(today, -35).toISOString(),
      completedAt: addDays(today, -31).toISOString(),
    }),
    base({
      title: "AML risk assessment 2026",
      description: "Annual anti-money laundering risk assessment for the business unit.",
      assigner: "Le Van C",
      deadline: mk(20),
      priority: "Medium",
      category: "Compliance",
      subcategory: "Risk Assessment",
      status: "Not Started",
      subtasks: [
        { id: uid(), title: "Gather data", done: false },
        { id: uid(), title: "Score risk factors", done: false },
        { id: uid(), title: "Present to ExCo", done: false },
      ],
      sessions: [],
      createdAt: addDays(today, -2).toISOString(),
    }),
    base({
      title: "IT helpdesk compliance ticket #4021",
      description: "Review access-control ticket flagged by internal audit tool.",
      assigner: "IT Service Desk",
      deadline: mk(1),
      priority: "Low",
      category: "Compliance",
      subcategory: "Ticket",
      status: "In Progress",
      trackBusinessHours: false,
      subtasks: [{ id: uid(), title: "Review access logs", done: true }],
      sessions: [{ id: uid(), start: dt(0, 8, 30), end: dt(0, 9, 15) }],
      createdAt: addDays(today, -1).toISOString(),
    }),
    base({
      title: "Internal regulation review - Procurement policy",
      description: "Review internal procurement regulation against latest legal updates.",
      assigner: "Tran Thi B",
      deadline: mk(-45),
      priority: "Medium",
      category: "Compliance",
      subcategory: "Internal Regulation Review",
      status: "Completed",
      subtasks: [
        { id: uid(), title: "Benchmark", done: true },
        { id: uid(), title: "Draft amendment", done: true },
      ],
      sessions: [{ id: uid(), start: dt(-50, 8, 0), end: dt(-49, 17, 0) }],
      createdAt: addDays(today, -55).toISOString(),
      completedAt: addDays(today, -46).toISOString(),
    }),
    base({
      title: "NDA review - potential partner",
      description: "Review mutual NDA before commercial discussions.",
      assigner: "Hoang Van E",
      deadline: mk(-60),
      priority: "Low",
      category: "Legal",
      subcategory: "Contract Review",
      status: "Completed",
      subtasks: [{ id: uid(), title: "Review & sign off", done: true }],
      sessions: [{ id: uid(), start: dt(-62, 10, 0), end: dt(-62, 11, 0) }],
      createdAt: addDays(today, -63).toISOString(),
      completedAt: addDays(today, -61).toISOString(),
    }),
    base({
      title: "Weekend incident response - data breach drill",
      description: "Overtime drill run outside office hours to test incident response readiness.",
      assigner: "Le Van C",
      deadline: mk(-5),
      priority: "High",
      category: "Compliance",
      subcategory: "Investigation",
      status: "Completed",
      trackBusinessHours: false,
      subtasks: [{ id: uid(), title: "Run drill", done: true }],
      sessions: [{ id: uid(), start: dt(-7, 19, 0), end: dt(-6, 1, 0) }],
      createdAt: addDays(today, -8).toISOString(),
      completedAt: addDays(today, -6).toISOString(),
    }),
  ];
}

