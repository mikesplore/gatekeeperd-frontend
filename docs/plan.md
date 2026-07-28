# Gatekeeper Frontend — Implementation Plan (React + Vite + Tailwind + shadcn/ui)

**Purpose of this document:** a build-ready spec for the admin dashboard that consumes the Gatekeeperd API (see `backend-development-plan.md`). Written so an engineer or coding agent can implement each phase directly.

This is an **internal single-admin tool** — no need for multi-tenant complexity, but built cleanly enough to extend later.

---

## 0. Project Setup

### 0.1 Scaffold
```bash
npm create vite@latest gatekeeper-dashboard -- --template react-ts
cd gatekeeper-dashboard
npm install
```

### 0.2 Tailwind + shadcn/ui setup
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npx shadcn@latest init
```
`shadcn init` prompts: TypeScript = yes, style = "New York" (cleaner for dense dashboards), base color = "Slate" or "Zinc", CSS variables = yes.

### 0.3 Core dependencies
```bash
npm install react-router-dom @tanstack/react-query axios zustand
npm install react-hook-form zod @hookform/resolvers
npm install date-fns
npm install lucide-react
npm install recharts        # for payment history / status charts
npm install sonner          # toast notifications (shadcn-recommended)
```

Add shadcn components as needed (pull individually, not all at once):
```bash
npx shadcn@latest add button card table badge dialog dropdown-menu \
  input label select tabs skeleton alert-dialog form textarea \
  separator avatar tooltip sonner
```

### 0.4 Repo structure
```
gatekeeper-dashboard/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── router.tsx
│   ├── lib/
│   │   ├── api.ts                 # axios instance + interceptors
│   │   ├── utils.ts                # shadcn cn() helper etc.
│   │   └── constants.ts
│   ├── types/
│   │   ├── project.ts
│   │   ├── payment.ts
│   │   ├── audit.ts
│   │   └── auth.ts
│   ├── store/
│   │   └── authStore.ts           # zustand: token, user, login/logout
│   ├── hooks/
│   │   ├── useProjects.ts         # react-query hooks
│   │   ├── useProject.ts
│   │   ├── usePayments.ts
│   │   └── useAuditLog.ts
│   ├── features/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── projects/
│   │   │   ├── ProjectsListPage.tsx
│   │   │   ├── ProjectDetailPage.tsx
│   │   │   ├── ProjectFormDialog.tsx      # create/edit
│   │   │   ├── BlockUnblockDialog.tsx
│   │   │   ├── ProjectStatusBadge.tsx
│   │   │   └── ProjectsTable.tsx
│   │   ├── payments/
│   │   │   ├── PaymentsHistoryTable.tsx
│   │   │   └── GeneratePaymentLinkDialog.tsx
│   │   ├── audit/
│   │   │   ├── AuditLogTimeline.tsx
│   │   │   └── GlobalActivityFeed.tsx     # uses GET /api/admin/audit
│   │   ├── containers/
│   │   │   ├── ContainersPage.tsx
│   │   │   ├── ContainersTable.tsx
│   │   │   └── ContainerActionsMenu.tsx   # start/stop/restart
│   │   └── dashboard/
│   │       ├── DashboardOverviewPage.tsx
│   │       └── StatCards.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Topbar.tsx
│   │   └── ui/                    # shadcn-generated, don't hand-edit much
│   ├── App.css
│   └── index.css
├── .env.example
├── tailwind.config.ts
├── vite.config.ts
└── package.json
```

### 0.5 Environment variables
`.env.example`:
```
VITE_API_BASE_URL=https://admin.yourdomain.com/api
```
`vite.config.ts` — add a dev proxy so local dev hits the real backend without CORS pain:
```ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
```

---

## Phase 1: Foundation, Auth, App Shell (Days 1–2)

### 1.1 API client (`lib/api.ts`)
Axios instance with:
- `baseURL` from `VITE_API_BASE_URL`
- Request interceptor: attach `Authorization: Bearer {token}` from `authStore`
- Response interceptor: on `401`, clear auth store and redirect to `/login`

```ts
import axios from "axios";
import { useAuthStore } from "@/store/authStore";

export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
```

**Error shape (matches actual backend):** every error response is `{error: string, message: string, timestamp: string}`. Build a small helper used everywhere a mutation fails:
```ts
export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    return err.response.data.message as string;
  }
  return "Something went wrong. Please try again.";
}
```
Use this in every `onError` handler feeding a `sonner` toast — never show raw axios error text to the user. Notable error codes to handle specifically where it improves UX: `project_not_found` (slug typo or stale link), `docker_unavailable` (show a banner, not a toast, since it affects a whole page), `invalid_credentials` (inline form error, not a toast).

### 1.2 Auth store (`store/authStore.ts`, zustand + persist)
```ts
interface AuthState {
  token: string | null;
  email: string | null;
  login: (token: string, email: string) => void;
  logout: () => void;
}
```
Persist to `localStorage` via zustand's `persist` middleware, key `gatekeeper-auth`.

### 1.3 Login page
`POST /api/auth/login` → `{ email, password }` → `{ token }`. Use `react-hook-form` + `zod` schema (`email` valid, `password` min 1 char — this is a single-admin login, keep validation light). On success: store the token, then immediately call `GET /api/auth/me` to get `{email, role, createdAt}` and populate the auth store from that response (don't just trust the email typed into the login form — `/me` is the source of truth and lets the topbar/session survive a page reload cleanly via a rehydration call, see 1.6).

### 1.4 Protected routing (`router.tsx`)
`react-router-dom` v6, structure:
```
/login                          → LoginPage (public)
/                                → AppShell (ProtectedRoute wrapper)
  ├── index                     → DashboardOverviewPage
  ├── projects                  → ProjectsListPage
  ├── projects/:slug            → ProjectDetailPage
  └── containers                → ContainersPage
```
`ProtectedRoute.tsx`: reads `authStore.token`; if absent, `<Navigate to="/login" />`.

### 1.5 App shell layout
`AppShell.tsx`: fixed left `Sidebar` (nav: Dashboard, Projects, Containers, Logout) + `Topbar` (breadcrumb + admin email from `/api/auth/me` + logout button) + `<Outlet />` content area. Use shadcn `Separator`, `Avatar`, `DropdownMenu` for the topbar user menu.

### 1.6 Session rehydration on load
On app mount (`App.tsx` or a top-level `useEffect`), if a token exists in the persisted zustand store but `email`/`role` aren't populated (e.g. fresh page load), call `GET /api/auth/me` to rehydrate. If that call 401s, the axios interceptor already handles logout + redirect, so no special-casing needed here beyond a brief loading state while it resolves.

### 1.6 Deliverable for Phase 1
- Login works against real backend, protected routes redirect correctly, empty shell renders with sidebar nav.

---

## Phase 2: Projects List & Status Control (Days 3–4)

### 2.1 Types (`types/project.ts`)
```ts
export type ProjectType = "frontend" | "backend";
export type ProjectStatus = "active" | "blocked" | "manual_block";

export interface Project {
  id: string;
  slug: string;
  name: string;
  domain: string;
  containerName: string;
  type: ProjectType;
  status: ProjectStatus;
  clientName?: string;
  clientEmail?: string;
  amountDue?: number;
  currency: string;
  dueDate?: string;      // ISO date
  gracePeriodDays: number;
  createdAt: string;
  updatedAt: string;
}
```
Mirror this pattern for `Payment` and `AuditLogEntry` types matching the backend schema exactly:
```ts
export interface Payment {
  id: string;
  projectId: string;
  paystackReference: string;
  amount: number;
  status: string;
  paidAt?: string;
  rawWebhookPayload?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  projectId?: string;
  action: "blocked" | "unblocked" | "payment_received" | "manual_override" | "project_created" | "project_updated";
  actor: string;            // "system" or admin email
  reason?: string;
  createdAt: string;
}

// GET /api/admin/projects/{slug} response shape — note the nesting, this is NOT a flat Project
export interface ProjectDetailResponse {
  project: Project;
  payments: Payment[];
  audit_log: AuditLogEntry[];
}
```
**Important:** `GET /api/admin/projects` (list) returns a flat `Project[]`, but `GET /api/admin/projects/{slug}` (detail) returns the wrapped `ProjectDetailResponse` shape above — don't reuse the same type for both.

### 2.2 Data hooks (`hooks/useProjects.ts`) — react-query
```ts
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await api.get<Project[]>("/admin/projects")).data,
    refetchInterval: 30_000, // poll every 30s so status changes from webhooks show up without manual refresh
  });
}

export function useBlockProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, reason }: { slug: string; reason: string }) =>
      api.post(`/admin/projects/${slug}/block`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUnblockProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, reason }: { slug: string; reason: string }) =>
      api.post(`/admin/projects/${slug}/unblock`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}
```
Mirror for create/update project mutations.

**Detail hook** (`hooks/useProject.ts`) — hits the nested-response endpoint:
```ts
export function useProjectDetail(slug: string) {
  return useQuery({
    queryKey: ["project", slug],
    queryFn: async () =>
      (await api.get<ProjectDetailResponse>(`/admin/projects/${slug}`)).data,
    enabled: !!slug,
  });
}
```
Destructure `{ project, payments, audit_log }` from `data` at the call site in `ProjectDetailPage` — don't flatten this in the hook, keep it matching the wire shape so it's obvious what came from the API.

**Global audit feed** (`hooks/useAuditLog.ts`):
```ts
export function useGlobalAuditLog(limit = 100) {
  return useQuery({
    queryKey: ["audit", limit],
    queryFn: async () =>
      (await api.get<AuditLogEntry[]>("/admin/audit", { params: { limit } })).data,
    refetchInterval: 30_000,
  });
}
```

**Containers hooks** (`hooks/useContainers.ts`):
```ts
export function useContainers() {
  return useQuery({
    queryKey: ["containers"],
    queryFn: async () => (await api.get<ContainerInfo[]>("/admin/containers")).data,
    refetchInterval: 15_000,
    retry: (failureCount, err) =>
      axios.isAxiosError(err) && err.response?.status === 503 ? false : failureCount < 3,
    // 503 = docker_unavailable — don't hammer retries if the socket is down
  });
}

export function useContainerAction(action: "start" | "stop" | "restart") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post(`/admin/containers/${name}/${action}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["containers"] }),
  });
}
```
`ContainerInfo` type: `{id, name, image, status, state, ports, created}` matching the backend's container list response.

### 2.3 ProjectsListPage
- shadcn `Table` inside `Card`, columns: Name, Domain, Type (Badge), Status (`ProjectStatusBadge`), Client, Due Date, Amount, Actions (dropdown: View, Block, Unblock, Edit)
- Top bar: "New Project" button (opens `ProjectFormDialog` in create mode), search input filtering client-side by name/domain/client
- Status filter tabs (shadcn `Tabs`): All / Active / Blocked / Manual Block
- Loading state: shadcn `Skeleton` rows, not a spinner — feels more native to a data table
- Empty state: simple centered message + "New Project" CTA

### 2.4 ProjectStatusBadge
Color mapping (use Tailwind + shadcn `Badge` variants):
- `active` → green (`variant="default"` with a green override, or custom `bg-emerald-500/15 text-emerald-600`)
- `blocked` → red (`bg-red-500/15 text-red-600`)
- `manual_block` → amber (`bg-amber-500/15 text-amber-600`) — visually distinct from auto-blocked so you can tell at a glance why a project is down

### 2.5 BlockUnblockDialog
shadcn `AlertDialog` (destructive confirm pattern for block; regular `Dialog` is fine for unblock). Requires a `reason` textarea before confirming — matches backend's required `reason` field. On confirm, calls the relevant mutation, shows `sonner` toast on success/failure.

### 2.6 ProjectFormDialog (create/edit)
`react-hook-form` + `zod` schema matching backend fields:
```ts
const projectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "lowercase, numbers, hyphens only"),
  name: z.string().min(1),
  domain: z.string().min(1),
  containerName: z.string().min(1),
  type: z.enum(["frontend", "backend"]),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal("")),
  amountDue: z.coerce.number().nonnegative().optional(),
  dueDate: z.string().optional(),
  gracePeriodDays: z.coerce.number().int().nonnegative().default(3),
});
```
Use shadcn `Form` components (`FormField`, `FormItem`, `FormMessage`) wired to `react-hook-form` via `zodResolver`. Slug field disabled in edit mode (immutable once created, matches backend design where slug is the Traefik-referenced identifier).

### 2.7 Deliverable for Phase 2
- Full CRUD + block/unblock working against live backend, table auto-refreshes, toasts confirm every action.

---

## Phase 3: Project Detail, Payments, Audit Trail (Days 5–6)

### 3.1 ProjectDetailPage (`/projects/:slug`)
Layout: header card (name, domain, status badge, quick block/unblock buttons) → shadcn `Tabs`: **Overview** / **Payments** / **Audit Log**.

- **Overview tab:** client info, amount due, due date, grace period, container name — editable inline or via "Edit" button reopening `ProjectFormDialog`.
- **Payments tab:** `PaymentsHistoryTable` — columns: reference, amount, status, paid_at. Button "Generate Payment Link" → `GeneratePaymentLinkDialog`.
- **Audit Log tab:** `AuditLogTimeline` — vertical timeline (icon per action type using `lucide-react`: block=🔒 `Lock`, unblock=🔓 `Unlock`, payment=💳 `CreditCard`, manual override=`UserCog`), each entry shows actor, reason, timestamp (`date-fns` `formatDistanceToNow`).

### 3.2 GeneratePaymentLinkDialog
Calls the real endpoint: `POST /api/admin/projects/{slug}/payment/initialize`, body `{"email": "..."}` (backend defaults to the project's stored `clientEmail` if omitted, but the dialog should still show an editable email field pre-filled from `project.clientEmail` in case a payment needs to go to a different address for one-off cases). Response: `{"payment_link": "https://paystack.com/pay/abc123"}`.

Dialog shows the resulting URL with a "Copy Link" button (use `navigator.clipboard`) and optionally a "Send via Email" button if you wire that up backend-side later. Don't build email sending in v1 frontend — copy-link is enough. Note this creates a new `pending` payment row server-side each time it's called, so avoid a "generate" button that's trivially double-clickable — disable it while the mutation is in flight.

### 3.3 Deliverable for Phase 3
- Clicking into a project shows full history and lets you generate a fresh payment link without leaving the dashboard.

---

## Phase 4: Dashboard Overview & Polish (Days 7–8)

### 4.1 DashboardOverviewPage (`/`)
**No `/api/admin/stats` endpoint exists on the backend.** Compute everything client-side from data already fetched via `useProjects()`:
- `StatCards` row (shadcn `Card` grid, 4 cols on desktop): Total Projects, Active, Blocked, Manual Block — derive all four via `useMemo` over the `useProjects()` result, don't refetch separately.
- **Revenue this month:** there's no all-projects payments endpoint, only per-project payment history nested in the detail response. For v1, drop the revenue card from the dashboard and show revenue only on each `ProjectDetailPage`'s Payments tab where the data already exists. If a global revenue view matters later, that needs a backend addition (e.g. `GET /api/admin/payments`) — don't build against an endpoint that doesn't exist.
- `recharts` chart: skip for v1 for the same reason.
- "Projects due soon" widget: filter the `useProjects()` result client-side for `status === 'active' && dueDate` within 7 days — no new endpoint needed, links to each project's detail page.
- **Recent activity feed:** use `useGlobalAuditLog(20)` (`GET /api/admin/audit?limit=20`, real endpoint) — a good substitute for a stats view, requires no backend changes.

### 4.2 ContainersPage (`/containers`)
Surfaces the backend's Docker admin endpoints, which weren't in the original sketch but exist and are useful for spot-checking infra without SSHing in:
- `ContainersTable`: name, image, status text, state (`Badge`: running=green, exited=red, unknown=gray), ports
- `ContainerActionsMenu` per row (shadcn `DropdownMenu`): Start / Stop / Restart, each a confirm-then-call via `useContainerAction`. Stop should use an `AlertDialog` confirm since stopping the wrong container is a bigger mistake than blocking the wrong project.
- If `useContainers()` errors with `docker_unavailable` (503), render a page-level `Alert` ("Docker socket unreachable — container management is temporarily unavailable") instead of an empty table or a toast — this is infra-down, not a normal empty state.
- This page is **read/operate only** — no "create container" or "deploy project" flow. Provisioning still happens manually per the backend plan's onboarding runbook; registering a project in Gatekeeper (via `ProjectFormDialog`) is a separate step from the container existing.
- Optional, not required for v1: a "Pull Image" dialog (`image`/`tag` fields → `POST /api/admin/images/pull`) for updating a client project's image before a redeploy.

### 4.3 Global polish
- Responsive: sidebar collapses to icon-only or a sheet/drawer on mobile (shadcn `Sheet`) — this is an admin tool you might check from your phone
- Dark mode: shadcn's CSS-variable theming supports this near-free; add a theme toggle in the topbar (`next-themes` pattern adapted for Vite, or simple manual `class` toggle on `html`)
- Consistent loading/error states: a shared `<QueryState>` wrapper component that takes react-query's `isLoading`/`isError`/`data` and renders `Skeleton`/`Alert`/children consistently across pages, so you're not rewriting the same three branches everywhere
- 404 page for unknown routes

### 4.3 Deliverable for Phase 4
- Dashboard gives an at-a-glance operational view; app is usable comfortably on mobile for quick checks/blocks while away from your desk.

---

## 5. State Management Summary
- **Server state:** react-query exclusively (projects, payments, audit log, stats) — don't duplicate this in zustand
- **Client/UI state:** zustand only for auth token + any cross-page UI state (e.g. sidebar collapsed toggle)
- **Form state:** react-hook-form, local to each form component — never lifted to global state

## 6. API Contract Alignment
This plan is now written directly against the actual `Gatekeeperd — API Documentation`, not the earlier assumed contract. Endpoints actually used:
- `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/gate/check` (reference only — this is Traefik's endpoint, the dashboard doesn't call it)
- `GET /api/admin/projects`, `GET /api/admin/projects/{slug}` (nested `{project, payments, audit_log}`), `POST /api/admin/projects`, `PATCH /api/admin/projects/{slug}`
- `POST /api/admin/projects/{slug}/block`, `POST /api/admin/projects/{slug}/unblock`
- `POST /api/admin/projects/{slug}/payment/initialize`
- `GET /api/admin/projects/{slug}/audit`, `GET /api/admin/audit`
- `GET /api/admin/containers`, `GET /api/admin/containers/{name}`, `POST /api/admin/containers/{name}/start|stop|restart`, `GET /api/admin/containers/{name}/health`, `GET /api/admin/networks`, `POST /api/admin/images/pull`

**Not used because they don't exist:** any `/api/admin/stats` or all-projects `/api/admin/payments` endpoint. See §4.1 for the workaround.

**Errors:** all failures return `{error, message, timestamp}` — use `getApiErrorMessage()` (§1.1) everywhere.

## 7. Testing Checklist
- [ ] Login/logout flow, token persists across page reload, expired token redirects to `/login`
- [ ] Creating a project with a duplicate slug shows backend's validation error clearly (not a raw axios error)
- [ ] Block requires a reason before the confirm button is enabled
- [ ] Table reflects a status change (e.g. from a Paystack webhook firing elsewhere) within the 30s poll window without manual refresh
- [ ] All dialogs trap focus and close on `Esc` (shadcn defaults — verify not broken by custom wrapping)
- [ ] Mobile viewport: sidebar, tables, and dialogs all remain usable at 375px width
- [ ] Dark mode doesn't break status badge color contrast
- [ ] Project detail page correctly destructures the nested `{project, payments, audit_log}` response — not treated as a flat project
- [ ] Generating a payment link twice creates two distinct pending payment rows visible in the Payments tab (confirms no accidental client-side caching of a "generate" result)
- [ ] Containers page shows a clear infra-down banner (not a blank table) when Docker is unreachable
- [ ] Every toast shown on a failed mutation shows the backend's actual `message`, not a generic axios error

## 8. Explicitly Out of Scope for v1
- Multi-admin accounts / permissions UI (backend is single-admin for v1 too)
- In-app email sending for payment links (copy-link only)
- Real-time updates via WebSocket (30s polling is sufficient at this scale; revisit if project count grows large)
- i18n / multi-language support
- Global revenue dashboard / charts (no backend data source yet — see §4.1)
- "Deploy container" or "provision project" flows from the UI (registration only; deployment stays a manual DevOps step per the backend's onboarding runbook)