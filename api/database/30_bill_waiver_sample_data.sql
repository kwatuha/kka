-- ============================================
-- BILL WAIVER SAMPLE DATA
-- ============================================

-- Insert Waiver Types
INSERT IGNORE INTO waiver_types (
    typeCode, typeName, description, responsibility, requiresApproval,
    maxAmount, maxPercentage, requiresReason, isActive, createdBy
) VALUES
-- Hospital responsible waivers
('HOSP_CHARITY', 'Charity Care', 'Hospital provides care for indigent patients', 'hospital', TRUE, 100000.00, 100.00, TRUE, TRUE, 1),
('HOSP_DISCOUNT', 'Hospital Discount', 'Hospital-approved discount for special circumstances', 'hospital', TRUE, 50000.00, 50.00, TRUE, TRUE, 1),
('HOSP_PROMO', 'Promotional Waiver', 'Promotional or marketing waiver', 'hospital', TRUE, 20000.00, 30.00, TRUE, TRUE, 1),
('HOSP_EMERGENCY', 'Emergency Relief', 'Emergency financial relief for patients in crisis', 'hospital', TRUE, NULL, 100.00, TRUE, TRUE, 1),

-- Staff responsible waivers
('STAFF_ERROR', 'Staff Error Compensation', 'Staff member responsible for billing error', 'staff', TRUE, 50000.00, 100.00, TRUE, TRUE, 1),
('STAFF_DISCOUNT', 'Staff Discount', 'Staff member providing personal discount', 'staff', TRUE, 20000.00, 50.00, TRUE, TRUE, 1),
('STAFF_GOODWILL', 'Staff Goodwill', 'Staff member covering bill as goodwill gesture', 'staff', TRUE, 30000.00, 100.00, TRUE, TRUE, 1),

-- External responsible waivers
('EXT_SPONSOR', 'External Sponsor', 'External organization or individual sponsoring patient', 'external', TRUE, NULL, 100.00, TRUE, TRUE, 1),
('EXT_INSURANCE', 'Insurance Exception', 'Special insurance arrangement or exception', 'external', TRUE, NULL, 100.00, TRUE, TRUE, 1),
('EXT_GOVT', 'Government Program', 'Government program covering the bill', 'external', TRUE, NULL, 100.00, TRUE, TRUE, 1);

-- Get some sample invoices and patients for waivers
SET @sample_invoice_1 = (SELECT invoiceId FROM invoices WHERE status IN ('pending', 'partial') ORDER BY invoiceId DESC LIMIT 1 OFFSET 0);
SET @sample_invoice_2 = (SELECT invoiceId FROM invoices WHERE status IN ('pending', 'partial') ORDER BY invoiceId DESC LIMIT 1 OFFSET 1);
SET @sample_invoice_3 = (SELECT invoiceId FROM invoices WHERE status IN ('pending', 'partial') ORDER BY invoiceId DESC LIMIT 1 OFFSET 2);

SET @sample_patient_1 = (SELECT patientId FROM invoices WHERE invoiceId = @sample_invoice_1);
SET @sample_patient_2 = (SELECT patientId FROM invoices WHERE invoiceId = @sample_invoice_2);
SET @sample_patient_3 = (SELECT patientId FROM invoices WHERE invoiceId = @sample_invoice_3);

SET @sample_user_1 = (SELECT userId FROM users WHERE isActive = 1 LIMIT 1);
SET @sample_user_2 = (SELECT userId FROM users WHERE isActive = 1 AND userId != @sample_user_1 LIMIT 1);
SET @sample_user_3 = (SELECT userId FROM users WHERE isActive = 1 AND userId != @sample_user_1 AND userId != @sample_user_2 LIMIT 1);

-- Get waiver type IDs
SET @waiver_type_charity = (SELECT waiverTypeId FROM waiver_types WHERE typeCode = 'HOSP_CHARITY');
SET @waiver_type_staff_error = (SELECT waiverTypeId FROM waiver_types WHERE typeCode = 'STAFF_ERROR');
SET @waiver_type_ext_sponsor = (SELECT waiverTypeId FROM waiver_types WHERE typeCode = 'EXT_SPONSOR');

-- Insert sample bill waivers (only if we have valid data)
INSERT IGNORE INTO bill_waivers (
    waiverNumber, invoiceId, patientId, waiverTypeId, waiverTypeCode, waiverTypeName, responsibility,
    originalAmount, waivedAmount, remainingAmount, waiverPercentage, isFullWaiver,
    reason, justification, status, requestedBy, approvedBy, approvedAt,
    responsibleStaffId, paymentStatus, paymentDueDate, paymentAmount,
    externalPartyName, externalPartyContact, notes, createdBy
)
SELECT
    CONCAT('WAIV-', YEAR(NOW()), '-', LPAD(ROW_NUMBER() OVER (ORDER BY i.invoiceId), 5, '0')) as waiverNumber,
    i.invoiceId,
    i.patientId,
    wt.waiverTypeId,
    wt.typeCode,
    wt.typeName,
    wt.responsibility,
    i.totalAmount as originalAmount,
    CASE
        WHEN wt.typeCode = 'HOSP_CHARITY' THEN i.totalAmount -- Full waiver
        WHEN wt.typeCode = 'STAFF_ERROR' THEN i.totalAmount * 0.5 -- 50% waiver
        ELSE i.totalAmount * 0.3 -- 30% waiver
    END as waivedAmount,
    CASE
        WHEN wt.typeCode = 'HOSP_CHARITY' THEN 0 -- Full waiver
        WHEN wt.typeCode = 'STAFF_ERROR' THEN i.totalAmount * 0.5 -- 50% remaining
        ELSE i.totalAmount * 0.7 -- 70% remaining
    END as remainingAmount,
    CASE
        WHEN wt.typeCode = 'HOSP_CHARITY' THEN 100.00
        WHEN wt.typeCode = 'STAFF_ERROR' THEN 50.00
        ELSE 30.00
    END as waiverPercentage,
    CASE WHEN wt.typeCode = 'HOSP_CHARITY' THEN TRUE ELSE FALSE END as isFullWaiver,
    CASE
        WHEN wt.typeCode = 'HOSP_CHARITY' THEN 'Patient qualifies for charity care program due to financial hardship'
        WHEN wt.typeCode = 'STAFF_ERROR' THEN 'Billing error made by staff member - staff will cover the cost'
        ELSE 'External sponsor covering patient bill'
    END as reason,
    CASE
        WHEN wt.typeCode = 'HOSP_CHARITY' THEN 'Patient meets all criteria for charity care: income below threshold, no insurance, documented financial hardship'
        WHEN wt.typeCode = 'STAFF_ERROR' THEN 'Staff member admitted to error in billing process and agreed to cover costs'
        ELSE 'External organization confirmed sponsorship arrangement'
    END as justification,
    'approved' as status,
    @sample_user_1 as requestedBy,
    @sample_user_1 as approvedBy,
    NOW() as approvedAt,
    CASE WHEN wt.responsibility = 'staff' THEN @sample_user_2 ELSE NULL END as responsibleStaffId,
    CASE WHEN wt.responsibility = 'staff' THEN 'pending' ELSE NULL END as paymentStatus,
    CASE WHEN wt.responsibility = 'staff' THEN DATE_ADD(NOW(), INTERVAL 30 DAY) ELSE NULL END as paymentDueDate,
    CASE WHEN wt.responsibility = 'staff' THEN
        CASE
            WHEN wt.typeCode = 'STAFF_ERROR' THEN i.totalAmount * 0.5
            ELSE i.totalAmount * 0.3
        END
    ELSE NULL END as paymentAmount,
    CASE WHEN wt.responsibility = 'external' THEN 'Community Health Foundation' ELSE NULL END as externalPartyName,
    CASE WHEN wt.responsibility = 'external' THEN 'contact@chf.org' ELSE NULL END as externalPartyContact,
    'Sample waiver for testing purposes' as notes,
    @sample_user_1 as createdBy
FROM invoices i
CROSS JOIN waiver_types wt
WHERE i.invoiceId IN (@sample_invoice_1, @sample_invoice_2, @sample_invoice_3)
  AND wt.typeCode IN ('HOSP_CHARITY', 'STAFF_ERROR', 'EXT_SPONSOR')
  AND i.status IN ('pending', 'partial')
LIMIT 3;

-- Insert approval history for approved waivers
INSERT IGNORE INTO waiver_approval_history (
    waiverId, action, performedBy, previousStatus, newStatus, notes
)
SELECT
    bw.waiverId,
    'requested' as action,
    bw.requestedBy,
    NULL as previousStatus,
    'pending' as newStatus,
    'Waiver request submitted' as notes
FROM bill_waivers bw
WHERE bw.status = 'approved'
LIMIT 3;

INSERT IGNORE INTO waiver_approval_history (
    waiverId, action, performedBy, previousStatus, newStatus, notes
)
SELECT
    bw.waiverId,
    'approved' as action,
    bw.approvedBy,
    'pending' as previousStatus,
    'approved' as newStatus,
    'Waiver approved by administrator' as notes
FROM bill_waivers bw
WHERE bw.status = 'approved' AND bw.approvedBy IS NOT NULL
LIMIT 3;

