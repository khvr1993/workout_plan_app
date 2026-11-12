# Workout — 3-Day Full-Body Tracker

A personal, offline-first PWA that runs a fixed 3-day/week full-body hypertrophy program built around a real home-gym equipment ceiling. It tells you what to train today, runs superset rest timers for you, and remembers exactly what you lifted so you can beat it next week.

**Stack:** React 19 · TypeScript (strict) · Vite 6 · Tailwind CSS v4 · zustand · zod · vite-plugin-pwa

## The program

Three ~22-minute full-body sessions on a flexible **1 → 2 → 3 rotation** — train whenever, the app tracks what's next. Recovery walks are logged but never advance the rotation.

| Day | Emphasis |
|---|---|
| Day 1 | Quad & Upper Chest |
| Day 2 | Hamstring, Overhead & Back |
| Day 3 | Glute, Flat Chest & Side Delt |

16 exercises in antagonist supersets with tempo eccentrics, 1.5-rep schemes and pause reps. Every exercise carries execution notes and a coaching cue (open the ⓘ on any card).

Use **Edit** on any day to reorder blocks and exercises, tune sets/reps/rest, remove movements, or add new ones — pick from the exercise library or create a custom exercise with the full form: volume, rep unit, tempo, load type, available weights (including custom denominations), equipment, execution and coach cue. The form links to the [free-exercise-db](https://yuhonas.github.io/free-exercise-db/) browsable library for form references. **New block** starts a fresh block when the existing ones are full.

### Form guides

Every exercise includes a visual form guide: real start/end-position photos that crossfade like a GIF, numbered technique steps that highlight in sync with the position shown, play/pause and manual Start/End controls, and a link out to video demonstrations. Open them from the ⓘ sheet on any workout card, the **Form demo** toggle on a day's detail page, or the **Form guide** section on an exercise's progress page.

Photos come from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense / public domain) and are bundled in `public/exercises/`, so form guides work fully offline; only the video link needs a connection.

### Equipment is a hard constraint

Available: dumbbell pairs and barbells up to **15 kg**, adjustable bench (flat / 30° / 45° / 75–80°). Every exercise offers the same three selectable loads — **7.5 / 10 / 15 kg** — in the session picker and the exercise form; custom entry is available but secondary. Because load tops out at 15 kg, progression runs through four levers, suggested (never auto-applied) by the engine:

1. **Reps** — climb the rep range, then jump to the next real denomination
2. **Tempo** — 3s → 4s eccentrics once reps and load are maxed
3. **Pause** — strict 1s isometric at the stretched position
4. **Rest** — compress 60s → 45s between supersets

## Getting started

```sh
npm install
npm run dev        # dev server (served under /workout_plan_app/)
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) + production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Vitest suite (unit + jsdom integration tests) |
| `npm run icons` | Regenerate PWA icons (dependency-free Node script) |

## Deployment (GitHub Pages)

Pushing to `main` triggers `.github/workflows/deploy.yml`: tests → build → deploy. One-time repo setup: **Settings → Pages → Source: GitHub Actions**.

The build uses a relative `base: './'`, so the same `dist` works at a domain root (Vercel, custom domains) and under a repository subpath (project Pages) with no config change. A `HashRouter` keeps the document URL fixed, so asset and service-worker URLs stay valid and deep links never 404. Pages serves static files only — the security headers in `vercel.json` do not apply there (see *Security & privacy*).

## Deployment (Vercel)

Import the repository with framework **Vite** (or use the committed `vercel.json`), build `npm run build`, output `dist`, root directory empty. Every push to `main` builds automatically; open the newest deployment rather than redeploying an older one.

## Offline & install

- Service worker precaches the full app shell; everything works with no network.
- **Install:** Android Chrome shows an install prompt (also in Settings); iOS Safari → Share → *Add to Home Screen*.
- Updates surface a non-blocking "Update available" toast; applying it reloads into the new version.
- All data lives in `localStorage` on your device. Nothing is sent anywhere.

## Your data

- Sessions snapshot exercise names, targets and the unit used at logging time — editing the program or switching kg/lb never rewrites history. Internally, stats normalize to kg.
- Storage is versioned (`v3` envelopes) with a migration chain. Data written by a newer app version opens in read-only safe mode with an export prompt instead of being corrupted.
- **Settings → Data** offers JSON export, validated import (zod — a bad file fails loudly and changes nothing), storage usage, and a two-step clear-all.
- **Automatic backup** (desktop Chrome/Edge): pick one file once in Settings → Data and the app overwrites it daily while open, and shortly after your data changes. The file handle lives in IndexedDB; if write permission expires, the app pauses and offers a one-tap reconnect. Other browsers keep the manual export.
- A reminder card appears at most every 3 days until a backup exists (or automatic backup is on); “Remind me in 3 days” snoozes it.
- In-progress sessions survive refresh, backgrounding and app kills; rest timers are stored as end-timestamps so they stay accurate while the app is backgrounded.

## Security & privacy

Single-user and offline-first: no accounts, no server, no analytics, no runtime network requests. That removes most of the usual web attack surface; the remaining untrusted input is an imported backup file.

- **Imports are bounded.** Files over 5 MB are rejected before they are read, collection and text lengths have hard caps in the schema, and dates must be real calendar days — not merely `YYYY-MM-DD`. A crafted file can neither exhaust memory nor store a value that later crashes a screen.
- **Stored data is validated on load.** An unreadable key opens the app read-only instead of being overwritten; the banner names the damaged key, and the recovery export keeps the original stored text next to a normal, re-importable backup.
- **No XSS surface:** no `innerHTML`, `dangerouslySetInnerHTML`, `eval` or third-party scripts. Fonts and exercise photos are bundled; the only outbound requests are the links you click.
- **Headers** (Vercel): strict CSP with the inline theme bootstrap allowed by hash only, plus `nosniff`, `no-referrer`, `Permissions-Policy` and `frame-ancestors 'none'`. GitHub Pages cannot set response headers, so that deployment has no CSP or clickjacking protection.
- **Origin boundary:** on `*.github.io` all project sites share one origin, so another app hosted under the same account can read or overwrite `wt:*` localStorage. Use a dedicated domain (or Vercel) if that matters.
- **At rest:** the full history (weights, RPE, notes) is unencrypted in `localStorage`, and exports/auto-backups are plaintext JSON — treat a backup file as sensitive, especially in a synced folder.

## Design

Linear-inspired: dark-first with a light theme, one swappable accent (emerald / indigo / amber) reserved strictly for actions and completion — never navigation or decoration. No gradients; depth comes from surface layering and 1px borders. Inter Variable with tabular numerals for all set and stat values. 44px touch targets, `prefers-reduced-motion` respected, haptics on set completion and timer end.

## Project layout

```
src/
├─ app/          router, providers, shell wiring
├─ components/   ui primitives · layout · workout · history · charts
├─ screens/      Today · Session · Program · DayDetail · History ·
│                SessionDetail · Progress · ExerciseProgress · Settings
├─ data/         types · program seed · form demos · zod schemas · storage · migrations
├─ store/        zustand store + selectors (persisted via storage adapter)
├─ lib/          stats · progression · volume · units · export · autoBackup · date
├─ styles/       design tokens + globals (Tailwind v4 @theme)
└─ pwa/          service-worker registration, update toast, install capture
```

## Tests

```sh
npm test
```

Covers the program seed integrity, rotation/volume/PR math, the progression engine, storage envelopes and migrations, store behaviors (draft recovery, rotation rules, recovery walks), form-guide data and photo assets, the demo player, and full session-logging integration flows — including that a superset starts exactly one rest timer per completed round, only after **both** exercises are done. It also pins the hardening work: calendar-date and import-size limits, corrupt-key detection, read-only guards, a finish that only reports success after a real write, rotation rollback on delete, and the CSP hash staying in sync with the inline script.