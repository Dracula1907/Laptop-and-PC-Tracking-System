# REST API Reference Documentation - ITAM System

All API endpoints are prefixed with `/api`. Authenticated endpoints require `Authorization: Bearer <jwt_token>`.

## 1. Authentication Endpoints
- `POST /api/auth/login` — Authenticate username & password, returns JWT token & user profile.
- `GET /api/auth/me` — Retrieve current authenticated session user profile and permissions.

## 2. Health Check Endpoint
- `GET /api/health` — Returns status of API server, PostgreSQL database connection, environment, and version.

## 3. Asset Endpoints
- `GET /api/assets` — Retrieve paginated list of assets with search, status, type, and location filters.
- `GET /api/assets/:id` — Retrieve detailed asset specifications, assignments, transfers, returns, maintenance, and status history.
- `POST /api/assets` — Register new asset (Requires `ASSET_CREATE`).
- `PUT /api/assets/:id` — Update asset specifications (Requires `ASSET_UPDATE`).
- `POST /api/assets/:id/assign` — Assign asset to employee (Requires `ASSIGNMENT_CREATE`).
- `POST /api/assets/:id/transfer` — Transfer asset to new holder/department (Requires `TRANSFER_CREATE`).
- `POST /api/assets/:id/return` — Process asset return and physical condition check (Requires `RETURN_CREATE`).
- `POST /api/assets/:id/maintenance` — Open repair ticket (Requires `MAINTENANCE_CREATE`).

## 4. Employee Endpoints
- `GET /api/employees` — List employees with search & department filters.
- `GET /api/employees/:id` — Get detailed employee profile & assigned hardware.
- `POST /api/employees` — Create employee profile (Requires `EMPLOYEE_CREATE`).
- `PUT /api/employees/:id` — Update employee profile (Requires `EMPLOYEE_UPDATE`).

## 5. Organization Endpoints
- `GET /api/departments` — List departments & linked asset counts.
- `POST /api/departments` — Create department (Requires `DEPARTMENT_MANAGE`).
- `GET /api/locations` — List office locations & linked asset counts.
- `POST /api/locations` — Create location (Requires `LOCATION_MANAGE`).

## 6. Maintenance Endpoints
- `GET /api/maintenance` — List maintenance tickets.
- `GET /api/maintenance/:id` — Get maintenance ticket details & parts log.
- `PUT /api/maintenance/:id` — Update repair status, technician, and cost (Requires `MAINTENANCE_UPDATE`).

## 7. Dashboard & Telemetry
- `GET /api/dashboard/summary` — Aggregate live PostgreSQL metrics.
- `GET /api/dashboard/charts` — Grouped chart counts by type, status, and department.
- `GET /api/dashboard/activity` — Recent activity feed & asset status timeline.
- `GET /api/dashboard/alerts` — Active warranty expiration & overdue return alerts.

## 8. Reports & Audits
- `GET /api/reports/:type` — Fetch report data (inventory, assigned, available, maintenance, transfers, returns, warranty).
- `GET /api/audit-logs` — Query security audit logs (Requires `AUDIT_VIEW`).
- `GET /api/notifications` — Fetch user notifications & unread counts.
- `POST /api/notifications/read-all` — Mark notifications as read.
