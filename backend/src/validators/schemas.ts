import { z } from 'zod';
import { AssetType, AssetStatus, AssetCondition, EmployeeStatus, WorkflowStatus, MaintenanceStatus, AllocationStatus } from '@prisma/client';

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
  employeeId: z.string().min(1, 'Employee is required'),
  expectedReturnDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  conditionAtAssignment: z.nativeEnum(AssetCondition).default(AssetCondition.GOOD),
  remarks: z.string().optional(),
});

export const AssetTransferSchema = z.object({
  assetId: z.string().optional(),
  newHolderId: z.string().min(1, 'New holder employee is required'),
  newDepartmentId: z.string().optional().nullable(),
  newLocationId: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  status: z.nativeEnum(WorkflowStatus).optional().default(WorkflowStatus.COMPLETED),
});

export const AssetReturnSchema = z.object({
  assetId: z.string().optional(),
  employeeId: z.string().optional(),
  conditionAtReturn: z.nativeEnum(AssetCondition).default(AssetCondition.GOOD),
  accessoriesReturned: z.boolean().default(true),
  damageReported: z.boolean().default(false),
  missingAccessories: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  status: z.nativeEnum(WorkflowStatus).optional().default(WorkflowStatus.COMPLETED),
});

export const MaintenanceCreateSchema = z.object({
  assetId: z.string().min(1, 'Asset ID is required'),
  issueTitle: z.string().min(1, 'Issue title is required'),
  issueDescription: z.string().min(1, 'Issue description is required'),
  technician: z.string().optional().nullable(),
  serviceProvider: z.string().optional().nullable(),
  repairCost: z.number().optional().nullable(),
  repairStartDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  repairEndDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  resolution: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  repairStatus: z.nativeEnum(MaintenanceStatus).optional().default(MaintenanceStatus.REPORTED),
});

export const MaintenanceUpdateSchema = z.object({
  repairStatus: z.nativeEnum(MaintenanceStatus).optional(),
  issueTitle: z.string().optional(),
  issueDescription: z.string().optional(),
  technician: z.string().optional().nullable(),
  serviceProvider: z.string().optional().nullable(),
  repairStartDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  repairEndDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : undefined)),
  repairCost: z.number().optional().nullable(),
  resolution: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
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
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  designation: z.string().optional(),
  departmentId: z.string().min(1, 'Department is required'),
  locationId: z.string().min(1, 'Location is required'),
  joiningDate: z.string().optional().transform((str) => (str ? new Date(str) : undefined)),
  status: z.nativeEnum(EmployeeStatus).default(EmployeeStatus.ACTIVE),
});

export const DepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
  code: z.string().min(1, 'Department code is required'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const LocationSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  code: z.string().min(1, 'Location code is required'),
  address: z.string().optional(),
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
