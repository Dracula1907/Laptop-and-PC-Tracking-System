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

export type MaintenanceStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'REPORTED'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'WAITING_PARTS'
  | 'WAITING_FOR_PARTS'
  | 'WAITING_VENDOR'
  | 'COMPLETED'
  | 'CANCELLED';

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
  managerId?: string;
  manager?: Employee;
  locationId?: string;
  location?: Location;
  isActive: boolean;
  employees?: Employee[];
  assets?: Asset[];
  metrics?: {
    employeeCount: number;
    activeEmployeeCount: number;
    totalAssetCount: number;
    allocatedAssetCount: number;
    availableAssetCount: number;
    maintenanceAssetCount: number;
  };
  _count?: {
    employees: number;
    assets: number;
    assignments?: number;
  };
}

export interface Location {
  id: string;
  name: string;
  code: string;
  address?: string;
  description?: string;
  building?: string;
  floor?: string;
  roomZone?: string;
  city?: string;
  departmentId?: string;
  department?: Department;
  isActive: boolean;
  employees?: Employee[];
  assets?: Asset[];
  metrics?: {
    employeeCount: number;
    totalAssetCount: number;
    allocatedAssetCount: number;
    availableAssetCount: number;
    maintenanceAssetCount: number;
  };
  _count?: {
    employees: number;
    assets: number;
    assignments?: number;
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
  exitDate?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'EXITED';
  managerId?: string;
  manager?: Employee;
  subordinates?: Employee[];
  remarks?: string;
  user?: { id: string; username: string; isActive: boolean; role?: { name: string; code: string } };
  dataQuality?: 'CLEAN' | 'WARNING' | 'INCOMPLETE';
  accountability?: {
    currentlyAssignedAssetsCount: number;
    totalHistoricalAssets: number;
    activeAssignmentsCount: number;
    overdueReturnsCount: number;
    transferCount: number;
  };
  _count?: {
    heldAssets?: number;
    assignments?: number;
  };
  heldAssets?: Asset[];
  assignments?: AssetAssignment[];
  returns?: AssetReturn[];
  previousTransfers?: any[];
  newTransfers?: any[];
}

export interface EmployeeCounts {
  total: number;
  active: number;
  onLeave: number;
  inactive: number;
  exited: number;
}

export interface DepartmentCounts {
  total: number;
  active: number;
  inactive: number;
}

export interface LocationCounts {
  total: number;
  active: number;
  inactive: number;
}

export interface AssetSpecification {
  id?: string;
  processor?: string;
  ram?: string;
  storage?: string;
  storageType?: string;
  gpu?: string;
  displaySize?: string;
  monitor?: string;
  keyboard?: string;
  mouse?: string;
  chargerAdapter?: string;
  otherHardware?: string;
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
  sourceAssetId?: string;
  assetName?: string;
  assetDescription?: string;
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
  criticality?: AssetCriticality | string;

  location?: string | Location;
  locationRel?: Location | string;
  employeeNameSource?: string;
  lanIp?: string;
  ram?: string;
  cpu?: string;
  lanMacAddress?: string;
  dateOfAllocation?: string;
  dateOfDeallocation?: string;

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
  assignmentCode?: string;
  assetId: string;
  asset?: Asset;
  assetCode?: string;
  assetName?: string;
  model?: string;
  manufacturer?: string;
  assetType?: string;
  serialNumber?: string;
  employeeId: string;
  employee?: Employee;
  employeeName?: string;
  employeeCode?: string;
  employeeEmail?: string;
  departmentId?: string;
  departmentName?: string;
  department?: Department;
  locationId?: string;
  locationName?: string;
  location?: Location;
  assignedById?: string;
  assignedBy?: User;
  assignedByName?: string;
  approvedById?: string;
  approvedBy?: User;
  approvedByName?: string;
  assignedAt: string;
  expectedReturnDate?: string | null;
  actualReturnDate?: string | null;
  conditionAtAssignment: AssetCondition;
  conditionAtReturn?: AssetCondition | null;
  reason?: string;
  remarks?: string;
  status: WorkflowStatus | string;
  displayStatus?: string;
  isOverdue?: boolean;
  returns?: AssetReturn[];
  historyEvents?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetTransfer {
  id: string;
  transferCode?: string;
  assetId: string;
  asset?: Asset;
  assetCode?: string;
  assetName?: string;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  assetType?: string;
  previousHolderId?: string | null;
  previousHolder?: Employee | null;
  previousHolderName?: string;
  previousHolderCode?: string;
  newHolderId?: string | null;
  newHolder?: Employee | null;
  newHolderName?: string;
  newHolderCode?: string;
  previousDepartmentId?: string | null;
  previousDepartment?: Department | null;
  previousDepartmentName?: string;
  newDepartmentId?: string | null;
  newDepartment?: Department | null;
  newDepartmentName?: string;
  previousLocationId?: string | null;
  previousLocation?: Location | null;
  previousLocationName?: string;
  newLocationId?: string | null;
  newLocation?: Location | null;
  newLocationName?: string;
  requestedById?: string;
  requestedBy?: User;
  performedByName?: string;
  approvedById?: string | null;
  approvedBy?: User | null;
  approvedByName?: string | null;
  transferDate: string;
  effectiveDate?: string | null;
  conditionBefore?: AssetCondition | string;
  conditionAfter?: AssetCondition | string;
  reason?: string;
  remarks?: string;
  status: WorkflowStatus | string;
  createdAt?: string;
  updatedAt?: string;
  historyEvents?: any[];
}

export interface AssetReturn {
  id: string;
  returnCode?: string;
  assetId: string;
  asset?: Asset;
  assetCode?: string;
  assetName?: string;
  serialNumber?: string;
  assetType?: string;
  manufacturer?: string;
  model?: string;
  employeeId?: string | null;
  employee?: Employee | null;
  employeeName?: string;
  employeeCode?: string;
  departmentId?: string | null;
  department?: Department | null;
  departmentName?: string;
  locationId?: string | null;
  location?: Location | null;
  locationName?: string;
  receivedById?: string | null;
  receivedBy?: User | null;
  receivedByName?: string;
  returnDate: string;
  returnReason?: string;
  conditionAtReturn: AssetCondition | string;
  accessoriesReturned: boolean;
  damageReported: boolean;
  damageCategory?: string | null;
  damageDescription?: string | null;
  missingAccessories?: string | null;
  accessoriesChecklist?: Record<string, string> | any;
  dataWipeStatus?: string;
  inspectionRequired?: boolean;
  inspectionResult?: string | null;
  inspectedById?: string | null;
  inspectedBy?: User | null;
  inspectedByName?: string | null;
  inspectedAt?: string | null;
  inspectionRemarks?: string | null;
  maintenanceRequired?: boolean;
  maintenanceId?: string | null;
  maintenanceInfo?: any;
  disposition?: string | null;
  approvedById?: string | null;
  approvedBy?: User | null;
  approvedByName?: string | null;
  assignmentId?: string | null;
  assignmentInfo?: any;
  remarks?: string | null;
  status: WorkflowStatus | string;
  createdAt?: string;
  updatedAt?: string;
  historyEvents?: any[];
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
  maintenanceCode: string;
  assetId: string;
  asset?: Asset;
  assetCode?: string;
  assetName?: string;
  assetType?: string;
  serialNumber?: string;
  employeeName?: string;
  departmentName?: string;
  locationName?: string;
  maintenanceType: string;
  issueTitle: string;
  issueDescription: string;
  reportedAt: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  repairStatus: MaintenanceStatus;
  technician?: string;
  technicianId?: string;
  serviceProvider?: string;
  assignedToId?: string;
  assignedToName?: string;
  diagnosis?: string;
  rootCause?: string;
  recommendedAction?: string;
  repairAction?: string;
  partsReplaced?: string;
  laborCost?: number;
  partsCost?: number;
  serviceCost?: number;
  otherCost?: number;
  repairCost?: number;
  underWarranty: boolean;
  warrantyProvider?: string;
  warrantyReference?: string;
  warrantyClaimNumber?: string;
  warrantyCoverage?: string;
  warrantyExpiry?: string;
  repairStartDate?: string;
  expectedCompletionDate?: string;
  repairEndDate?: string;
  conditionBefore?: string;
  conditionAfter?: string;
  resolution?: string;
  finalDisposition?: string;
  remarks?: string;
  reportedBy?: User;
  reportedByName?: string;
  approvedByName?: string;
  parts?: MaintenancePart[];
  historyEvents?: any[];
  daysOpen?: number;
  isOverdue?: boolean;
  overdueDays?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetStatusHistory {
  id: string;
  assetId: string;
  action: string;
  eventType?: string;
  previousStatus?: AssetStatus;
  newStatus?: AssetStatus;
  previousAllocationStatus?: AllocationStatus;
  newAllocationStatus?: AllocationStatus;
  previousHolder?: string;
  newHolder?: string;
  previousHolderDetails?: Employee;
  newHolderDetails?: Employee;
  previousDepartment?: string;
  newDepartment?: string;
  previousLocation?: string;
  newLocation?: string;
  previousCondition?: AssetCondition;
  newCondition?: AssetCondition;
  performedBy?: string;
  performedByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  relatedRecordCode?: string;
  isCorrection?: boolean;
  correctedHistoryId?: string;
  correctionReason?: string;
  snapshot?: string;
  reason?: string;
  remarks?: string;
  metadata?: string;
  eventDate: string;
  createdAt: string;
}

export interface CustodianSummaryItem {
  id: string;
  name: string;
  code: string;
  firstSeen: string;
  lastSeen: string;
  count: number;
}

export interface AssetHistorySummary {
  totalEvents: number;
  assignments: number;
  transfers: number;
  returns: number;
  maintenanceEvents: number;
  conditionChanges: number;
  locationChanges: number;
  firstActivity?: {
    id: string;
    date: string;
    action: string;
    description: string;
    performedBy: string;
  } | null;
  lastActivity?: {
    id: string;
    date: string;
    action: string;
    description: string;
    performedBy: string;
  } | null;
  custodySummary: {
    currentHolder?: {
      id: string;
      fullName: string;
      employeeCode: string;
      designation?: string;
    } | null;
    previousCustodians: CustodianSummaryItem[];
    totalAssignments: number;
    totalTransfers: number;
    totalReturns: number;
  };
  currentState: {
    status: AssetStatus;
    allocationStatus: AllocationStatus;
    condition: AssetCondition;
    criticality?: string;
    department: string;
    location: string;
    currentHolder: string;
  };
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

export type ApprovalRequestType =
  | 'ASSIGNMENT'
  | 'TRANSFER'
  | 'RETURN_DISPOSITION'
  | 'MAINTENANCE_COMPLETION'
  | 'ASSET_STATUS_CHANGE'
  | 'ASSET_DEACTIVATION'
  | 'ASSET_RETIREMENT'
  | 'SENSITIVE_UPDATE';

export type ApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'CANCELLED'
  | 'EXPIRED';

export type ApprovalPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface ApprovalHistory {
  id: string;
  approvalRequestId: string;
  step: number;
  action: string;
  performedById: string;
  performedBy?: {
    id: string;
    username: string;
    role?: { name: string; code: string };
    employee?: { fullName: string; employeeCode: string };
  };
  comment?: string;
  snapshot?: string;
  createdAt: string;
}

export interface ApprovalRequest {
  id: string;
  requestCode: string;
  requestType: ApprovalRequestType;
  relatedEntityType?: string;
  relatedEntityId?: string;
  assetId?: string;
  asset?: Asset;
  requestedById: string;
  requestedBy?: {
    id: string;
    username: string;
    role?: { name: string; code: string };
    employee?: { fullName: string; employeeCode: string; department?: Department };
  };
  requestedAt: string;
  status: ApprovalStatus;
  priority: ApprovalPriority;
  reason?: string;
  comments?: string;
  currentStep: number;
  totalSteps: number;
  targetRole?: string;
  targetDepartmentId?: string;
  targetDepartment?: Department;
  decisionById?: string;
  decisionBy?: {
    id: string;
    username: string;
    role?: { name: string; code: string };
    employee?: { fullName: string; employeeCode: string };
  };
  decisionAt?: string;
  decisionComment?: string;
  rejectionReason?: string;
  changesRequested?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  proposedChanges: string;
  parsedChanges?: any;
  expectedSourceState?: string;
  approvalDeadline?: string;
  version: number;
  history?: ApprovalHistory[];
  permissions?: {
    canApprove: boolean;
    canReject: boolean;
    canRequestChanges: boolean;
    canCancel: boolean;
    canResubmit: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalPolicy {
  id: string;
  operationType: ApprovalRequestType;
  requiresApproval: boolean;
  approverRole?: string;
  allowSelfApproval: boolean;
  autoExpireDays?: number | null;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalCounts {
  total: number;
  pending: number;
  pendingMyAction: number;
  approved: number;
  rejected: number;
  changesRequested: number;
  myRequests: number;
  urgent: number;
}

export type WarrantyType =
  | 'STANDARD'
  | 'EXTENDED'
  | 'ONSITE'
  | 'DEPOT'
  | 'ACCIDENTAL_DAMAGE'
  | 'LIMITED'
  | 'SERVICE_CONTRACT'
  | 'OTHER';

export type CoverageStatus =
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'CANCELLED';

export type ClaimStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_SERVICE'
  | 'RESOLVED'
  | 'CANCELLED';

export interface WarrantyClaim {
  id: string;
  claimNumber: string;
  warrantyId: string;
  warranty?: Warranty;
  assetId: string;
  asset?: Asset;
  claimDate: string;
  issue: string;
  description: string;
  provider: string;
  status: ClaimStatus;
  submittedDate?: string;
  approvedDate?: string;
  serviceDate?: string;
  resolvedDate?: string;
  resolution?: string;
  claimCost?: number;
  warrantyCovered: boolean;
  coveredAmount?: number;
  outOfPocketAmount?: number;
  maintenanceId?: string;
  maintenance?: MaintenanceRecord;
  remarks?: string;
  createdById: string;
  createdBy?: {
    id: string;
    username: string;
    employee?: { fullName: string; employeeCode: string };
  };
  createdAt: string;
  updatedAt: string;
}

export interface Warranty {
  id: string;
  warrantyCode: string;
  assetId: string;
  asset?: Asset;
  warrantyType: WarrantyType;
  provider: string;
  policyNumber?: string;
  coverageDescription?: string;
  startDate: string;
  endDate: string;
  status: CoverageStatus;
  computedStatus?: CoverageStatus;
  daysRemaining?: number;
  daysSinceExpiry?: number;
  expiryCategory?: string;
  badgeColor?: string;
  claimContact?: string;
  contactEmail?: string;
  contactPhone?: string;
  purchaseDate?: string;
  purchaseReference?: string;
  warrantyCost?: number;
  coverageNotes?: string;
  attachmentRef?: string;
  isExtended: boolean;
  previousWarrantyId?: string;
  previousWarranty?: Warranty;
  extensionWarranties?: Warranty[];
  extensionReason?: string;
  createdById: string;
  createdBy?: {
    id: string;
    username: string;
    employee?: { fullName: string; employeeCode: string };
  };
  claims?: WarrantyClaim[];
  maintenanceRecords?: MaintenanceRecord[];
  _count?: {
    claims: number;
    maintenanceRecords: number;
  };
  financials?: {
    warrantyCost: number;
    totalClaimCost: number;
    totalCoveredAmount: number;
    totalOutOfPocket: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WarrantyCounts {
  total: number;
  active: number;
  expiringSoon: number;
  expiringIn30Days: number;
  expiringIn90Days: number;
  expired: number;
  cancelled: number;
  openClaims: number;
  resolvedClaims: number;
}




