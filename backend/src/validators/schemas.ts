import { z } from 'zod';
import {
  AssetType,
  AssetStatus,
  AssetCondition,
  EmployeeStatus,
  WorkflowStatus,
  MaintenanceStatus,
  AllocationStatus,
  WarrantyType,
  CoverageStatus,
  ClaimStatus,
} from '@prisma/client';

export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const AssetCreateSchema = z.object({
  companyAssetId: z.string().optional(),
  assetName: z.string().optional(),
  assetDescription: z.string().optional(),
  assetType: z.nativeEnum(AssetType).optional().default(AssetType.LAPTOP),
  sourceAssetType: z.string().optional(),
  sourceAssetStatus: z.string().optional(),
  sourceAllocationStatus: z.string().optional(),
  allocationStatus: z.nativeEnum(AllocationStatus).optional().default(AllocationStatus.NOT_ALLOCATED),
  criticality: z.string().optional(),
  location: z.string().optional(),
  employeeNameSource: z.string().optional(),
  currentHolderId: z.string().optional().nullable(),
  lanIp: z.string().optional(),
  ram: z.string().optional(),
  cpu: z.string().optional(),
  lanMacAddress: z.string().optional(),
  dateOfAllocation: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  dateOfDeallocation: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),

  assetNumber: z.string().optional(),
  laptopNumber: z.string().optional(),
  pcNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional().default('Dell'),
  model: z.string().optional().default('Dell 5440'),
  status: z.nativeEnum(AssetStatus).optional().default(AssetStatus.AVAILABLE),
  condition: z.nativeEnum(AssetCondition).optional().default(AssetCondition.GOOD),
  departmentId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  purchaseCost: z.number().optional().nullable(),
  vendor: z.string().optional().nullable(),
  warrantyStart: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  warrantyEnd: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  notes: z.string().optional().nullable(),

  // Specifications
  specifications: z
    .object({
      processor: z.string().optional().nullable(),
      ram: z.string().optional().nullable(),
      storage: z.string().optional().nullable(),
      storageType: z.string().optional().nullable(),
      gpu: z.string().optional().nullable(),
      displaySize: z.string().optional().nullable(),
      monitor: z.string().optional().nullable(),
      keyboard: z.string().optional().nullable(),
      mouse: z.string().optional().nullable(),
      chargerAdapter: z.string().optional().nullable(),
      otherHardware: z.string().optional().nullable(),
      operatingSystem: z.string().optional().nullable(),
      operatingSystemVersion: z.string().optional().nullable(),
      macAddress: z.string().optional().nullable(),
      ipAddress: z.string().optional().nullable(),
      batteryHealth: z.string().optional().nullable(),
      additionalSpecifications: z.string().optional().nullable(),
    })
    .optional(),
});

export const AssetUpdateSchema = AssetCreateSchema.partial();

export const AssetHardwareUpdateSchema = z.object({
  cpu: z.string().optional().nullable(),
  ram: z.string().optional().nullable(),
  storage: z.string().optional().nullable(),
  monitor: z.string().optional().nullable(),
  keyboard: z.string().optional().nullable(),
  mouse: z.string().optional().nullable(),
  chargerAdapter: z.string().optional().nullable(),
  otherHardware: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
});

export const AssetAssignmentSchema = z.object({
  assetId: z.string().optional(),
  employeeId: z.string().min(1, 'Employee is required'),
  departmentId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  assignedAt: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  expectedReturnDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  conditionAtAssignment: z.nativeEnum(AssetCondition).default(AssetCondition.GOOD),
  reason: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  approvedById: z.string().optional().nullable(),
});

export const AssetAssignmentUpdateSchema = z.object({
  departmentId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  expectedReturnDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  conditionAtAssignment: z.nativeEnum(AssetCondition).optional(),
  reason: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  approvedById: z.string().optional().nullable(),
});

export const AssetAssignmentCancelSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required'),
});

export const AssetTransferSchema = z.object({
  assetId: z.string().min(1, 'Asset selection is required'),
  newHolderId: z.string().optional().nullable(),
  newDepartmentId: z.string().optional().nullable(),
  newLocationId: z.string().optional().nullable(),
  transferDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  effectiveDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  conditionBefore: z.nativeEnum(AssetCondition).optional().nullable(),
  conditionAfter: z.nativeEnum(AssetCondition).optional().nullable(),
  reason: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  status: z.nativeEnum(WorkflowStatus).optional().default(WorkflowStatus.COMPLETED),
  approvedById: z.string().optional().nullable(),
  expectedSourceState: z.object({
    holderId: z.string().optional().nullable(),
    departmentId: z.string().optional().nullable(),
    locationId: z.string().optional().nullable(),
  }).optional(),
});

export const AssetTransferUpdateSchema = z.object({
  newHolderId: z.string().optional().nullable(),
  newDepartmentId: z.string().optional().nullable(),
  newLocationId: z.string().optional().nullable(),
  effectiveDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  conditionAfter: z.nativeEnum(AssetCondition).optional().nullable(),
  reason: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  approvedById: z.string().optional().nullable(),
});

export const AssetTransferCancelSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required'),
});

export const AssetTransferReverseSchema = z.object({
  reason: z.string().min(1, 'Reversal reason is required'),
});

export const AssetReturnSchema = z.object({
  assetId: z.string().min(1, 'Asset selection is required'),
  assignmentId: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  returnDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  returnReason: z.string().optional().nullable(),
  conditionAtReturn: z.nativeEnum(AssetCondition).optional().default(AssetCondition.GOOD),
  accessoriesReturned: z.boolean().optional().default(true),
  damageReported: z.boolean().optional().default(false),
  damageCategory: z.string().optional().nullable(),
  damageDescription: z.string().optional().nullable(),
  missingAccessories: z.string().optional().nullable(),
  accessoriesChecklist: z.record(z.string()).optional().nullable(),
  dataWipeStatus: z.string().optional().default('NOT_REQUIRED'),
  inspectionRequired: z.boolean().optional().default(true),
  inspectionResult: z.string().optional().nullable(),
  maintenanceRequired: z.boolean().optional().default(false),
  disposition: z.string().optional().nullable(),
  approvedById: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  status: z.nativeEnum(WorkflowStatus).optional().default(WorkflowStatus.COMPLETED),
  expectedSourceState: z.object({
    holderId: z.string().optional().nullable(),
    departmentId: z.string().optional().nullable(),
    locationId: z.string().optional().nullable(),
  }).optional(),
});

export const AssetReturnReceiveSchema = z.object({
  locationId: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export const AssetReturnInspectSchema = z.object({
  conditionAtReturn: z.nativeEnum(AssetCondition).optional(),
  inspectionResult: z.string().min(1, 'Inspection result is required'),
  damageReported: z.boolean().optional(),
  damageCategory: z.string().optional().nullable(),
  damageDescription: z.string().optional().nullable(),
  accessoriesChecklist: z.record(z.string()).optional().nullable(),
  missingAccessories: z.string().optional().nullable(),
  dataWipeStatus: z.string().optional().nullable(),
  maintenanceRequired: z.boolean().optional(),
  disposition: z.string().optional().nullable(),
  inspectionRemarks: z.string().optional().nullable(),
});

export const AssetReturnCompleteSchema = z.object({
  disposition: z.string().optional().default('AVAILABLE'),
  maintenanceRequired: z.boolean().optional(),
  locationId: z.string().optional().nullable(),
  conditionAtReturn: z.nativeEnum(AssetCondition).optional(),
  remarks: z.string().optional().nullable(),
  approvedById: z.string().optional().nullable(),
});

export const AssetReturnCancelSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required'),
});

export const AssetReturnUpdateSchema = z.object({
  returnReason: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  conditionAtReturn: z.nativeEnum(AssetCondition).optional().nullable(),
  damageReported: z.boolean().optional(),
  damageCategory: z.string().optional().nullable(),
  damageDescription: z.string().optional().nullable(),
  missingAccessories: z.string().optional().nullable(),
  accessoriesChecklist: z.record(z.string()).optional().nullable(),
  dataWipeStatus: z.string().optional().nullable(),
  inspectionRequired: z.boolean().optional(),
  inspectionResult: z.string().optional().nullable(),
  maintenanceRequired: z.boolean().optional(),
  disposition: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  approvedById: z.string().optional().nullable(),
});

export const MaintenanceCreateSchema = z.object({
  assetId: z.string().min(1, 'Asset ID is required'),
  issueTitle: z.string().min(1, 'Issue title is required'),
  issueDescription: z.string().min(1, 'Issue description is required'),
  maintenanceType: z.string().optional().default('CORRECTIVE'),
  priority: z.string().optional().default('MEDIUM'),
  technician: z.string().optional().nullable(),
  technicianId: z.string().optional().nullable(),
  serviceProvider: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  reportedAt: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  repairStartDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  expectedCompletionDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  underWarranty: z.boolean().optional().default(false),
  warrantyProvider: z.string().optional().nullable(),
  warrantyReference: z.string().optional().nullable(),
  warrantyClaimNumber: z.string().optional().nullable(),
  warrantyExpiry: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  warrantyCoverage: z.string().optional().default('NOT_COVERED'),
  conditionBefore: z.nativeEnum(AssetCondition).optional().default(AssetCondition.GOOD),
  laborCost: z.number().optional().nullable(),
  partsCost: z.number().optional().nullable(),
  serviceCost: z.number().optional().nullable(),
  otherCost: z.number().optional().nullable(),
  repairCost: z.number().optional().nullable(),
  repairStatus: z.nativeEnum(MaintenanceStatus).optional().default(MaintenanceStatus.OPEN),
  remarks: z.string().optional().nullable(),
  expectedSourceState: z
    .object({
      holderId: z.string().optional().nullable(),
      departmentId: z.string().optional().nullable(),
      locationId: z.string().optional().nullable(),
      status: z.string().optional().nullable(),
    })
    .optional(),
});

export const MaintenanceAssignSchema = z.object({
  technician: z.string().optional().nullable(),
  technicianId: z.string().optional().nullable(),
  serviceProvider: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  assignedAt: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  repairStartDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  expectedCompletionDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  remarks: z.string().optional().nullable(),
});

export const MaintenanceDiagnosticSchema = z.object({
  diagnosis: z.string().min(1, 'Diagnosis is required'),
  rootCause: z.string().optional().nullable(),
  recommendedAction: z.string().optional().nullable(),
  priority: z.string().optional(),
  conditionBefore: z.nativeEnum(AssetCondition).optional(),
  remarks: z.string().optional().nullable(),
});

export const MaintenanceRepairSchema = z.object({
  repairAction: z.string().min(1, 'Repair action is required'),
  partsReplaced: z.string().optional().nullable(),
  parts: z
    .array(
      z.object({
        partName: z.string().min(1),
        quantity: z.number().min(1).default(1),
        cost: z.number().default(0),
        remarks: z.string().optional(),
      })
    )
    .optional(),
  laborCost: z.number().optional().nullable(),
  partsCost: z.number().optional().nullable(),
  serviceCost: z.number().optional().nullable(),
  otherCost: z.number().optional().nullable(),
  repairCost: z.number().optional().nullable(),
  repairStatus: z.nativeEnum(MaintenanceStatus).optional(),
  remarks: z.string().optional().nullable(),
});

export const MaintenanceCompleteSchema = z.object({
  resolution: z.string().min(1, 'Resolution is required'),
  conditionAfter: z.nativeEnum(AssetCondition).default(AssetCondition.GOOD),
  finalDisposition: z.string().default('AVAILABLE'),
  repairEndDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  laborCost: z.number().optional().nullable(),
  partsCost: z.number().optional().nullable(),
  serviceCost: z.number().optional().nullable(),
  otherCost: z.number().optional().nullable(),
  repairCost: z.number().optional().nullable(),
  approvedById: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export const MaintenanceCancelSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required'),
});

export const MaintenanceUpdateSchema = z.object({
  repairStatus: z.nativeEnum(MaintenanceStatus).optional(),
  issueTitle: z.string().optional(),
  issueDescription: z.string().optional(),
  maintenanceType: z.string().optional(),
  priority: z.string().optional(),
  technician: z.string().optional().nullable(),
  technicianId: z.string().optional().nullable(),
  serviceProvider: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  repairStartDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  expectedCompletionDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  repairEndDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  diagnosis: z.string().optional().nullable(),
  rootCause: z.string().optional().nullable(),
  recommendedAction: z.string().optional().nullable(),
  repairAction: z.string().optional().nullable(),
  partsReplaced: z.string().optional().nullable(),
  laborCost: z.number().optional().nullable(),
  partsCost: z.number().optional().nullable(),
  serviceCost: z.number().optional().nullable(),
  otherCost: z.number().optional().nullable(),
  repairCost: z.number().optional().nullable(),
  underWarranty: z.boolean().optional(),
  warrantyProvider: z.string().optional().nullable(),
  warrantyReference: z.string().optional().nullable(),
  warrantyClaimNumber: z.string().optional().nullable(),
  warrantyExpiry: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  warrantyCoverage: z.string().optional().nullable(),
  conditionBefore: z.nativeEnum(AssetCondition).optional().nullable(),
  conditionAfter: z.nativeEnum(AssetCondition).optional().nullable(),
  resolution: z.string().optional().nullable(),
  finalDisposition: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  approvedById: z.string().optional().nullable(),
  parts: z
    .array(
      z.object({
        partName: z.string().min(1),
        quantity: z.number().min(1).default(1),
        cost: z.number().default(0),
        remarks: z.string().optional(),
      })
    )
    .optional(),
});

export const EmployeeSchema = z.object({
  employeeCode: z.string().optional(),
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  departmentId: z.string().min(1, 'Department is required'),
  locationId: z.string().min(1, 'Location is required'),
  joiningDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  exitDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  status: z.nativeEnum(EmployeeStatus).default(EmployeeStatus.ACTIVE),
  managerId: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export const DepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
  code: z.string().min(1, 'Department code is required'),
  description: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const LocationSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  code: z.string().min(1, 'Location code is required'),
  address: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  building: z.string().optional().nullable(),
  floor: z.string().optional().nullable(),
  roomZone: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const UserCreateSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  employeeId: z.string().optional(),
  roleId: z.string().min(1, 'Role is required'),
});

export const UserUpdateSchema = z.object({
  roleId: z.string().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export const ApprovalDecisionSchema = z.object({
  comment: z.string().optional(),
});

export const ApprovalRejectionSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required'),
  comment: z.string().optional(),
});

export const ApprovalRequestChangesSchema = z.object({
  changesRequested: z.string().min(1, 'Requested changes description is required'),
  comment: z.string().optional(),
});

export const ApprovalResubmitSchema = z.object({
  proposedChanges: z.any().optional(),
  remarks: z.string().optional(),
});

export const ApprovalCancellationSchema = z.object({
  cancellationReason: z.string().min(1, 'Cancellation reason is required'),
});

export const ApprovalPolicyUpdateSchema = z.object({
  requiresApproval: z.boolean(),
  approverRole: z.string().optional(),
  allowSelfApproval: z.boolean().optional(),
  autoExpireDays: z.number().nullable().optional(),
  description: z.string().optional(),
});

export const WarrantyCreateSchema = z.object({
  assetId: z.string().min(1, 'Asset is required'),
  warrantyType: z.nativeEnum(WarrantyType).default(WarrantyType.STANDARD),
  provider: z.string().min(1, 'Provider is required'),
  policyNumber: z.string().optional().nullable(),
  coverageDescription: z.string().optional().nullable(),
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)),
  claimContact: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal('')),
  contactPhone: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable().transform((s) => (s ? new Date(s) : null)),
  purchaseReference: z.string().optional().nullable(),
  warrantyCost: z.number().nonnegative().optional().nullable(),
  coverageNotes: z.string().optional().nullable(),
  attachmentRef: z.string().optional().nullable(),
});

export const WarrantyUpdateSchema = z.object({
  warrantyType: z.nativeEnum(WarrantyType).optional(),
  provider: z.string().optional(),
  policyNumber: z.string().optional().nullable(),
  coverageDescription: z.string().optional().nullable(),
  startDate: z.string().optional().transform((s) => (s ? new Date(s) : undefined)),
  endDate: z.string().optional().transform((s) => (s ? new Date(s) : undefined)),
  claimContact: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal('')),
  contactPhone: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable().transform((s) => (s ? new Date(s) : null)),
  purchaseReference: z.string().optional().nullable(),
  warrantyCost: z.number().nonnegative().optional().nullable(),
  coverageNotes: z.string().optional().nullable(),
  attachmentRef: z.string().optional().nullable(),
});

export const WarrantyExtendSchema = z.object({
  newEndDate: z.string().transform((s) => new Date(s)),
  extensionReason: z.string().min(1, 'Extension reason is required'),
  provider: z.string().optional().nullable(),
  warrantyCost: z.number().nonnegative().optional().nullable(),
  policyNumber: z.string().optional().nullable(),
});

export const WarrantyCancelSchema = z.object({
  cancellationReason: z.string().min(1, 'Cancellation reason is required'),
});

export const WarrantyClaimCreateSchema = z.object({
  warrantyId: z.string().min(1, 'Warranty is required'),
  assetId: z.string().min(1, 'Asset is required'),
  claimDate: z.string().optional().nullable().transform((s) => (s ? new Date(s) : new Date())),
  issue: z.string().min(1, 'Issue description is required'),
  description: z.string().min(1, 'Detailed description is required'),
  provider: z.string().min(1, 'Provider is required'),
  claimCost: z.number().nonnegative().optional().nullable(),
  warrantyCovered: z.boolean().default(true),
  coveredAmount: z.number().nonnegative().optional().nullable(),
  outOfPocketAmount: z.number().nonnegative().optional().nullable(),
  maintenanceId: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export const WarrantyClaimUpdateSchema = z.object({
  status: z.nativeEnum(ClaimStatus).optional(),
  serviceDate: z.string().optional().nullable().transform((s) => (s ? new Date(s) : null)),
  resolvedDate: z.string().optional().nullable().transform((s) => (s ? new Date(s) : null)),
  resolution: z.string().optional().nullable(),
  claimCost: z.number().nonnegative().optional().nullable(),
  coveredAmount: z.number().nonnegative().optional().nullable(),
  outOfPocketAmount: z.number().nonnegative().optional().nullable(),
  remarks: z.string().optional().nullable(),
});


