-- ============================================
-- INSURANCE SAMPLE DATA
-- ============================================
-- This script creates sample data for insurance providers and patient insurance policies

-- Insert Insurance Providers
INSERT IGNORE INTO insurance_providers (
    providerCode, providerName, contactPerson, phone, email, address, claimsAddress, website, isActive, notes, createdAt
)
VALUES
    ('INS-0001', 'Social Health Authority (SHA)', 'John Mwangi', '+254 20 2720100', 
     'info@sha.or.ke', 'SHA Building, Ragati Road, Upper Hill, Nairobi', 'SHA Claims Department, P.O. Box 30443, Nairobi', 
     'https://www.sha.or.ke', TRUE, 'National health insurance provider', '2020-01-15 10:00:00'),
    
    ('INS-0002', 'AAR Insurance Kenya Limited', 'Sarah Wanjiku', '+254 20 2894000',
     'info@aar.co.ke', 'AAR Centre, Muthangari Drive, Westlands, Nairobi', 'AAR Claims Office, Westlands', 
     'https://www.aar.co.ke', TRUE, 'Private health insurance provider', '2020-02-10 09:00:00'),
    
    ('INS-0003', 'Jubilee Insurance', 'Michael Otieno', '+254 20 3287000',
     'info@jubileekenya.com', 'Jubilee Insurance House, Wabera Street, Nairobi', 'Jubilee Claims Department, Wabera Street', 
     'https://www.jubileekenya.com', TRUE, 'Comprehensive health insurance coverage', '2020-03-05 11:00:00'),
    
    ('INS-0004', 'UAP Insurance', 'Grace Akinyi', '+254 20 2858000',
     'info@uapoldmutual.com', 'UAP Tower, Upper Hill, Nairobi', 'UAP Claims Office, Upper Hill', 
     'https://www.uapoldmutual.com', TRUE, 'Health and medical insurance solutions', '2020-04-12 14:00:00'),
    
    ('INS-0005', 'Britam Health Insurance', 'David Kimani', '+254 20 2227000',
     'info@britam.com', 'Britam Centre, Upper Hill, Nairobi', 'Britam Claims Department, Upper Hill', 
     'https://www.britam.com', TRUE, 'Medical insurance and health plans', '2020-05-20 10:30:00'),
    
    ('INS-0006', 'APA Insurance', 'Lucy Wambui', '+254 20 3647000',
     'info@apainsurance.org', 'APA House, Waiyaki Way, Westlands, Nairobi', 'APA Claims Office, Westlands', 
     'https://www.apainsurance.org', TRUE, 'Health insurance provider', '2020-06-15 08:00:00'),
    
    ('INS-0007', 'CIC Insurance Group', 'Peter Ochieng', '+254 20 2888000',
     'info@cic.co.ke', 'CIC Plaza, Mara Road, Upper Hill, Nairobi', 'CIC Claims Department, Upper Hill', 
     'https://www.cic.co.ke', TRUE, 'Medical insurance coverage', '2020-07-10 12:00:00'),
    
    ('INS-0008', 'Sanlam Insurance', 'Mary Njeri', '+254 20 2895000',
     'info@sanlam.co.ke', 'Sanlam Centre, Wabera Street, Nairobi', 'Sanlam Claims Office, Wabera Street', 
     'https://www.sanlam.co.ke', TRUE, 'Health and life insurance', '2020-08-18 09:30:00');

-- Get sample patients and providers for policies
SET @patient1 = (SELECT patientId FROM patients LIMIT 1 OFFSET 0);
SET @patient2 = (SELECT patientId FROM patients LIMIT 1 OFFSET 1);
SET @patient3 = (SELECT patientId FROM patients LIMIT 1 OFFSET 2);
SET @patient4 = (SELECT patientId FROM patients LIMIT 1 OFFSET 3);
SET @patient5 = (SELECT patientId FROM patients LIMIT 1 OFFSET 4);
SET @patient6 = (SELECT patientId FROM patients LIMIT 1 OFFSET 5);
SET @patient7 = (SELECT patientId FROM patients LIMIT 1 OFFSET 6);
SET @patient8 = (SELECT patientId FROM patients LIMIT 1 OFFSET 7);
SET @patient9 = (SELECT patientId FROM patients LIMIT 1 OFFSET 8);
SET @patient10 = (SELECT patientId FROM patients LIMIT 1 OFFSET 9);

SET @provider1 = (SELECT providerId FROM insurance_providers WHERE providerCode = 'INS-0001');
SET @provider2 = (SELECT providerId FROM insurance_providers WHERE providerCode = 'INS-0002');
SET @provider3 = (SELECT providerId FROM insurance_providers WHERE providerCode = 'INS-0003');
SET @provider4 = (SELECT providerId FROM insurance_providers WHERE providerCode = 'INS-0004');
SET @provider5 = (SELECT providerId FROM insurance_providers WHERE providerCode = 'INS-0005');

-- Insert Patient Insurance Policies
INSERT IGNORE INTO patient_insurance (
    patientId, providerId, policyNumber, memberId, memberName, relationship,
    coverageStartDate, coverageEndDate, isActive, notes, createdAt
)
VALUES
    -- SHA Policies
    (@patient1, @provider1, 'SHA-2023-001234', 'SHA-001234', NULL, 'self',
     DATE_SUB(CURDATE(), INTERVAL 12 MONTH), DATE_ADD(CURDATE(), INTERVAL 12 MONTH), TRUE,
     'Active SHA coverage', DATE_SUB(CURDATE(), INTERVAL 12 MONTH)),
    
    (@patient2, @provider1, 'SHA-2022-005678', 'SHA-005678', NULL, 'self',
     DATE_SUB(CURDATE(), INTERVAL 18 MONTH), DATE_ADD(CURDATE(), INTERVAL 6 MONTH), TRUE,
     'Family SHA coverage', DATE_SUB(CURDATE(), INTERVAL 18 MONTH)),
    
    (@patient3, @provider1, 'SHA-2024-001122', 'SHA-001122', NULL, 'self',
     DATE_SUB(CURDATE(), INTERVAL 6 MONTH), DATE_ADD(CURDATE(), INTERVAL 18 MONTH), TRUE,
     'Recent SHA registration', DATE_SUB(CURDATE(), INTERVAL 6 MONTH)),
    
    -- AAR Insurance Policies
    (@patient4, @provider2, 'AAR-2023-POL-7890', 'AAR-7890', 'Jane Doe', 'self',
     DATE_SUB(CURDATE(), INTERVAL 15 MONTH), DATE_ADD(CURDATE(), INTERVAL 9 MONTH), TRUE,
     'Premium AAR coverage', DATE_SUB(CURDATE(), INTERVAL 15 MONTH)),
    
    (@patient5, @provider2, 'AAR-2022-FAM-3456', 'AAR-3456', 'John Smith', 'self',
     DATE_SUB(CURDATE(), INTERVAL 24 MONTH), DATE_ADD(CURDATE(), INTERVAL 12 MONTH), TRUE,
     'Family health plan', DATE_SUB(CURDATE(), INTERVAL 24 MONTH)),
    
    -- Jubilee Insurance Policies
    (@patient6, @provider3, 'JUB-2023-HEA-4567', 'JUB-4567', NULL, 'self',
     DATE_SUB(CURDATE(), INTERVAL 10 MONTH), DATE_ADD(CURDATE(), INTERVAL 14 MONTH), TRUE,
     'Standard health coverage', DATE_SUB(CURDATE(), INTERVAL 10 MONTH)),
    
    (@patient7, @provider3, 'JUB-2024-CORP-8901', 'JUB-8901', 'Corporate Account', 'self',
     DATE_SUB(CURDATE(), INTERVAL 3 MONTH), DATE_ADD(CURDATE(), INTERVAL 21 MONTH), TRUE,
     'Corporate group insurance', DATE_SUB(CURDATE(), INTERVAL 3 MONTH)),
    
    -- UAP Insurance Policies
    (@patient8, @provider4, 'UAP-2022-MED-5678', 'UAP-5678', 'Mary Johnson', 'self',
     DATE_SUB(CURDATE(), INTERVAL 20 MONTH), DATE_SUB(CURDATE(), INTERVAL 2 MONTH), FALSE,
     'Expired policy - needs renewal', DATE_SUB(CURDATE(), INTERVAL 20 MONTH)),
    
    (@patient8, @provider4, 'UAP-2024-MED-5679', 'UAP-5679', 'Mary Johnson', 'self',
     DATE_SUB(CURDATE(), INTERVAL 1 MONTH), DATE_ADD(CURDATE(), INTERVAL 23 MONTH), TRUE,
     'Renewed policy', DATE_SUB(CURDATE(), INTERVAL 1 MONTH)),
    
    -- Britam Insurance Policies
    (@patient9, @provider5, 'BRT-2023-FAM-2345', 'BRT-2345', 'David Williams', 'self',
     DATE_SUB(CURDATE(), INTERVAL 12 MONTH), DATE_ADD(CURDATE(), INTERVAL 12 MONTH), TRUE,
     'Family health plan with dental', DATE_SUB(CURDATE(), INTERVAL 12 MONTH)),
    
    (@patient10, @provider5, 'BRT-2024-IND-6789', 'BRT-6789', NULL, 'self',
     DATE_SUB(CURDATE(), INTERVAL 4 MONTH), DATE_ADD(CURDATE(), INTERVAL 20 MONTH), TRUE,
     'Individual premium plan', DATE_SUB(CURDATE(), INTERVAL 4 MONTH)),
    
    -- Additional policies
    (@patient1, @provider3, 'JUB-2024-ADD-1111', 'JUB-1111', NULL, 'self',
     DATE_SUB(CURDATE(), INTERVAL 2 MONTH), DATE_ADD(CURDATE(), INTERVAL 22 MONTH), TRUE,
     'Additional coverage policy', DATE_SUB(CURDATE(), INTERVAL 2 MONTH)),
    
    (@patient2, @provider4, 'UAP-2023-FAM-2222', 'UAP-2222', NULL, 'self',
     DATE_SUB(CURDATE(), INTERVAL 14 MONTH), DATE_ADD(CURDATE(), INTERVAL 10 MONTH), TRUE,
     'Family coverage policy', DATE_SUB(CURDATE(), INTERVAL 14 MONTH));

-- Verify the data
SELECT 
    ip.providerName,
    COUNT(pi.patientInsuranceId) as total_policies,
    COUNT(CASE WHEN pi.isActive = 1 AND (pi.coverageEndDate IS NULL OR pi.coverageEndDate >= CURDATE()) THEN 1 END) as active_policies
FROM insurance_providers ip
LEFT JOIN patient_insurance pi ON ip.providerId = pi.providerId
GROUP BY ip.providerId, ip.providerName
ORDER BY ip.providerName;

SELECT 
    relationship,
    COUNT(*) as count,
    COUNT(CASE WHEN isActive = 1 AND (coverageEndDate IS NULL OR coverageEndDate >= CURDATE()) THEN 1 END) as active_count
FROM patient_insurance
GROUP BY relationship
ORDER BY relationship;
