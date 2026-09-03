export type UserRole = 'ADMIN' | 'MANAGER' | 'SECURITY_GUARD' | 'IT' | 'USER';

export interface UserSession {
  userId: string;
  username: string;
  roleId: string;
  roleCode: UserRole;
  roleName: string;
  employeeId?: string | null;
  permissions: string[];
}

export interface GateKPIs {
  assetsOutside: number;
  assetsInside: number;
  todayOut: number;
  todayIn: number;
  overdueReturns: number;
  totalMovements: number;
}

export interface ScannedAssetData {
  qrId: string;
  token: string;
  qrStatus: 'ACTIVE' | 'REVOKED' | 'REPLACED';
  assetId: string;
  assetCode: string;
  companyAssetId?: string;
  assetName: string;

  assetType: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  currentHolder: string;
  employeeCode: string | null;
  department: string;
  location: string;
  gatePresence: 'INSIDE' | 'OUTSIDE';
  openOutMovement: {
    id: string;
    movementCode: string;
    movementDateTime: string;
    gateName: string;
    destination: string;
    purpose: string;
    expectedReturn: string | null;
    remarks: string | null;
    guardName: string;
  } | null;
  fullDetails?: {
    status: string;
    allocationStatus: string;
    criticality: string;
    purchaseCost?: number | null;
    purchaseDate?: string | null;
    warrantyStart?: string | null;
    warrantyEnd?: string | null;
    dataQualityStatus?: string;
    dataQualityIssues?: string | null;
    specifications?: {
      cpu?: string | null;
      ram?: string | null;
      storage?: string | null;
      monitor?: string | null;
      keyboard?: string | null;
      mouse?: string | null;
      chargerAdapter?: string | null;
      lanIp?: string | null;
      lanMacAddress?: string | null;
    } | null;
    warranties?: any[];
    maintenance?: any[];
    assignments?: any[];
    transfers?: any[];
    returns?: any[];
    gateMovements?: any[];
  };
}

export interface GateMaster {
  id: string;
  name: string;
  code: string;
  location?: string | null;
  isActive: boolean;
}

export interface CurrentOutsideItem {
  assetId: string;
  assetCode: string;
  assetName: string;
  assetType: string;
  model: string;
  holderName: string;
  department: string;
  location: string;
  movementId?: string;
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

export interface GateMovementRecord {
  id: string;
  movementCode: string;
  movementType: 'OUT' | 'IN';
  movementDateTime: string;
  destination?: string | null;
  purpose?: string | null;
  expectedReturn?: string | null;
  remarks?: string | null;
  status: 'OPEN' | 'COMPLETED' | 'CANCELLED';
  asset: {
    id: string;
    assetCode: string;
    assetName: string;
    model: string;
    assetType: string;
  };
  gate?: { name: string; code: string } | null;
  guardUser?: { username: string } | null;
  employee?: { fullName: string; employeeCode: string } | null;
}
