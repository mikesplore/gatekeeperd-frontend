# Gatekeeperd Frontend

## Overview

This is the React + TypeScript frontend for Gatekeeperd, a container gating and payment management system. It provides an admin dashboard for managing client projects, monitoring payments, controlling access, and managing nginx site configurations.

## Tech Stack

- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Routing:** React Router v6
- **State Management:** Zustand (auth + theme)
- **Data Fetching:** TanStack Query v5
- **UI Components:** shadcn/ui (Radix UI primitives + Tailwind CSS)
- **Icons:** Lucide React

## Project Structure

```
├── index.html                 # Vite entry point
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite configuration
├── vercel.json                # Deployment configuration
│
├── docs/
│   └── plan.md                # Project planning document
│
├── src/
│   ├── main.tsx               # React application entry
│   ├── App.tsx (via router)   # Root route component
│   ├── index.css              # Global styles and Tailwind directives
│   ├── vite-env.d.ts          # Vite type declarations
│   │
│   ├── router.tsx             # Route definitions
│   │
│   ├── lib/
│   │   ├── api.ts             # Axios instance, interceptors, error helpers
│   │   └── utils.ts           # Shared utilities (cn helper, etc.)
│   │
│   ├── store/
│   │   ├── authStore.ts       # Authentication state (Zustand)
│   │   └── themeStore.ts      # Theme/dark mode state (Zustand)
│   │
│   ├── hooks/
│   │   ├── useAuth.ts         # Authentication hooks
│   │   ├── useProjects.ts     # Project-related queries/mutations
│   │   ├── usePayments.ts     # Payment-related queries/mutations
│   │   └── useNginx.ts        # Nginx management queries/mutations
│   │
│   ├── types/
│   │   ├── auth.ts            # Auth type definitions
│   │   ├── audit.ts           # Audit log type definitions
│   │   ├── container.ts       # Docker container type definitions
│   │   ├── payment.ts         # Payment type definitions
│   │   ├── project.ts         # Project type definitions
│   │   └── nginx.ts           # Nginx status/config type definitions
│   │
│   ├── components/
│   │   ├── QueryState.tsx     # Generic loading/error/success state wrapper
│   │   ├── layout/
│   │   │   └── AppShell.tsx   # Main app layout with sidebar navigation
│   │   └── ui/                 # shadcn/ui components
│   │       ├── alert-dialog.tsx
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── skeleton.tsx
│   │       ├── table.tsx
│   │       └── tabs.tsx
│   │
│   └── features/
│       ├── NotFoundPage.tsx            # 404 page
│       │
│       ├── auth/
│       │   ├── LoginPage.tsx           # Login form
│       │   └── ProtectedRoute.tsx      # Auth guard for protected routes
│       │
│       ├── landing/
│       │   └── LandingPage.tsx         # Public landing page
│       │
│       ├── dashboard/
│       │   ├── DashboardOverviewPage.tsx
│       │   └── DashboardWidgets.tsx
│       │
│       ├── projects/
│       │   ├── ProjectsListPage.tsx           # Project list with filters
│       │   ├── ProjectsTable.tsx              # Desktop/mobile table
│       │   ├── ProjectDetailPage.tsx          # Single project view
│       │   ├── ProjectFormDialog.tsx          # Create/edit dialog
│       │   ├── ProjectStatusBadge.tsx         # Status badge component
│       │   ├── BlockUnblockDialog.tsx         # Block/unblock confirmation
│       │   └── DeleteProjectDialog.tsx        # Archive confirmation
│       │
│       ├── payments/
│       │   ├── PaymentsPage.tsx               # Payments list
│       │   ├── PaymentsTable.tsx              # Payments table
│       │   ├── PaymentsHistoryTable.tsx       # Project payment history
│       │   ├── PaymentStatusBadge.tsx         # Payment status badge
│       │   ├── GeneratePaymentLinkDialog.tsx  # Payment link generator
│       │
│       ├── containers/
│       │   ├── ContainersPage.tsx             # Docker containers list
│       │   ├── ContainersTable.tsx            # Container table with actions
│       │   └── CreateContainerDialog.tsx      # Create container dialog
│       │
│       ├── audit/
│       │   ├── AuditLogTimeline.tsx           # Timeline component
│       │   └── GlobalActivityFeed.tsx         # Activity feed widget
│       │
│       └── nginx/
│           ├── NginxPage.tsx                  # Nginx management page
│           └── index.ts                       # Barrel export
│
└── images/                            # Static SVG illustrations
```

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `LandingPage` | Public landing page |
| `/login` | `LoginPage` | Admin login |
| `/app` | `DashboardOverviewPage` | Admin dashboard |
| `/app/projects` | `ProjectsListPage` | List all projects |
| `/app/projects/:slug` | `ProjectDetailPage` | Project details, payments, audit log |
| `/app/payments` | `PaymentsPage` | All payments across projects |
| `/app/containers` | `ContainersPage` | Docker containers management |
| `/app/nginx` | `NginxPage` | Nginx site and SSL management |
| `/app/*` | `NotFoundPage` | 404 for unknown admin routes |

## API Integration

All API calls go through `src/lib/api.ts`, which provides:
- Base URL configuration via `VITE_API_BASE_URL`
- Automatic JWT injection via Axios request interceptor
- 401 handling with automatic logout and redirect
- Uniform error shape: `{ error, message, timestamp }`
- Helper functions: `isApiError`, `getApiErrorBody`, `getApiErrorMessage`, `isDockerUnavailable`

## Authentication

- JWT tokens stored in Zustand `authStore`
- Token attached to all admin API calls via interceptor
- Protected routes use `ProtectedRoute` wrapper
- Token expiration: 24 hours
- 401 responses trigger automatic logout

## State Management

### authStore (`src/store/authStore.ts`)
- `token`: string | null
- `email`: string | null
- `isAuthenticated`: boolean
- `login(token, email)`
- `logout()`

### themeStore (`src/store/themeStore.ts`)
- `dark`: boolean
- `toggleTheme()`

## Data Fetching Strategy

- TanStack Query v5 for all server state
- Queries refetch on interval where appropriate (projects: 30s, containers: 15s)
- Optimistic updates via mutation `onSuccess` cache invalidation
- `QueryState` wrapper component for consistent loading/error UI

## Container Management

The `/app/containers` page provides:
- **List containers:** View all Docker containers with status, state, and port mappings
- **Create container:** Create and start a new container with:
  - Name and image specification
  - Port mappings (host → container)
  - Environment variables
  - Network selection
  - Volume mounts
  - Restart policy
  - Image pull option
- **Container actions:** Start, stop, restart, and delete containers
- **Delete confirmation:** Alert dialog for destructive container deletion

## Nginx Management

The `/app/nginx` page provides:
- **Status check:** View if a project has nginx enabled, domain, port, config paths, SSL status
- **Enable site:** Generate nginx config with optional SSL, validate app port, reload nginx
- **Disable site:** Unlink from sites-enabled without removing config
- **Remove site:** Remove config and symlink completely
- **SSL certificate management:** Install/remove/view Let's Encrypt certificates via certbot

All nginx operations require the backend to have nginx CLI and systemctl access.

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create a `.env` file:
```
VITE_API_BASE_URL=http://localhost:8080/api
```

## Deployment

The app is configured for Vercel deployment via `vercel.json`. Build output goes to `dist/`.

## Related Documentation

- Backend API docs: `/home/mike/IdeaProjects/gatekeeperd/docs/API.md`
- Backend implementation: `/home/mike/IdeaProjects/gatekeeperd/`
- Nginx client gating example: `/home/mike/IdeaProjects/gatekeeperd/docs/nginx-client-gating.md`