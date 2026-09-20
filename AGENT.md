# Gatekeeperd Frontend Agent Guide

@/home/mike/.codex/RTK.md

## Purpose

This repository is the React + TypeScript admin dashboard for the Gatekeeperd API. It manages projects, payments, Docker containers, audit activity, authentication, and nginx site/SSL configuration.

## Stack and commands

- React 19 with TypeScript, Vite, Tailwind CSS 4, and Radix/shadcn-style UI components.
- React Router 7, TanStack Query 5, Axios, Zustand, React Hook Form/Zod, Sonner, and Lucide.
- Use `npm run dev` for local development, `npm run build` for the required type-check plus production build, `npm run lint` for ESLint, and `npm run preview` to preview `dist/`.
- The Vite dev server proxies `/api` to `http://localhost:8080`.
- The API base URL is `VITE_API_BASE_URL`; it defaults to `/api` when unset. Keep secrets and environment-specific values out of source control.

## Application shape

- Entry point: `src/main.tsx`; routing: `src/router.tsx`.
- `/` is the public landing page and `/login` is public. `/app/*` is protected by `ProtectedRoute` and rendered inside `AppShell`.
- Feature code lives under `src/features/` (auth, dashboard, projects, payments, containers, audit, nginx). Shared UI primitives are under `src/components/ui/`.
- Shared API access belongs in `src/lib/api.ts`; shared class merging uses `src/lib/utils.ts` (`cn`).
- Server state belongs in TanStack Query hooks under `src/hooks/`; auth and theme persistence belong in Zustand stores under `src/store/`.
- Use the `@/*` alias for imports from `src`.

## API and state conventions

- Use the configured `api` Axios instance, not a separate client. It injects the persisted bearer token and redirects to `/login` after a 401.
- Backend errors have `{ error, message, timestamp }`. Use `getApiErrorMessage`, `getApiErrorCode`, and `isDockerUnavailable` from `src/lib/api.ts`; do not expose raw Axios errors in UI notifications.
- Mutations should invalidate or remove affected query keys in `onSuccess`. Existing key families include `projects`, `project/:slug`, `payments`, `containers`, `nginx`, `audit`, and `revenue`.
- Preserve polling behavior unless there is a deliberate product reason to change it: projects and global audit refresh about every 30 seconds, containers every 15 seconds, and overdue projects every 60 seconds.
- Auth is persisted under `gatekeeper-auth`; theme is persisted under `gatekeeper-theme`. Login obtains the token and then `/auth/me` supplies the authoritative email and role.
- Keep API response types in `src/types/` and match backend response shapes exactly. Project list responses are flat `Project[]`, while project detail responses are wrapped in `ProjectDetailResponse` with `project`, `payments`, and `audit_log`.

## UI and implementation guidance

- Follow the existing feature-based organization and reuse the local Radix/shadcn-style primitives rather than adding another component system.
- Keep loading, empty, and error states consistent with `QueryState`.
- Use confirmation dialogs for destructive project/container/nginx operations and Sonner for mutation feedback. Treat Docker-unavailable errors as a page-level condition where appropriate.
- Preserve responsive behavior and the existing light/dark theme support.
- Avoid editing generated build output in `dist/` or dependency files under `node_modules/`.
- When changing API behavior, inspect the corresponding backend contract and update the relevant `src/types/` and hooks together.

## Verification

After implementation, run at least `npm run build`; run `npm run lint` when lint-relevant files changed. Do not run `npm audit fix` automatically because it can rewrite dependency versions and the lockfile beyond the task scope.

## Known repository notes

- `INDEX.md` and `docs/plan.md` describe the intended architecture but may lag the current implementation; verify current behavior in `src/` first.
- `vercel.json` rewrites all routes to `index.html` for client-side routing.
