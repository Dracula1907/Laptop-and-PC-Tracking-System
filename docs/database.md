# Database Architecture & Schema - ITAM System

## 1. Database Specifications
- **DBMS**: PostgreSQL 15
- **ORM**: Prisma ORM
- **Primary Keys**: UUID (v4)
- **Constraint Strategy**: Unique indexes, Foreign Key cascade/restrict rules, NOT NULL enforcement, transactional isolation.

## 2. Core Entities Summary
1. `User`: User accounts, bcrypt password hashes, linked role ID & employee ID.
2. `Role`: System roles (`ADMIN`, `MANAGER`, `IT`, `USER`).
3. `Permission`: Fine-grained permission codes.
4. `RolePermission`: Many-to-many junction table connecting roles and permissions.
5. `Employee`: Employee profiles (`employeeCode`, `fullName`, `email`, `departmentId`, `locationId`, `status`).
6. `Department`: Organizational business units (`code`, `name`).
7. `Location`: Physical offices & facilities (`code`, `name`, `address`).
8. `Asset`: Core asset records (`assetCode`, `assetType`, `serialNumber`, `status`, `condition`, `currentHolderId`).
9. `AssetSpecification`: Technical device specifications (`processor`, `ram`, `storage`, `macAddress`, `operatingSystem`).
10. `AssetAssignment`: Workstation assignments (`assetId`, `employeeId`, `assignedBy`, `assignedAt`, `expectedReturnDate`).
11. `AssetTransfer`: Inter-departmental & employee transfer logs (`previousHolderId`, `newHolderId`).
12. `AssetReturn`: Hardware return inspection logs (`conditionAtReturn`, `accessoriesReturned`, `damageReported`).
13. `MaintenanceRecord`: Repair tickets (`issueTitle`, `issueDescription`, `repairStatus`, `technician`, `repairCost`).
14. `MaintenancePart`: Spare replacement parts consumed during servicing.
15. `AssetStatusHistory`: Immutable timeline of all state transitions.
16. `AuditLog`: Immutable system security and operation logs.
17. `Notification`: System alerts for warranty expiry, overdue returns, and pending approvals.
18. `SystemSetting`: Key-value system configuration tokens.

## 3. Database Indexing Strategy
Indexed columns for high-speed server-side filtering & search:
- `Asset`: `assetCode`, `assetType`, `status`, `condition`, `serialNumber`, `currentHolderId`, `departmentId`, `locationId`, `warrantyEnd`.
- `Employee`: `employeeCode`, `email`, `departmentId`, `locationId`.
- `AuditLog`: `userId`, `action`, `entityType`, `createdAt`.
