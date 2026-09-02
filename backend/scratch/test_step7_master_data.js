const { PrismaClient, EmployeeStatus, AssetStatus, AllocationStatus } = require('@prisma/client');
const prisma = new PrismaClient();

async function runStep7Verification() {
  console.log('================================================================');
  console.log('STEP 7 VERIFICATION: EMPLOYEE, DEPT/AREA & LOCATION MASTER DATA');
  console.log('================================================================\n');

  // 1. Admin Authentication
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData?.data?.token;
  if (!token) throw new Error('Failed to login as admin');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  console.log('✓ 1. Admin authentication successful');

  // Query an active department and location for bootstrapping
  const deptsRes = await (await fetch('http://localhost:5000/api/departments?isActive=true', { headers })).json();
  const baseDept = deptsRes.data.departments ? deptsRes.data.departments[0] : deptsRes.data[0];
  const locsRes = await (await fetch('http://localhost:5000/api/locations?isActive=true', { headers })).json();
  const baseLoc = locsRes.data.locations ? locsRes.data.locations[0] : locsRes.data[0];

  // 2. Department Master Tests
  console.log('\n--- 2. DEPARTMENT MASTER TESTS ---');
  const testDeptCode = `DEPT-TEST-${Date.now().toString().slice(-4)}`;
  const createDeptRes = await (
    await fetch('http://localhost:5000/api/departments', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code: testDeptCode,
        name: 'Automated Test Engineering',
        description: 'Quality assurance and automation robotics laboratory',
        locationId: baseLoc.id,
      }),
    })
  ).json();
  if (!createDeptRes.success) throw new Error('Create department failed: ' + JSON.stringify(createDeptRes));
  const testDept = createDeptRes.data;
  console.log(`✓ 2.1: Created test department ${testDept.code} (${testDept.name})`);

  // Department Counts
  const deptCountsRes = await (await fetch('http://localhost:5000/api/departments/counts', { headers })).json();
  console.log('✓ 2.2: Department telemetry counts:', deptCountsRes.data);

  // Department Details
  const deptDetailsRes = await (await fetch(`http://localhost:5000/api/departments/${testDept.id}`, { headers })).json();
  if (!deptDetailsRes.success) throw new Error('Department details failed');
  console.log('✓ 2.3: Department details metrics:', deptDetailsRes.data.metrics);

  // Deactivate Department
  const deactDeptRes = await (
    await fetch(`http://localhost:5000/api/departments/${testDept.id}/deactivate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    })
  ).json();
  if (!deactDeptRes.success) throw new Error('Deactivate department failed');
  console.log('✓ 2.4: Deactivated department successfully (isActive = false)');

  // 3. Location Master Tests
  console.log('\n--- 3. LOCATION MASTER TESTS ---');
  const testLocCode = `LOC-TEST-${Date.now().toString().slice(-4)}`;
  const createLocRes = await (
    await fetch('http://localhost:5000/api/locations', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code: testLocCode,
        name: 'Faith Robotics Innovation Hub',
        building: 'Building Gamma',
        floor: '3rd Floor',
        roomZone: 'Lab 302',
        city: 'Pune',
        description: 'Advanced testing site for automation robotics',
      }),
    })
  ).json();
  if (!createLocRes.success) throw new Error('Create location failed: ' + JSON.stringify(createLocRes));
  const testLoc = createLocRes.data;
  console.log(`✓ 3.1: Created test location ${testLoc.code} (${testLoc.name})`);

  // Location Counts
  const locCountsRes = await (await fetch('http://localhost:5000/api/locations/counts', { headers })).json();
  console.log('✓ 3.2: Location telemetry counts:', locCountsRes.data);

  // Location Details
  const locDetailsRes = await (await fetch(`http://localhost:5000/api/locations/${testLoc.id}`, { headers })).json();
  if (!locDetailsRes.success) throw new Error('Location details failed');
  console.log('✓ 3.3: Location details metrics:', locDetailsRes.data.metrics);

  // Deactivate Location
  const deactLocRes = await (
    await fetch(`http://localhost:5000/api/locations/${testLoc.id}/deactivate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    })
  ).json();
  if (!deactLocRes.success) throw new Error('Deactivate location failed');
  console.log('✓ 3.4: Deactivated location successfully (isActive = false)');

  // 4. Inactive Master Rejection Tests
  console.log('\n--- 4. INACTIVE MASTER ASSIGNMENT REJECTION ---');
  // Query an active employee for testing
  const activeEmp = (await (await fetch('http://localhost:5000/api/employees?status=ACTIVE&limit=1', { headers })).json()).data.employees[0];
  // Query an available asset
  const availableAsset = (await (await fetch('http://localhost:5000/api/assets?status=AVAILABLE&limit=1', { headers })).json()).data.assets[0];

  // Try assigning using inactive department
  const rejectDeptAssignRes = await (
    await fetch('http://localhost:5000/api/assignments', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        assetId: availableAsset.id,
        employeeId: activeEmp.id,
        departmentId: testDept.id, // Inactive department
        locationId: baseLoc.id,
      }),
    })
  ).json();
  console.log(`✓ 4.1: Inactive department rejected: ${rejectDeptAssignRes.success === false} (Message: "${rejectDeptAssignRes.message}")`);
  if (rejectDeptAssignRes.success !== false) throw new Error('Should have rejected inactive department!');

  // Try assigning using inactive location
  const rejectLocAssignRes = await (
    await fetch('http://localhost:5000/api/assignments', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        assetId: availableAsset.id,
        employeeId: activeEmp.id,
        departmentId: baseDept.id,
        locationId: testLoc.id, // Inactive location
      }),
    })
  ).json();
  console.log(`✓ 4.2: Inactive location rejected: ${rejectLocAssignRes.success === false} (Message: "${rejectLocAssignRes.message}")`);
  if (rejectLocAssignRes.success !== false) throw new Error('Should have rejected inactive location!');

  // 5. Employee Master Tests
  console.log('\n--- 5. EMPLOYEE MASTER TESTS ---');
  const testEmpEmail = `test.dev.${Date.now()}@faithautomation.com`;
  const createEmpRes = await (
    await fetch('http://localhost:5000/api/employees', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fullName: 'Dev Test Employee',
        email: testEmpEmail,
        phone: '+91 91234 56789',
        designation: 'Automation Quality Analyst',
        departmentId: baseDept.id,
        locationId: baseLoc.id,
        status: 'ACTIVE',
        joiningDate: new Date().toISOString().slice(0, 10),
      }),
    })
  ).json();
  if (!createEmpRes.success) throw new Error('Create employee failed: ' + JSON.stringify(createEmpRes));
  const testEmp = createEmpRes.data;
  console.log(`✓ 5.1: Created employee ${testEmp.employeeCode} (${testEmp.fullName})`);

  // Employee Counts
  const empCountsRes = await (await fetch('http://localhost:5000/api/employees/counts', { headers })).json();
  console.log('✓ 5.2: Employee telemetry counts:', empCountsRes.data);

  // Employee Search & Pagination
  const searchEmpRes = await (await fetch(`http://localhost:5000/api/employees?search=${encodeURIComponent(testEmp.employeeCode)}`, { headers })).json();
  if (!searchEmpRes.success || searchEmpRes.data.employees.length === 0) throw new Error('Employee search failed');
  console.log(`✓ 5.3: Employee search verified (found ${searchEmpRes.data.employees[0].fullName}, DataQuality: ${searchEmpRes.data.employees[0].dataQuality})`);

  // Employee Details & Accountability Metrics
  const empDetailsRes = await (await fetch(`http://localhost:5000/api/employees/${testEmp.id}`, { headers })).json();
  if (!empDetailsRes.success) throw new Error('Employee details failed');
  console.log('✓ 5.4: Employee details accountability:', empDetailsRes.data.accountability);

  // 6. Assignment to Active Employee (Successful)
  console.log('\n--- 6. ASSET ASSIGNMENT INTEGRATION ---');
  const assignRes = await (
    await fetch('http://localhost:5000/api/assignments', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        assetId: availableAsset.id,
        employeeId: testEmp.id,
        departmentId: baseDept.id,
        locationId: baseLoc.id,
        conditionAtAssignment: 'GOOD',
        reason: 'Master data integration validation',
      }),
    })
  ).json();
  if (!assignRes.success) throw new Error('Assignment failed: ' + JSON.stringify(assignRes));
  console.log(`✓ 6.1: Successfully assigned asset ${availableAsset.companyAssetId} to employee ${testEmp.fullName}`);

  // Verify employee held assets updated
  const updatedEmpDetails = await (await fetch(`http://localhost:5000/api/employees/${testEmp.id}`, { headers })).json();
  console.log(`✓ 6.2: Employee active held assets count: ${updatedEmpDetails.data.accountability.currentlyAssignedAssetsCount}`);
  if (updatedEmpDetails.data.accountability.currentlyAssignedAssetsCount !== 1) {
    throw new Error('Employee held assets count should be 1');
  }

  // 7. Deactivation & Exit Clearance Warning
  console.log('\n--- 7. EMPLOYEE DEACTIVATION & EXIT CLEARANCE ---');
  const deactEmpRes = await (
    await fetch(`http://localhost:5000/api/employees/${testEmp.id}/deactivate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        status: 'EXITED',
        exitDate: new Date().toISOString().slice(0, 10),
        remarks: 'Employee completed exit interview. Hardware recovery in progress.',
      }),
    })
  ).json();
  if (!deactEmpRes.success) throw new Error('Employee deactivation failed: ' + JSON.stringify(deactEmpRes));
  console.log(`✓ 7.1: Deactivation clearance result: clearanceRequired=${deactEmpRes.data.clearanceRequired}, heldAssets=${deactEmpRes.data.heldAssetsCount}`);
  if (!deactEmpRes.data.clearanceRequired || deactEmpRes.data.heldAssetsCount < 1) {
    throw new Error('Deactivation should indicate clearance required for employee with held assets!');
  }

  // 8. Eligibility Protection: Block assignment to EXITED employee
  console.log('\n--- 8. ELIGIBILITY PROTECTION ENFORCEMENT ---');
  // Find another available asset
  const anotherAsset = (await (await fetch('http://localhost:5000/api/assets?status=AVAILABLE&limit=1', { headers })).json()).data.assets[0];
  if (anotherAsset) {
    const rejectExitedAssignRes = await (
      await fetch('http://localhost:5000/api/assignments', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          assetId: anotherAsset.id,
          employeeId: testEmp.id, // EXITED employee
          departmentId: baseDept.id,
          locationId: baseLoc.id,
        }),
      })
    ).json();
    console.log(`✓ 8.1: Assignment to EXITED employee blocked: ${rejectExitedAssignRes.success === false} (Message: "${rejectExitedAssignRes.message}")`);
    if (rejectExitedAssignRes.success !== false || !rejectExitedAssignRes.message.includes('not eligible for new asset assignment')) {
      throw new Error('Assignment to EXITED employee was not properly blocked with expected message!');
    }

    // Also test transfer to EXITED employee
    const rejectExitedTransferRes = await (
      await fetch('http://localhost:5000/api/transfers', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          assetId: availableAsset.id,
          newHolderId: testEmp.id, // EXITED employee
          reason: 'Transfer attempt to exited staff',
        }),
      })
    ).json();
    console.log(`✓ 8.2: Transfer to EXITED employee blocked: ${rejectExitedTransferRes.success === false} (Message: "${rejectExitedTransferRes.message}")`);
    if (rejectExitedTransferRes.success !== false || !rejectExitedTransferRes.message.includes('not eligible for new asset assignment')) {
      throw new Error('Transfer to EXITED employee was not properly blocked with expected message!');
    }
  }

  // 9. Deletion Protection: Cannot delete employee with active/historical assignments
  console.log('\n--- 9. HARD DELETE PROTECTION ---');
  const rejectDeleteEmpRes = await (
    await fetch(`http://localhost:5000/api/employees/${testEmp.id}`, {
      method: 'DELETE',
      headers,
    })
  ).json();
  console.log(`✓ 9.1: Hard delete of employee with asset dependencies blocked: ${rejectDeleteEmpRes.success === false} (Message: "${rejectDeleteEmpRes.message}")`);
  if (rejectDeleteEmpRes.success !== false) throw new Error('Employee with dependencies should not be deletable!');

  // Clean up: Process return for the assigned asset so DB remains clean
  console.log('\n--- 10. CLEANUP & RESTORATION ---');
  const returnRes = await (
    await fetch('http://localhost:5000/api/returns', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        assetId: availableAsset.id,
        returnDate: new Date().toISOString().slice(0, 10),
        conditionAtReturn: 'GOOD',
        reason: 'Master data test teardown asset recovery',
      }),
    })
  ).json();
  console.log(`✓ 10.1: Returned asset back to stock: ${returnRes.success}`);

  console.log('\n================================================================');
  console.log('ALL STEP 7 MASTER DATA VERIFICATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================');
  await prisma.$disconnect();
}

runStep7Verification().catch(async (e) => {
  console.error('VERIFICATION FAILED:', e);
  await prisma.$disconnect();
  process.exit(1);
});
