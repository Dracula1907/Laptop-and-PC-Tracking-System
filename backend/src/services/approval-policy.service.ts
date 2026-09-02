import prisma from '../config/prisma';
import { ApprovalRequestType } from '@prisma/client';

export class ApprovalPolicyService {
  private static initialized = false;

  /**
   * Seed default workflow approval policies if not already present
   */
  public static async ensureDefaultPolicies() {
    if (this.initialized) return;

    const defaultPolicies: {
      operationType: ApprovalRequestType;
      requiresApproval: boolean;
      approverRole: string;
      allowSelfApproval: boolean;
      autoExpireDays: number | null;
      description: string;
    }[] = [
      {
        operationType: ApprovalRequestType.TRANSFER,
        requiresApproval: true,
        approverRole: 'MANAGER',
        allowSelfApproval: false,
        autoExpireDays: 7,
        description: 'Inter-departmental and employee asset transfers require departmental or administrative authorization.',
      },
      {
        operationType: ApprovalRequestType.ASSIGNMENT,
        requiresApproval: true,
        approverRole: 'MANAGER',
        allowSelfApproval: false,
        autoExpireDays: 7,
        description: 'New hardware equipment assignments issued to corporate workforce require managerial sign-off.',
      },
      {
        operationType: ApprovalRequestType.ASSET_RETIREMENT,
        requiresApproval: true,
        approverRole: 'ADMIN',
        allowSelfApproval: false,
        autoExpireDays: 14,
        description: 'Permanent asset retirement and obsolescence write-offs require executive IT administration sign-off.',
      },
      {
        operationType: ApprovalRequestType.ASSET_DEACTIVATION,
        requiresApproval: true,
        approverRole: 'ADMIN',
        allowSelfApproval: false,
        autoExpireDays: 14,
        description: 'Asset deactivation and decommissioning require administrative authorization.',
      },
      {
        operationType: ApprovalRequestType.RETURN_DISPOSITION,
        requiresApproval: true,
        approverRole: 'MANAGER',
        allowSelfApproval: false,
        autoExpireDays: 7,
        description: 'Recovered assets slated for scrap or special disposal require manager review.',
      },
      {
        operationType: ApprovalRequestType.MAINTENANCE_COMPLETION,
        requiresApproval: false,
        approverRole: 'IT',
        allowSelfApproval: true,
        autoExpireDays: null,
        description: 'Routine maintenance ticket completion by authorized technicians.',
      },
      {
        operationType: ApprovalRequestType.ASSET_STATUS_CHANGE,
        requiresApproval: false,
        approverRole: 'ADMIN',
        allowSelfApproval: false,
        autoExpireDays: null,
        description: 'Manual overrides to asset lifecycle status.',
      },
      {
        operationType: ApprovalRequestType.SENSITIVE_UPDATE,
        requiresApproval: false,
        approverRole: 'ADMIN',
        allowSelfApproval: false,
        autoExpireDays: null,
        description: 'Modifications to primary serial numbers, company asset tags, or hardware architecture.',
      },
    ];

    for (const p of defaultPolicies) {
      await prisma.approvalPolicy.upsert({
        where: { operationType: p.operationType },
        update: {},
        create: p,
      });
    }

    this.initialized = true;
  }

  /**
   * Fetch all workflow approval policies
   */
  public static async getPolicies() {
    await this.ensureDefaultPolicies();
    return await prisma.approvalPolicy.findMany({
      orderBy: { operationType: 'asc' },
    });
  }

  /**
   * Fetch specific workflow policy by operation type
   */
  public static async getPolicy(operationType: ApprovalRequestType) {
    await this.ensureDefaultPolicies();
    return await prisma.approvalPolicy.findUnique({
      where: { operationType },
    });
  }

  /**
   * Update workflow policy configuration
   */
  public static async updatePolicy(
    operationType: ApprovalRequestType,
    data: {
      requiresApproval: boolean;
      approverRole?: string;
      allowSelfApproval?: boolean;
      autoExpireDays?: number | null;
      description?: string;
      isActive?: boolean;
    }
  ) {
    await this.ensureDefaultPolicies();
    return await prisma.approvalPolicy.update({
      where: { operationType },
      data,
    });
  }

  /**
   * Determine whether an operation requires an approval workflow
   */
  public static async shouldRequireApproval(
    operationType: ApprovalRequestType,
    user?: { id: string; role?: { code: string } }
  ): Promise<{ required: boolean; policy: any | null }> {
    await this.ensureDefaultPolicies();
    const policy = await prisma.approvalPolicy.findUnique({
      where: { operationType },
    });

    if (!policy || !policy.isActive || !policy.requiresApproval) {
      return { required: false, policy: null };
    }

    return { required: true, policy };
  }
}
