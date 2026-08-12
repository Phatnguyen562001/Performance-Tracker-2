# Legal Performance Tracker

A modern (Notion/Jira/Linear-style) performance tracker for a Legal & Compliance
Officer — tasks, subtasks, business-hours time tracking, per-task-type
analytics, and dashboards. Built with React + Vite + Tailwind CSS.

Each person signs in with their own Google account (Firebase Authentication),
and their tasks/categories/departments/assigners/holidays are synced in real
time to their own private space in Firestore. Nobody can see anybody else's
data — everything is scoped to the signed-in user's account.

## Project structure

```
├── index.html                 Vite HTML entry
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── netlify.toml                Netlify build + SPA redirect config
├── firestore.rules             Security rules to paste into Firebase Console
└── src/
    ├── main.jsx                 React entry point
    ├── App.jsx                  Root component: auth gate, routing, task CRUD
    ├── index.css                Tailwind directives, fonts, print styles
    ├── lib/
    │   ├── constants.js          Priorities, statuses, colors, storage keys
    │   ├── timeUtils.js          Date/business-hours engine, period & per-type stats
    │   ├── storage.js            useLocalStorage hook (used only for theme now)
    │   ├── firebase.js           Firebase app/auth/Firestore initialization
    │   ├── useAuth.js            Google Sign-In hook
    │   └── useCloudState.js      Real-time Firestore sync hook (replaces localStorage)
    ├── data/
    │   └── seedData.js           Demo categories + tasks shown on first login
    └── components/
        ├── ui.jsx                 Badge, ProgressBar, StatCard, EmptyState, Field...
        ├── Login.jsx               Sign-in screen + loading screen
        ├── Layout.jsx              Sidebar (+ account/sign-out) + TopBar
        ├── TaskModal.jsx           Create/edit task (details, subtasks, time log)
        ├── FilterBar.jsx           Task list filters
        ├── TasksViews.jsx          Table / Kanban / Calendar views
        ├── DashboardView.jsx       Overview KPIs
        ├── AnalyticsView.jsx       Charts, Monthly/Quarterly period switch
        ├── TaskTypesView.jsx       Per-subcategory performance breakdown
        ├── SettingsView.jsx        Holidays, Categories, Assigners & Departments
        └── PrintReport.jsx         Printable table used for "Export PDF"
```

## Requirements

- Node.js 18+ and npm
- A Firebase project with **Authentication → Google** enabled and a
  **Firestore Database** created (see below if you haven't done this yet)

## Firebase setup (one-time)

1. In the [Firebase Console](https://console.firebase.google.com), open your
   project → **Security → Authentication → Sign-in method** → enable **Google**.
2. **Databases & Storage → Firestore** → create a database (Standard edition,
   production mode, pick a nearby region).
3. **Databases & Storage → Firestore → Rules** tab → paste the contents of
   `firestore.rules` from this project → **Publish**. This is what makes sure
   every user can only ever read/write their own data.
4. **Project settings → General → Your apps** → your web app's config is
   already filled in at `src/lib/firebase.js`. If you ever create a new
   Firebase project, replace the `firebaseConfig` object there with the new
   one (this config is not secret — it's meant to ship in client code).
5. Once you deploy to Netlify (or any host), copy that site's domain (e.g.
   `your-app.netlify.app`) and add it under **Authentication → Settings →
   Authorized domains**, otherwise Google Sign-In will be blocked on that
   domain. `localhost` is already authorized by default for local dev.

## Local development

```bash
npm install
npm run dev
```

Opens the app at `http://localhost:5173` with hot reload.

## Production build

```bash
npm install
npm run build
```

This produces a fully static, deployable bundle in `dist/`. Preview it
locally with:

```bash
npm run preview
```

> **Note on this sandbox:** the environment this project was authored in has
> no outbound network access, so `npm install` could not be run here to
> produce a `dist/` folder directly. Every file has instead been validated
> offline: each module was syntax-checked individually, and the whole
> `src/` tree was bundled with esbuild (Firebase/React/Recharts/etc. marked
> external) to confirm every import/export between local files resolves
> correctly with zero errors or warnings. Running `npm install && npm run
> build` on a machine with internet access (or letting Netlify's own build
> servers do it, see below) will produce a working `dist/` folder.

## Deploying to Netlify

`netlify.toml` is already configured with `command = "npm run build"` and
`publish = "dist"`, plus a catch-all redirect so client-side routing doesn't
404 on refresh. Three ways to deploy:

### Option A — Connect a Git repository (recommended)

1. Push this project to a GitHub/GitLab/Bitbucket repo.
2. In Netlify: **Add new site → Import an existing project** → pick the repo.
3. Netlify reads `netlify.toml` automatically. Click **Deploy**.
4. Netlify's build servers have internet access and will run `npm install`
   and `npm run build` for you — no local build needed.
5. Don't forget Firebase setup step 5 above (add the Netlify domain to
   Authorized domains) once you have the live URL.

### Option B — Build locally, drag-and-drop

```bash
npm install
npm run build
```

Then go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag the
generated `dist/` folder onto the page.

### Option C — Netlify CLI

```bash
npm install
npm run build
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

## Data & persistence

- **Tasks, categories, departments, assigners, holidays** — synced in real
  time to Firestore at `users/{your-uid}/data/main`, one document per
  account. Sign in with a different Google account and you get a completely
  separate, empty tracker (seeded with the same demo data on first login).
- **Theme (dark/light)** — stays in the browser's `localStorage` only, since
  it's a per-device preference rather than data worth syncing.
- **Backups** — use **Settings → Export backup (.json)** regularly. Since
  everything lives in one Firestore document, this file is also the easiest
  way to move data between accounts or restore after a mistake (**Settings →
  Import backup**).
- **Scaling note** — a single document per user keeps the sync logic simple
  and is comfortably within Firestore's 1MB/document limit for personal use
  (hundreds of tasks). If task volume ever grows very large, `src/lib/useCloudState.js`
  is the one place that would need to change to a `tasks` subcollection instead.
