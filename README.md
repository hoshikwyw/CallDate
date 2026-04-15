# CallDate

> A couples app that turns quality time into visible progress.

CallDate is a relationship-first dating app built for couples who want to keep showing up for each other. One partner "calls" a date by proposing places, times, and a personal message; the other picks where to go. Every completed date grows a shared **friendship goal** — a gamified record of the relationship.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database setup](#database-setup)
- [Project structure](#project-structure)
- [Scripts](#scripts)
- [Conventions](#conventions)
- [Roadmap](#roadmap)

---

## Features

- **Auth & profiles** — email/password via Supabase Auth, profile auto-provisioned on signup.
- **Friend/partner pairing** — send and accept friend requests to link two accounts.
- **Date invites** — propose a title, date, time, optional personal message, and a shortlist of places.
- **Partner confirmation flow** — the invitee picks from proposed places and confirms the date.
- **Calendar view** — upcoming, confirmed, and completed dates grouped by date.
- **Friendship goals** — per-couple progress counter that levels up as dates are completed.
- **Date memories** — post-date memos and photo attachments tied to completed dates.
- **Dark mode** — theme toggle persisted across sessions.

## Tech stack

| Layer      | Choice                                                    |
| ---------- | --------------------------------------------------------- |
| Frontend   | React 19, TypeScript, Vite 7                              |
| Styling    | Tailwind CSS 3                                            |
| Routing    | React Router 7                                            |
| Icons      | lucide-react                                              |
| Backend    | Supabase (Postgres, Auth, Storage, Row-Level Security)   |
| Tooling    | ESLint 9, typescript-eslint, PostCSS, Autoprefixer        |

## Architecture

CallDate is a fully client-rendered SPA that talks directly to Supabase. There is no custom backend — authorization is enforced by Postgres **Row-Level Security** policies defined in [supabase-schema.sql](supabase-schema.sql).

```
┌──────────────┐      Supabase JS SDK       ┌──────────────────────┐
│  React SPA   │ ─────────────────────────▶ │  Supabase            │
│  (Vite)      │                            │   • Auth             │
│              │ ◀───────────────────────── │   • Postgres + RLS   │
└──────────────┘      realtime / rest       │   • Storage          │
                                            └──────────────────────┘
```

Core tables:

- `profiles` — mirrors `auth.users`, auto-created by trigger on signup.
- `friendships` — directional request (`requester_id` → `addressee_id`) with `pending | accepted | rejected` status.
- `friendship_goals` — auto-created when a friendship is accepted; tracks `completed_dates` and `current_level`.
- `date_invites` — proposed vs confirmed date/time, `pending | confirmed | completed | cancelled`.
- `places` — candidate venues attached to an invite; the chosen one has `is_selected = true`.
- `date_memories` — memo + photo URLs tied to a completed invite.

Every table has RLS enabled. Users can only read/write rows where they are a participant — see the policies in the schema file for the exact predicates.

## Getting started

**Prerequisites:** Node.js 20+ and a Supabase project.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (see below)
cp .env.example .env.local   # then fill in your Supabase keys

# 3. Apply the database schema (see "Database setup")

# 4. Start the dev server
npm run dev
```

The app runs at http://localhost:5173 by default.

## Environment variables

Create a `.env.local` in the project root:

```ini
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Both values come from **Project Settings → API** in the Supabase dashboard. Only the anon key belongs in the client — never commit the service role key.

## Database setup

1. Create a new Supabase project.
2. Open the **SQL Editor**.
3. Paste the contents of [supabase-schema.sql](supabase-schema.sql) and run it.

This creates all tables, RLS policies, and the triggers that auto-provision profiles on signup and friendship goals on accepted friend requests. Re-running the script on an existing schema is not idempotent — drop the tables first if you need to reset.

For avatar and memory photo uploads, create a public **Storage** bucket named `avatars` (or whatever your code references) from the Supabase dashboard.

## Project structure

```
src/
├── components/      Reusable UI (Calendar, DateCard, ThemeToggle)
├── context/         React context providers (AuthContext, ThemeContext)
├── lib/             Supabase client singleton
├── pages/           Route-level screens
│   ├── Login.tsx
│   ├── Signup.tsx
│   ├── Home.tsx
│   ├── CreateDate.tsx
│   ├── AcceptInvite.tsx
│   ├── Friends.tsx
│   └── Profile.tsx
├── types/           Generated/handwritten DB types (database.ts)
├── App.tsx          Router + providers
└── main.tsx         Entry point
```

## Scripts

| Command           | What it does                                   |
| ----------------- | ---------------------------------------------- |
| `npm run dev`     | Start the Vite dev server with HMR             |
| `npm run build`   | Type-check (`tsc -b`) and produce a prod build |
| `npm run preview` | Serve the built `dist/` locally                |
| `npm run lint`    | Run ESLint across the project                  |

## Conventions

- **TypeScript everywhere.** No `any` in committed code; prefer narrow types and let inference do the work.
- **RLS is the source of truth for authorization.** Client code should never be the only thing preventing a user from reading or writing a row.
- **Tailwind utility-first.** Extract a component only when a pattern genuinely repeats — not preemptively.
- **Context over prop drilling** for auth and theme; everything else is local state.
- **Romantic, encouraging UX.** Copy and visuals should reinforce the core loop: propose → confirm → complete → level up.

## Roadmap

- Push/email notifications when a partner sends or confirms an invite
- Shared photo albums per friendship goal level
- Recurring date suggestions based on past places
- Mobile wrapper (Expo or Capacitor) once the web flow stabilizes

---

Built with care for people who want to keep dating the person they're already with.
