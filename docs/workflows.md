# Business Workflows & State Transition Engine - ITAM System

## 1. Asset Status Lifecycle Matrix
Valid asset status transitions:
```
               ┌─────────────┐
               │  AVAILABLE  │◄────────────┐
               └──────┬──────┘             │
                      │                    │
           ┌──────────┼──────────┐         │
           ▼          ▼          ▼         │
      ┌─────────┐┌─────────┐┌─────────┐    │
      │ASSIGNED ││RESERVED ││UNDER    │    │
      └────┬────┘└─────────┘│REPAIR   ├────┤
           │                └────┬────┘    │
      ┌────┴────┐                │         │
      ▼         ▼                ▼         │
  ┌───────┐ ┌────────┐      ┌─────────┐    │
  │IN_USE │ │RETURNED├──────┤SCRAPPED │    │
  └───────┘ └───┬────┘      └─────────┘    │
                │                          │
                └──────────────────────────┘
```

- **Terminal States**: `RETIRED` and `SCRAPPED`. Assets in terminal states cannot be assigned, transferred, or put into active use.
- **Under Repair**: Assets under repair cannot be assigned to any employee until maintenance status is marked `COMPLETED`.

## 2. Assignment Workflow
1. IT Staff selects asset (`AST-000001`) and target employee (`EMP-004`).
2. System checks asset status is `AVAILABLE` and target employee status is `ACTIVE`.
3. Database Transaction executes:
   - Create `AssetAssignment` record (`status = ACTIVE`).
   - Update `Asset` record (`status = ASSIGNED`, `currentHolderId = EMP-004`, `departmentId`, `locationId`).
   - Insert `AssetStatusHistory` timeline entry.
   - Insert `AuditLog` entry.
   - Send `Notification` to employee & manager.

## 3. Transfer Workflow
1. IT Staff / Manager requests asset transfer to new holder (`EMP-005`).
2. Database Transaction executes:
   - Create `AssetTransfer` record (`previousHolderId`, `newHolderId`, `transferDate`).
   - Update `Asset` current holder and department/location mapping.
   - Record `AssetStatusHistory` & `AuditLog`.

## 4. Return & Maintenance Workflows
1. Employee or IT Staff submits Return request.
2. IT performs physical condition check (Accessories returned, damage reported).
3. If damaged ➔ Asset status becomes `UNDER_REPAIR` and `MaintenanceRecord` is opened.
4. If clean ➔ Asset status returns to `AVAILABLE` stock.
