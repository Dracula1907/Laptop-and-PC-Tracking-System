# Security Architecture - ITAM System

## 1. Authentication & Session Security
- Passwords are strictly stored as salted bcrypt hashes (`bcryptjs` with cost factor 10). Passwords are never logged or returned in API responses.
- Stateless Session Authentication using JSON Web Tokens (JWT) signed with a strong secret.
- Token expiration is enforced (default 8h session window).

## 2. Role-Based Access Control (RBAC)
- Fine-grained permission codes bound to system roles.
- Backend middleware (`requirePermission`, `requireRoles`) independently validates every request against database permissions. Frontend UI hides unauthorized actions for user experience.
- Protection against deactivation of the last remaining active Administrator account.

## 3. Infrastructure & Network Isolation
- PostgreSQL runs exclusively inside the internal Docker bridge network (`itam-network`).
- PostgreSQL port `5432` is NOT exposed to external host networks or public interfaces.
- Express API server is secured behind Nginx reverse proxy with Helmet security headers (`X-Frame-Options`, `X-XSS-Protection`, `X-Content-Type-Options`).

## 4. Input Validation & Data Integrity
- Zod schema validation on all incoming REST API request payloads.
- Prisma transaction wrappers for critical state changes (Assignments, Transfers, Returns, Maintenance completion) ensuring atomic commit or rollback.
- Immutable audit log records capturing action, user, timestamp, target entity, and IP address.
