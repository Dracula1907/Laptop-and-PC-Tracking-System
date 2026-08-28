import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/Button';
import api from '../services/api';
import { Employee } from '../types';
import { ArrowLeft, User, Mail, Phone, Building, MapPin, Laptop, Clock } from 'lucide-react';

export const EmployeeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchEmployee = async () => {
      setLoading(true);
      try {
        const res: any = await api.get(`/employees/${id}`);
        if (res.success) setEmployee(res.data);
      } catch (err) {
        console.error('Employee fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id]);

  if (loading || !employee) {
    return <div className="py-20 text-center text-textSecondary">Loading Employee Profile...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${employee.fullName} (${employee.employeeCode})`}
        subtitle={`${employee.designation || 'Staff'} — ${employee.department?.name || 'Department'}`}
        actions={
          <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/employees')}>
            Back to Directory
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card title="Employee Profile Information" subtitle="Personal and organizational attributes">
          <div className="space-y-4 text-xs">
            <div>
              <span className="text-textMuted block">Employee Code</span>
              <p className="font-mono font-bold text-brandPrimary mt-0.5">{employee.employeeCode}</p>
            </div>
            <div>
              <span className="text-textMuted block">Email Address</span>
              <p className="font-medium text-textPrimary mt-0.5">{employee.email}</p>
            </div>
            <div>
              <span className="text-textMuted block">Phone Contact</span>
              <p className="font-medium text-textPrimary mt-0.5">{employee.phone || 'N/A'}</p>
            </div>
            <div>
              <span className="text-textMuted block">Department</span>
              <p className="font-medium text-textPrimary mt-0.5">{employee.department?.name}</p>
            </div>
            <div>
              <span className="text-textMuted block">Location</span>
              <p className="font-medium text-textPrimary mt-0.5">{employee.location?.name}</p>
            </div>
            <div>
              <span className="text-textMuted block">Employment Status</span>
              <div className="mt-1"><StatusBadge status={employee.status} type="employee" /></div>
            </div>
          </div>
        </Card>

        {/* Assigned Hardware */}
        <Card title="Currently Held Assets" subtitle="IT equipment assigned to this employee" className="lg:col-span-2">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {employee.heldAssets?.length === 0 ? (
              <p className="text-xs text-textMuted py-8 text-center">No active hardware currently assigned to this employee.</p>
            ) : (
              employee.heldAssets?.map((asset: any) => (
                <div
                  key={asset.id}
                  onClick={() => navigate(`/assets/${asset.id}`)}
                  className="p-3 rounded-lg bg-surfaceElevated border border-borderDark flex items-center justify-between cursor-pointer hover:border-brandPrimary transition-colors"
                >
                  <div>
                    <span className="font-mono font-bold text-brandPrimary text-xs">{asset.assetCode}</span>
                    <h5 className="font-semibold text-textPrimary text-xs mt-0.5">{asset.manufacturer} {asset.model}</h5>
                    <p className="text-[10px] text-textMuted">{asset.assetType} {asset.serialNumber ? `| S/N: ${asset.serialNumber}` : ''}</p>
                  </div>
                  <StatusBadge status={asset.status} type="assetStatus" />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Historical Assignments & Returns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Assignment History" subtitle="Previous and current asset assignments">
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {employee.assignments?.map((asg: any) => (
              <div key={asg.id} className="p-3 rounded-lg bg-surfaceElevated border border-borderDark text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-brandPrimary">{asg.asset?.assetCode}</span>
                  <StatusBadge status={asg.status} type="workflow" />
                </div>
                <p className="text-textSecondary mt-1">{asg.asset?.manufacturer} {asg.asset?.model}</p>
                <span className="text-[10px] text-textMuted mt-1 block">Assigned: {new Date(asg.assignedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Return History" subtitle="Asset returns logged for this employee">
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {employee.returns?.map((ret: any) => (
              <div key={ret.id} className="p-3 rounded-lg bg-surfaceElevated border border-borderDark text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-brandPrimary">{ret.asset?.assetCode}</span>
                  <StatusBadge status={ret.conditionAtReturn} type="condition" />
                </div>
                <p className="text-textSecondary mt-1">{ret.remarks || 'Returned to IT stock'}</p>
                <span className="text-[10px] text-textMuted mt-1 block">Return Date: {new Date(ret.returnDate).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
