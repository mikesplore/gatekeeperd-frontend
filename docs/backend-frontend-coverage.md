# Gatekeeperd frontend coverage plan

This plan keeps the dashboard aligned with the backend. A feature is complete only when its endpoint, UI state, mutation feedback, error state, and verification path are covered.

## 1. Dashboard and operations

| Backend capability | Endpoint | Frontend surface |
|---|---|---|
| Aggregated dashboard state | `GET /api/admin/dashboard/summary` | Dashboard summary cards and health indicators |
| Project counts | Included in summary | Active, blocked, manual-block, overdue counts |
| Payment counts | Included in summary | Provider/status breakdown |
| Revenue | Included in summary and `/api/admin/revenue` | Current month, previous month, monthly chart |
| Runtime metrics | Included in summary | Operations health panel |
| Scribed outbox | Included in summary | Pending, processing, dead-letter, delivered status |
| Outbox inspection | `GET /api/admin/integrations/outbox` | Integration operations page |
| Outbox replay | `POST /api/admin/integrations/outbox/{id}/replay` | Confirmed replay action and result toast |

Dashboard requirements:

- Use the summary endpoint for initial state.
- Preserve detailed widgets as drill-downs.
- Show stale/loading/error states explicitly.
- Highlight dead-letter events and failed integrations.

## 2. Projects and access state

| Capability | Endpoint/s | Frontend surface |
|---|---|---|
| Project list | `/api/admin/projects` | Projects table and filters |
| Project detail | `/api/admin/projects/{slug}` | Project overview page |
| Create/update/archive | Project admin routes | Forms with validation and confirmation |
| Block/unblock | Project status routes | Access controls with reason and audit feedback |
| Deployment/lifecycle state | Project response fields | Separate deployment and access badges |
| Health/readiness | `/api/admin/projects/{slug}/health` | Project health panel |
| Audit history | Project audit routes | Timeline and filtering |

The UI must not collapse deployment state into payment/access state.

## 3. Payments and providers

| Capability | Endpoint/s | Frontend surface |
|---|---|---|
| Payment list/filter | `/api/admin/payments` | Payments page |
| Payment detail/history | Project detail payment routes | Provider, reference, amount, status, verification source |
| Paystack initialization | Project payment route | Generate checkout link |
| M-Pesa initiation | `/api/mpesa/pay` | Provider-aware payment action when enabled |
| Reconciliation state | Payment fields and dashboard summary | Pending/reconciled indicators |
| Failed webhook replay | Operations routes | Replay control and result |
| Revenue report | `/api/admin/revenue` | Revenue chart and totals |

Payment UI must represent Paystack and M-Pesa without assuming Paystack-specific references.

## 4. Scribed invoices and receipts

| Capability | Backend contract | Frontend surface |
|---|---|---|
| Linked invoice | Scribed integration/payment response | Invoice link on project/payment detail |
| Partial payment | Scribed invoice/payment state | Paid, partially paid, remaining balance |
| Per-payment receipt | Scribed receipt URL | Receipt link per payment |
| Integration delivery | Dashboard outbox | Scribed sync status and errors |

Frontend must never expose Scribed bearer tokens or integration secrets.

## 5. Nginx management

| Capability | Endpoint | Frontend surface |
|---|---|---|
| Site status | `/api/admin/nginx/status/{slug}` | Status and SSL panel |
| Live configuration | `/api/admin/nginx/config/{slug}` | Raw config and parsed blocks viewer |
| Diagnostics | `/api/admin/nginx/diagnostics`, `/test` | Full `nginx -t` output |
| Preview block edit | Block preview route | Diff/preview dialog |
| Apply block edit | Block apply route | Confirmation, validation, reload result |
| Drift detection | Config inspection fields | Drift warning with hashes |
| Versions | `/config/{slug}/versions` | Version history |
| Rollback | Rollback route | Confirmed rollback with result |
| Enable/disable/remove | Existing Nginx routes | Destructive confirmation flows |

Nginx editing must show the exact live block before editing and the exact validation output after applying.

## 6. Containers and certificates

- Container list, health, logs, ports, create, start, stop, restart, and removal must retain existing query invalidation and confirmation behavior.
- Nginx wizard must show Docker port inference failures clearly.
- Certificate installation, discovery, expiry, and SSL selection need visible success/error states.

## 7. Shared frontend conventions

- Every query has loading, empty, error, and stale states.
- Every mutation invalidates related TanStack Query keys.
- Every destructive action requires confirmation.
- Backend `{ error, message, timestamp }` responses use shared error helpers.
- Provider, access, lifecycle, deployment, integration, and Nginx states use explicit types.
- No frontend feature reads backend data through a second API client.

## 8. Delivery sequence

1. Dashboard summary and operations health.
2. Project detail state separation and payment/provider coverage.
3. Scribed invoice/receipt links and outbox operations.
4. Nginx inspection, diagnostics, block editing, drift, versions, and rollback.
5. Container/certificate edge cases.
6. End-to-end contract verification against the live backend.

## 9. Completion checklist

- Every backend endpoint is mapped to a screen or deliberate non-UI integration.
- Every response field needed for operations has a visible representation.
- Provider-neutral payment behavior is preserved.
- Scribed secrets remain server-side.
- Nginx failures expose server diagnostics, not generic browser errors.
- Build, lint, and manual endpoint smoke checks pass.
