export type UserRole = 'ADMIN' | 'MANAGER' | 'IT' | 'USER';

export type AssetType =
  | 'LAPTOP'
  | 'DESKTOP'
  | 'WORKSTATION'
  | 'MONITOR'
  | 'KEYBOARD'
  | 'MOUSE'
  | 'HEADSET'
  | 'CHARGER'
  | 'ADAPTER'
  | 'OTHER';

export type AssetStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'ASSIGNED'
  | 'IN_USE'
  | 'UNDER_REPAIR'
  | 'DAMAGED'
  | 'LOST'
  | 'STOLEN'
  | 'RETURNED'
  | 'IN_TRANSIT'
  | 'RETIRED'
  | 'SCRAPPED';

export type AllocationStatus = 'ALLOCATED' | 'NOT_ALLOCATED';
export type AssetCriticality = 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL' | 'UNSPECIFIED';
export type HolderType = 'EMPLOYEE' | 'SHARED' | 'ROOM' | 'POOL' | 'STOCK' | 'UNKNOWN';
export type HolderVerificationStatus = 'VERIFIED' | 'NEEDS_REVIEW' | 'NON_EMPLOYEE_HOLDER';
export type DataQualityStatus = 'CLEAN' | 'WARNING' | 'NEEDS_REVIEW';

export type AssetCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED' | 'CRITICAL';

export type WorkflowStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type MaintenanceStatus = 'REPORTED' | 'APPROVED' | 'IN_PROGRESS' | 'WAITING_FOR_PARTS' | 'COMPLETED' | 'CANCELLED';

export interface User {
  id: string;
  username: string;
  role: {
    id: string;
    code: string;
    name: string;
  };
  employee?: {
    id: string;
    employeeCode: string;
    fullName: string;
    email: string;
    designation?: string;
  } | null;
  permissions: string[];
  lastLoginAt?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  _count?: {
    employees: number;
    assets: number;
  };
}

export interface Location {
  id: string;
  name: string;
  code: string;
  address?: string;
  isActive: boolean;
  _count?: {
    employees: number;
    assets: number;
  };
}

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone?: string;
  designation?: string;
  departmentId: string;
  department?: Department;
  locationId: string;
  location?: Location;
  joiningDate?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'EXITED';
  heldAssets?: Asset[];
  assignments?: AssetAssignment[];
  returns?: AssetReturn[];
}

export interface AssetSpecification {
  id?: string;
  processor?: string;
  ram?: string;
  storage?: string;
  storageType?: string;
  gpu?: string;
  displaySize?: string;
  operatingSystem?: string;
  operatingSystemVersion?: string;
  macAddress?: string;
  ipAddress?: string;
  batteryHealth?: string;
  additionalSpecifications?: string;
}

export interface Asset {
  id: string;
  assetCode: string;
  companyAssetId?: string;
  assetName?: string;
  assetType: AssetType;
  assetNumber?: string;
  laptopNumber?: string;
  pcNumber?: string;
  serialNumber?: string;
  manufacturer: string;
  model: string;
  description?: string;
  status: AssetStatus;
  condition: AssetCondition;

  sourceAssetStatus?: string;
  sourceAllocationStatus?: string;
  sourceAssetType?: string;
  allocationStatus?: AllocationStatus;
  criticality?: AssetCriticality;

  holderType?: HolderType;
  holderDisplayName?: string;
  holderVerificationStatus?: HolderVerificationStatus;

  dataQualityStatus?: DataQualityStatus;
  dataQualityIssues?: string;

  currentHolderId?: string;
  currentHolder?: Employee;
  departmentId?: string;
  department?: Department;
  locationId?: string;
  location?: Location;

  importBatchId?: string;
  sourceRowNumber?: number;
  sourceRawData?: string;

  purchaseDate?: string;
  purchaseCost?: number;
  vendor?: string;
  warrantyStart?: string;
  warrantyEnd?: string;
  notes?: string;
  specifications?: AssetSpecification;
  assignments?: AssetAssignment[];
  transfers?: AssetTransfer[];
  returns?: AssetReturn[];
  maintenance?: MaintenanceRecord[];
  statusHistory?: AssetStatusHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface ImportPreviewRow {
  rowNumber: number;
  companyAssetId: string;
  sourceAssetId?: string;
  assetName: string;
  assetDescription?: string | null;
  serialNumber?: string | null;
  sourceAssetType: string;
  assetType?: AssetType;
  sourceAssetStatus: string;
  status?: AssetStatus;
  location?: string;
  locationRaw?: string;
  sourceAllocationStatus: string;
  allocationStatus?: AllocationStatus;
  criticalityRaw?: string;
  criticality?: string | null;
  employeeNameSource?: string | null;
  employeeNameRaw?: string;
  holderDisplayName?: string | null;
  holderType?: HolderType;
  holderVerificationStatus?: HolderVerificationStatus;
  lanIp?: string | null;
  ram?: string | null;
  dateOfAllocation?: string | null;
  dateOfDeallocation?: string | null;
  cpu?: string | null;
  lanMacAddress?: string | null;
  dataQualityStatus?: DataQualityStatus;
  dataQualityIssues?: string[];
  warnings: string[];
  errors: string[];
  isValid: boolean;
  rawData?: any;
}

export interface ImportPreviewSummary {
  fileName: string;
  fileSize?: number;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  duplicateRows: number;
  headerValid: boolean;
  headerErrors: string[];
  sampleRows?: ImportPreviewRow[];
  rows: ImportPreviewRow[];
}

export interface ImportBatch {
  id: string;
  fileName: string;
  fileHash?: string;
  uploadedById?: string;
  uploadedBy?: { username: string };
  uploadedAt?: string;
  createdAt: string;
  updatedAt?: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  importedRows: number;
  skippedRows: number;
  status: string;
  _count?: {
    assets: number;
    rowLogs: number;
  };
}

export interface AssetAssignment {
  id: string;
  assetId: string;
  asset?: Asset;
  employeeId: string;
  employee?: Employee;
  assignedBy?: User;
  approvedBy?: User;
  assignedAt: string;
  expectedReturnDate?: string;
  conditionAtAssignment: AssetCondition;
  remarks?: string;
  status: WorkflowStatus;
}

export interface AssetTransfer {
  id: string;
  assetId: string;
  asset?: Asset;
  previousHolder?: Employee;
  newHolder?: Employee;
  previousDepartment?: Department;
  newDepartment?: Department;
  previousLocation?: Location;
  newLocation?: Location;
  requestedBy?: User;
  approvedBy?: User;
  transferDate: string;
  reason?: string;
  remarks?: string;
  status: WorkflowStatus;
}

export interface AssetReturn {
  id: string;
  assetId: string;
  asset?: Asset;
  employee?: Employee;
  receivedBy?: User;
  returnDate: string;
  conditionAtReturn: AssetCondition;
  accessoriesReturned: boolean;
  damageReported: boolean;
  missingAccessories?: string;
  remarks?: string;
  status: WorkflowStatus;
}

export interface MaintenancePart {
  id?: string;
  partName: string;
  quantity: number;
  cost: number;
  remarks?: string;
}

export interface MaintenanceRecord {
  id: string;
  assetId: string;
  asset?: Asset;
  reportedBy?: User;
  issueTitle: string;
  issueDescription: string;
  reportedAt: string;
  repairStatus: MaintenanceStatus;
  technician?: string;
  serviceProvider?: string;
  repairStartDate?: string;
  repairEndDate?: string;
  repairCost?: number;
  resolution?: string;
  remarks?: string;
  parts?: MaintenancePart[];
}

export interface AssetStatusHistory {
  id: string;
  assetId: string;
  action: string;
  previousStatus?: AssetStatus;
  newStatus?: AssetStatus;
  previousHolder?: Employee;
  newHolder?: Employee;
  performedBy?: User;
  remarks?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  user?: {
    username: string;
    role?: { name: string };
  };
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  category: string;
  description?: string;
}

export interface SystemHealth {
  api: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  database: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  environment: string;
  version: string;
  timestamp: string;
}
