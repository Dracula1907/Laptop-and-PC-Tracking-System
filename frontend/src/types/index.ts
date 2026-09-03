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
  gatePresence?: 'INSIDE' | 'OUTSIDE';
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
  category: NotificationCategory;
  type: string;
  priority: NotificationPriority;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  assetId?: string;
  actionRoute?: string;
  isRead: boolean;
  readAt?: string;
  expiresAt?: string;
  metadata?: string;
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

// ----------------------------------------------------
// STEP 11: NOTIFICATIONS & ALERTS
// ----------------------------------------------------
export type NotificationCategory =
  | 'APPROVAL'
  | 'ASSIGNMENT'
  | 'TRANSFER'
  | 'RETURN'
  | 'MAINTENANCE'
  | 'WARRANTY'
  | 'DATA_QUALITY'
  | 'EMPLOYEE'
  | 'RETIREMENT'
  | 'REPLACEMENT'
  | 'BULK_OPERATION'
  | 'DOCUMENT'
  | 'ASSET'
  | 'SYSTEM';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';



export interface NotificationPreference {
  category: NotificationCategory;
  inAppEnabled: boolean;
  emailEnabled: boolean;
}

// ----------------------------------------------------
// STEP 12: REPORTS & MANAGEMENT ANALYTICS
// ----------------------------------------------------
export interface ManagementKPIs {
  totalAssets: number;
  allocatedAssets: number;
  unallocatedAssets: number;
  activeAssets: number;
  inactiveAssets: number;
  underMaintenance: number;
  overdueReturns: number;
  warrantyExpiring: number;
  criticalDataQuality: number;
  activeClearances: number;
  retiredAssets: number;
  timestamp: string;
}

export interface AssetAnalyticsData {
  byType: { type: string; count: number }[];
  byStatus: { status: string; count: number }[];
  byAllocation: { allocation: string; count: number }[];
  byCriticality: { criticality: string; count: number }[];
  byDepartment: { id: string; name: string; code: string; count: number }[];
  byLocation: { id: string; name: string; code: string; count: number }[];
}

export interface UtilizationData {
  formula: string;
  totalEligible: number;
  allocatedEligible: number;
  overallRate: number;
  byType: { assetType: string; total: number; allocated: number; utilizationRate: number }[];
}

export interface EmployeeAccountabilityItem {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  department: string;
  location: string;
  status: string;
  assetsHeld: number;
  activeAssignments: number;
  overdueAssignments: number;
  hasClearance: boolean;
}

export interface OverdueReturnItem {
  id: string;
  assignmentCode?: string;
  assetCode: string;
  assetName: string;
  assetType: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  location: string;
  assignedAt: string;
  expectedReturnDate: string;
  daysOverdue: number;
  criticality: string;
}

export interface MaintenanceAnalyticsData {
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  byType: { type: string; count: number }[];
  costs: {
    totalTickets: number;
    laborCost: number;
    partsCost: number;
    serviceCost: number;
    otherCost: number;
    totalCost: number;
    avgCost: number;
  };
}

export interface WarrantyAnalyticsData {
  activeWarranties: number;
  expiring7Days: number;
  expiring30Days: number;
  expiring60Days: number;
  expiring90Days: number;
  expiredWarranties: number;
  claims: {
    totalClaims: number;
    totalClaimCost: number;
    coveredAmount: number;
    outOfPocketAmount: number;
  };
}

export interface AgingBracket {
  bracket: string;
  count: number;
}

export interface AssetHealthItem {
  id: string;
  assetCode: string;
  assetName: string;
  assetType: string;
  status: string;
  condition: string;
  criticality: string;
  category: 'HEALTHY' | 'ATTENTION' | 'HIGH RISK';
  riskScore: number;
  issues: string[];
}

export interface SavedReport {
  id: string;
  name: string;
  description?: string;
  reportType: string;
  filters: string;
  sortBy?: string;
  sortOrder?: string;
  createdAt: string;
}

// ----------------------------------------------------
// STEP 13: EMPLOYEE EXIT & CLEARANCE
// ----------------------------------------------------
export type ClearanceStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'PENDING_REVIEW'
  | 'PENDING_APPROVAL'
  | 'CLEARED'
  | 'BLOCKED'
  | 'CANCELLED';

export type ClearanceAction =
  | 'RETURN'
  | 'TRANSFER'
  | 'RETAIN_EXCEPTION'
  | 'MISSING'
  | 'DAMAGED'
  | 'MAINTENANCE_REQUIRED';

export interface ClearanceItem {
  id: string;
  clearanceId: string;
  assetId: string;
  asset: Asset;
  assignmentId: string;
  assignment?: AssetAssignment;
  action: ClearanceAction;
  status: 'PENDING' | 'RESOLVED' | 'BLOCKED';
  returnId?: string | null;
  transferId?: string | null;
  maintenanceId?: string | null;
  conditionAtClearance?: AssetCondition | null;
  damageDescription?: string | null;
  missingAccessories?: string | null;
  exceptionReason?: string | null;
  resolutionNotes?: string | null;
  resolvedById?: string | null;
  resolvedAt?: string | null;
}

export interface Clearance {
  id: string;
  clearanceCode: string;
  employee: {
    id: string;
    employeeCode: string;
    fullName: string;
    department?: string;
    location?: string;
  };
  exitDate: string;
  initiatedDate: string;
  status: ClearanceStatus;
  reason?: string;
  notes?: string;
  totalItems: number;
  resolvedItems: number;
  outstandingItems: number;
  initiatedBy: string;
  approvedBy?: string;
  completedDate?: string | null;
  items?: ClearanceItem[];
}

// ----------------------------------------------------
// STEP 14: DOCUMENT MANAGEMENT
// ----------------------------------------------------
export type DocumentType = 'HANDOVER' | 'TRANSFER' | 'RETURN_RECEIPT' | 'CLEARANCE' | 'RETIREMENT';
export type DocumentStatus = 'DRAFT' | 'FINAL' | 'VOIDED' | 'SUPERSEDED';

export interface OfficialDocument {
  id: string;
  documentNumber: string;
  documentType: DocumentType;
  relatedEntityType: string;
  relatedEntityId: string;
  assetId?: string | null;
  asset?: { assetCode: string; model: string } | null;
  employeeId?: string | null;
  employee?: { employeeCode: string; fullName: string } | null;
  generatedById: string;
  generatedBy: { username: string };
  generatedAt: string;
  version: number;
  status: DocumentStatus;
  fileReference?: string | null;
  fileHash?: string | null;
  snapshotData: string;
  parsedSnapshot?: any;
  remarks?: string | null;
  createdAt: string;
}

// ----------------------------------------------------
// STEP 15: BULK OPERATIONS & EXCEL IMPORT
// ----------------------------------------------------
export interface StagedRow {
  rowNumber: number;
  assetCode: string;
  isNew: boolean;
  existingId?: string | null;
  status: 'VALID' | 'WARNING' | 'ERROR';
  errors: string[];
  warnings: string[];
  changes: Record<string, { oldVal: any; newVal: any }>;
  rawData: any;
}

export interface ImportStageResult {
  batchId: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  preview: StagedRow[];
}

export interface ImportBatchItem {
  id: string;
  fileName: string;
  entityType: string;
  mode: string;
  uploadedAt: string;
  uploadedBy?: { username: string };
  totalRows: number;
  validRows: number;
  errorRows: number;
  importedRows: number;
  status: string;
  rollbackStatus: string;
}

// ----------------------------------------------------
// STEP 16: RETIREMENT & REPLACEMENT
// ----------------------------------------------------
export type RetirementReason =
  | 'END_OF_LIFE'
  | 'OBSOLETE'
  | 'REPEATED_FAILURE'
  | 'SEVERE_DAMAGE'
  | 'UNECONOMICAL_TO_REPAIR'
  | 'SECURITY_SUPPORT_END'
  | 'WARRANTY_EXPIRED'
  | 'PERFORMANCE'
  | 'LOST_OR_UNRECOVERED'
  | 'OTHER';

export type RetirementStatus =
  | 'PROPOSED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'CANCELLED';

export type DisposalMethod =
  | 'ELECTRONIC_WASTE_RECYCLER'
  | 'DONATION'
  | 'BUYBACK'
  | 'SCRAP'
  | 'INTERNAL_REPURPOSE'
  | 'OTHER';

export type DataSanitizationStatus = 'NOT_REQUIRED' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'VERIFIED';
export type ReplacementStatus = 'NOT_REQUIRED' | 'RECOMMENDED' | 'REQUESTED' | 'REPLACED' | 'DEFERRED';

export interface RetirementCandidate {
  assetId: string;
  assetCode: string;
  assetName: string;
  assetType: string;
  serialNumber?: string;
  department: string;
  location: string;
  currentHolder?: string | null;
  allocationStatus: string;
  status: string;
  condition: string;
  criticality: string;
  ageYears: string;
  maintenanceCount: number;
  maintenanceCost: number;
  warrantyStatus: string;
  recommendation: 'RETAIN' | 'REVIEW_RECOMMENDED' | 'REPLACEMENT_RECOMMENDED';
  reasons: string[];
}

export interface RetirementRecord {
  id: string;
  retirementCode: string;
  asset: {
    assetCode: string;
    model: string;
    assetType: string;
    serialNumber?: string;
  };
  status: RetirementStatus;
  reason: RetirementReason;
  overrideReason?: string;
  requestedDate: string;
  retirementDate?: string;
  requestedBy: { username: string };
  approvedBy?: { username: string };
  replacementAsset?: { assetCode: string; model: string };
}

// ─── QR & Security Gate Tracking Types ─────────────────────────────────────
export type GatePresence = 'INSIDE' | 'OUTSIDE';
export type GateMovementType = 'OUT' | 'IN';
export type GateMovementStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED';
export type QrCodeStatus = 'ACTIVE' | 'REVOKED' | 'REPLACED';

export interface GateMaster {
  id: string;
  name: string;
  code: string;
  location?: string | null;
  status: string;
  _count?: {
    movements: number;
  };
}

export interface AssetQrCodeRecord {
  id: string;
  assetId: string;
  token: string;
  status: QrCodeStatus;
  generatedAt: string;
  generatedBy?: { id: string; username: string };
  revokedAt?: string | null;
  revokedBy?: { id: string; username: string } | null;
  revocationReason?: string | null;
  replacedAt?: string | null;
  replacedBy?: { id: string; username: string } | null;
  replacementReason?: string | null;
}

export interface GateMovementRecord {
  id: string;
  movementCode: string;
  assetId: string;
  asset?: {
    id: string;
    assetCode: string;
    companyAssetId?: string;
    assetName?: string;
    model: string;
    assetType: string;
    gatePresence: GatePresence;
  };
  qrCodeId?: string | null;
  movementType: GateMovementType;
  movementDateTime: string;
  gateId?: string | null;
  gate?: { id: string; name: string; code: string } | null;
  guardUserId?: string | null;
  guardUser?: { id: string; username: string } | null;
  employeeId?: string | null;
  employee?: { id: string; employeeCode: string; fullName: string } | null;
  departmentId?: string | null;
  department?: { id: string; name: string; code?: string } | null;
  locationId?: string | null;
  location?: { id: string; name: string; code?: string } | null;
  destination?: string | null;
  purpose?: string | null;
  expectedReturn?: string | null;
  actualReturn?: string | null;
  relatedMovementId?: string | null;
  relatedMovement?: { id: string; movementCode: string; movementDateTime: string } | null;
  remarks?: string | null;
  status: GateMovementStatus;
}

export interface GateKPIs {
  assetsOutside: number;
  assetsInside: number;
  todayOut: number;
  todayIn: number;
  overdueReturns: number;
  totalMovements: number;
}

export interface CurrentOutsideItem {
  id?: string;
  movementId?: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  assetType: string;
  model: string;
  holderName: string;
  department: string;
  location: string;
  movementCode: string;
  outDateTime: string | null;
  gateName: string;
  guardName: string;
  destination: string;
  purpose: string;
  expectedReturn: string | null;
  durationHours: number;
  isOverdue: boolean;
  remarks: string;
}


export interface ScannedAssetData {
  qrId: string;
  token: string;
  qrStatus: QrCodeStatus;
  assetId: string;
  assetCode: string;
  assetName: string;
  assetType: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  currentHolder: string;
  employeeCode?: string | null;
  department: string;
  location: string;
  gatePresence: GatePresence;
  openOutMovement?: {
    id: string;
    movementCode: string;
    movementDateTime: string;
    gateName: string;
    destination: string;
    purpose: string;
    expectedReturn?: string | null;
    remarks?: string | null;
    guardName: string;
  } | null;
}





