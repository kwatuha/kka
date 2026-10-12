-- ============================================
-- HOSPITAL CHART OF ACCOUNTS
-- ============================================
-- Comprehensive, standardized Chart of Accounts for hospital financial management
-- Supports: Financial statements, Department reporting, Insurance tracking,
--           Donor/Government funding, Cost center accounting
--
-- Account Code Structure:
--   1000-1999: Assets
--   2000-2999: Liabilities
--   3000-3999: Equity
--   4000-4999: Revenue (by department)
--   5000-5999: Expenses (by department/cost center)
-- ============================================

-- Clear existing accounts (optional - comment out if you want to keep existing)
-- DELETE FROM accounts WHERE accountCode LIKE '1%' OR accountCode LIKE '2%' OR accountCode LIKE '3%' OR accountCode LIKE '4%' OR accountCode LIKE '5%';

-- ============================================
-- ASSETS (1000-1999)
-- ============================================

-- Current Assets (1000-1099)
INSERT IGNORE INTO accounts (accountCode, accountName, accountType, description) VALUES
('1000', 'CURRENT ASSETS', 'Asset', 'All current assets'),
('1010', 'Cash and Cash Equivalents', 'Asset', 'Cash on hand and in bank accounts'),
('1011', 'Petty Cash', 'Asset', 'Petty cash fund'),
('1012', 'Cash - Main Bank Account', 'Asset', 'Primary operating bank account'),
('1013', 'Cash - Payroll Account', 'Asset', 'Dedicated payroll bank account'),
('1014', 'Cash - Donor Funds Account', 'Asset', 'Separate account for donor funding'),
('1015', 'Cash - Insurance Account', 'Asset', 'Account for insurance receivables'),
('1020', 'Accounts Receivable', 'Asset', 'Amounts owed by patients and others'),
('1021', 'Patient Accounts Receivable', 'Asset', 'Outstanding patient balances'),
('1022', 'Insurance Receivable', 'Asset', 'Amounts due from insurance companies'),
('1023', 'Government Receivable', 'Asset', 'Amounts due from government/NHIF'),
('1024', 'Donor Receivable', 'Asset', 'Amounts due from donors'),
('1025', 'Other Receivables', 'Asset', 'Other receivables not classified above'),
('1030', 'Prepaid Expenses', 'Asset', 'Prepaid insurance, rent, supplies'),
('1031', 'Prepaid Insurance', 'Asset', 'Prepaid insurance premiums'),
('1032', 'Prepaid Rent', 'Asset', 'Prepaid facility rent'),
('1033', 'Prepaid Supplies', 'Asset', 'Prepaid medical and office supplies'),
('1040', 'Inventory', 'Asset', 'Medical supplies and pharmaceutical inventory'),
('1041', 'Pharmacy Inventory', 'Asset', 'Pharmaceutical drugs and medications'),
('1042', 'Medical Supplies Inventory', 'Asset', 'Medical equipment and supplies'),
('1043', 'Laboratory Supplies Inventory', 'Asset', 'Lab reagents and supplies'),
('1044', 'Radiology Supplies Inventory', 'Asset', 'Radiology consumables'),
('1045', 'General Supplies Inventory', 'Asset', 'Office and general supplies'),
('1050', 'Short-term Investments', 'Asset', 'Short-term marketable securities');

-- Fixed Assets (1100-1199)
INSERT IGNORE INTO accounts (accountCode, accountName, accountType, description) VALUES
('1100', 'FIXED ASSETS', 'Asset', 'All fixed assets'),
('1110', 'Land', 'Asset', 'Hospital land and property'),
('1120', 'Buildings', 'Asset', 'Hospital buildings and structures'),
('1121', 'Building - Main Hospital', 'Asset', 'Main hospital building'),
('1122', 'Building - Outpatient Department', 'Asset', 'OPD building'),
('1123', 'Building - Inpatient Wards', 'Asset', 'Inpatient ward buildings'),
('1124', 'Building - Theatre Complex', 'Asset', 'Operating theatre building'),
('1125', 'Building - Laboratory', 'Asset', 'Laboratory building'),
('1126', 'Building - Radiology', 'Asset', 'Radiology department building'),
('1127', 'Building - Pharmacy', 'Asset', 'Pharmacy building'),
('1128', 'Building - Administration', 'Asset', 'Administrative offices'),
('1130', 'Medical Equipment', 'Asset', 'Medical and diagnostic equipment'),
('1131', 'Equipment - Laboratory', 'Asset', 'Laboratory equipment'),
('1132', 'Equipment - Radiology', 'Asset', 'X-ray, CT, MRI, Ultrasound equipment'),
('1133', 'Equipment - Theatre', 'Asset', 'Operating theatre equipment'),
('1134', 'Equipment - ICU', 'Asset', 'ICU equipment and monitors'),
('1135', 'Equipment - Maternity', 'Asset', 'Maternity and delivery equipment'),
('1136', 'Equipment - General Medical', 'Asset', 'General medical equipment'),
('1140', 'Furniture and Fixtures', 'Asset', 'Office furniture and fixtures'),
('1150', 'Vehicles', 'Asset', 'Hospital vehicles and ambulances'),
('1151', 'Ambulances', 'Asset', 'Ambulance fleet'),
('1152', 'Administrative Vehicles', 'Asset', 'Administrative and support vehicles'),
('1160', 'Computer Equipment', 'Asset', 'IT equipment and systems'),
('1170', 'Accumulated Depreciation', 'Asset', 'Total accumulated depreciation (contra account)'),
('1171', 'Accumulated Depreciation - Buildings', 'Asset', 'Depreciation on buildings'),
('1172', 'Accumulated Depreciation - Equipment', 'Asset', 'Depreciation on equipment'),
('1173', 'Accumulated Depreciation - Vehicles', 'Asset', 'Depreciation on vehicles'),
('1174', 'Accumulated Depreciation - Furniture', 'Asset', 'Depreciation on furniture'),

-- Other Assets (1200-1299)
('1200', 'OTHER ASSETS', 'Asset', 'Other non-current assets'),
('1210', 'Long-term Investments', 'Asset', 'Long-term investment securities'),
('1220', 'Intangible Assets', 'Asset', 'Goodwill, licenses, software'),
('1230', 'Deposits and Prepayments', 'Asset', 'Long-term deposits and prepayments');

-- ============================================
-- LIABILITIES (2000-2999)
-- ============================================

-- Current Liabilities (2000-2099)
INSERT IGNORE INTO accounts (accountCode, accountName, accountType, description) VALUES
('2000', 'CURRENT LIABILITIES', 'Liability', 'All current liabilities'),
('2010', 'Accounts Payable', 'Liability', 'Amounts owed to suppliers and vendors'),
('2011', 'Pharmacy Suppliers Payable', 'Liability', 'Payables to pharmaceutical suppliers'),
('2012', 'Medical Supplies Payable', 'Liability', 'Payables to medical supply vendors'),
('2013', 'Equipment Suppliers Payable', 'Liability', 'Payables to equipment vendors'),
('2014', 'Service Providers Payable', 'Liability', 'Payables to service providers'),
('2020', 'Accrued Expenses', 'Liability', 'Accrued but unpaid expenses'),
('2021', 'Accrued Salaries', 'Liability', 'Accrued employee salaries'),
('2022', 'Accrued Utilities', 'Liability', 'Accrued utility bills'),
('2023', 'Accrued Professional Fees', 'Liability', 'Accrued doctor and consultant fees'),
('2030', 'Short-term Loans', 'Liability', 'Short-term bank loans and credit'),
('2040', 'Current Portion of Long-term Debt', 'Liability', 'Current portion of long-term loans'),
('2050', 'Unearned Revenue', 'Liability', 'Advance payments received'),
('2051', 'Prepaid Patient Services', 'Liability', 'Advance payments from patients'),
('2052', 'Prepaid Insurance Revenue', 'Liability', 'Advance payments from insurance'),
('2060', 'Payroll Liabilities', 'Liability', 'Payroll taxes and deductions'),
('2061', 'PAYE Payable', 'Liability', 'Pay As You Earn tax payable'),
('2062', 'NSSF Payable', 'Liability', 'National Social Security Fund'),
('2063', 'NHIF Payable', 'Liability', 'National Hospital Insurance Fund'),
('2070', 'Insurance Payable', 'Liability', 'Insurance premiums payable');

-- Long-term Liabilities (2100-2199)
INSERT IGNORE INTO accounts (accountCode, accountName, accountType, description) VALUES
('2100', 'LONG-TERM LIABILITIES', 'Liability', 'All long-term liabilities'),
('2110', 'Long-term Loans', 'Liability', 'Long-term bank loans'),
('2111', 'Mortgage Payable', 'Liability', 'Mortgage on hospital property'),
('2112', 'Equipment Financing', 'Liability', 'Equipment financing loans'),
('2120', 'Bonds Payable', 'Liability', 'Hospital bonds and debentures');

-- ============================================
-- EQUITY (3000-3999)
-- ============================================

INSERT IGNORE INTO accounts (accountCode, accountName, accountType, description) VALUES
('3000', 'EQUITY', 'Equity', 'All equity accounts'),
('3100', 'Share Capital', 'Equity', 'Owner/shareholder capital'),
('3200', 'Retained Earnings', 'Equity', 'Accumulated retained earnings'),
('3300', 'Donor Equity', 'Equity', 'Equity from donor contributions'),
('3400', 'Government Equity', 'Equity', 'Equity from government funding'),
('3500', 'Revaluation Reserve', 'Equity', 'Asset revaluation reserves'),
('3600', 'Current Year Surplus/Deficit', 'Equity', 'Current year profit or loss');

-- ============================================
-- REVENUE (4000-4999) - By Department
-- ============================================

-- Outpatient Department Revenue (4000-4099)
INSERT IGNORE INTO accounts (accountCode, accountName, accountType, description) VALUES
('4000', 'REVENUE', 'Revenue', 'All revenue accounts'),
('4010', 'OPD Revenue', 'Revenue', 'Outpatient Department revenue'),
('4011', 'OPD Consultation Fees', 'Revenue', 'OPD consultation charges'),
('4012', 'OPD Procedure Fees', 'Revenue', 'OPD procedure charges'),
('4013', 'OPD Laboratory Revenue', 'Revenue', 'Lab tests performed in OPD'),
('4014', 'OPD Radiology Revenue', 'Revenue', 'Radiology services in OPD'),
('4015', 'OPD Pharmacy Revenue', 'Revenue', 'Pharmacy sales in OPD'),

-- Inpatient Department Revenue (4100-4199)
('4100', 'IPD Revenue', 'Revenue', 'Inpatient Department revenue'),
('4101', 'IPD Bed Charges', 'Revenue', 'Inpatient bed and accommodation charges'),
('4102', 'IPD Consultation Fees', 'Revenue', 'Inpatient consultation charges'),
('4103', 'IPD Procedure Fees', 'Revenue', 'Inpatient procedure charges'),
('4104', 'IPD Laboratory Revenue', 'Revenue', 'Lab tests for inpatients'),
('4105', 'IPD Radiology Revenue', 'Revenue', 'Radiology services for inpatients'),
('4106', 'IPD Pharmacy Revenue', 'Revenue', 'Pharmacy sales for inpatients'),
('4107', 'IPD Theatre Revenue', 'Revenue', 'Operating theatre charges for inpatients'),

-- Theatre/Operating Room Revenue (4200-4299)
('4200', 'Theatre Revenue', 'Revenue', 'Operating theatre revenue'),
('4201', 'Theatre Procedure Fees', 'Revenue', 'Surgical procedure fees'),
('4202', 'Theatre Anesthesia Fees', 'Revenue', 'Anesthesia charges'),
('4203', 'Theatre Equipment Usage', 'Revenue', 'Theatre equipment usage charges'),

-- Laboratory Revenue (4300-4399)
('4300', 'Laboratory Revenue', 'Revenue', 'Laboratory department revenue'),
('4301', 'Lab Test Fees', 'Revenue', 'Laboratory test charges'),
('4302', 'Lab Consultation Fees', 'Revenue', 'Laboratory consultation fees'),
('4303', 'Lab Sample Collection Fees', 'Revenue', 'Sample collection charges'),

-- Radiology Revenue (4400-4499)
('4400', 'Radiology Revenue', 'Revenue', 'Radiology department revenue'),
('4401', 'X-ray Fees', 'Revenue', 'X-ray examination charges'),
('4402', 'Ultrasound Fees', 'Revenue', 'Ultrasound examination charges'),
('4403', 'CT Scan Fees', 'Revenue', 'CT scan charges'),
('4404', 'MRI Fees', 'Revenue', 'MRI examination charges'),
('4405', 'Radiology Consultation Fees', 'Revenue', 'Radiology consultation charges'),

-- Pharmacy Revenue (4500-4599)
('4500', 'Pharmacy Revenue', 'Revenue', 'Pharmacy department revenue'),
('4501', 'Pharmacy Drug Sales', 'Revenue', 'Pharmaceutical drug sales'),
('4502', 'Pharmacy Consultation Fees', 'Revenue', 'Pharmacy consultation charges'),

-- Maternity Revenue (4600-4699)
('4600', 'Maternity Revenue', 'Revenue', 'Maternity department revenue'),
('4601', 'Antenatal Care Fees', 'Revenue', 'Antenatal care charges'),
('4602', 'Delivery Fees', 'Revenue', 'Delivery and birthing charges'),
('4603', 'Postnatal Care Fees', 'Revenue', 'Postnatal care charges'),
('4604', 'Maternity Consultation Fees', 'Revenue', 'Maternity consultation charges'),

-- ICU Revenue (4700-4799)
('4700', 'ICU Revenue', 'Revenue', 'Intensive Care Unit revenue'),
('4701', 'ICU Bed Charges', 'Revenue', 'ICU bed and accommodation charges'),
('4702', 'ICU Procedure Fees', 'Revenue', 'ICU procedure charges'),
('4703', 'ICU Equipment Usage', 'Revenue', 'ICU equipment usage charges'),

-- Other Revenue (4800-4899)
('4800', 'Other Revenue', 'Revenue', 'Other revenue sources'),
('4801', 'Ambulance Services Revenue', 'Revenue', 'Ambulance service charges'),
('4802', 'Mortuary Services Revenue', 'Revenue', 'Mortuary service charges'),
('4803', 'Cafeteria Revenue', 'Revenue', 'Cafeteria and food service revenue'),
('4804', 'Parking Revenue', 'Revenue', 'Parking fees'),
('4805', 'Other Service Revenue', 'Revenue', 'Other miscellaneous service revenue'),

-- Insurance and Third-party Revenue (4900-4999)
('4900', 'Insurance Revenue', 'Revenue', 'Revenue from insurance companies'),
('4901', 'NHIF Revenue', 'Revenue', 'National Hospital Insurance Fund revenue'),
('4902', 'Private Insurance Revenue', 'Revenue', 'Private insurance company revenue'),
('4903', 'Government Insurance Revenue', 'Revenue', 'Government insurance revenue'),
('4910', 'Donor Revenue', 'Revenue', 'Revenue from donor funding'),
('4911', 'Donor Grant Revenue', 'Revenue', 'Grant revenue from donors'),
('4912', 'Donor Program Revenue', 'Revenue', 'Program-specific donor revenue'),
('4920', 'Government Revenue', 'Revenue', 'Revenue from government funding'),
('4921', 'Government Grant Revenue', 'Revenue', 'Government grant revenue'),
('4922', 'Government Program Revenue', 'Revenue', 'Government program revenue');

-- ============================================
-- EXPENSES (5000-5999) - By Department/Cost Center
-- ============================================

-- Salaries and Wages (5000-5099)
INSERT IGNORE INTO accounts (accountCode, accountName, accountType, description) VALUES
('5000', 'EXPENSES', 'Expense', 'All expense accounts'),
('5010', 'Salaries and Wages', 'Expense', 'Employee salaries and wages'),
('5011', 'Salaries - Medical Staff', 'Expense', 'Doctor and medical staff salaries'),
('5012', 'Salaries - Nursing Staff', 'Expense', 'Nursing staff salaries'),
('5013', 'Salaries - Laboratory Staff', 'Expense', 'Laboratory staff salaries'),
('5014', 'Salaries - Radiology Staff', 'Expense', 'Radiology staff salaries'),
('5015', 'Salaries - Pharmacy Staff', 'Expense', 'Pharmacy staff salaries'),
('5016', 'Salaries - Administrative Staff', 'Expense', 'Administrative staff salaries'),
('5017', 'Salaries - Support Staff', 'Expense', 'Support and maintenance staff salaries'),
('5020', 'Overtime and Allowances', 'Expense', 'Overtime pay and allowances'),
('5030', 'Employee Benefits', 'Expense', 'Employee benefits and perks'),
('5031', 'Medical Insurance - Staff', 'Expense', 'Staff medical insurance'),
('5032', 'Pension Contributions', 'Expense', 'Employer pension contributions'),
('5033', 'Training and Development', 'Expense', 'Staff training and development costs'),

-- Medical Supplies and Drugs (5100-5199)
('5100', 'Medical Supplies and Drugs', 'Expense', 'Medical supplies and pharmaceutical costs'),
('5101', 'Pharmacy Drugs Expense', 'Expense', 'Cost of pharmaceutical drugs'),
('5102', 'Medical Supplies Expense', 'Expense', 'Cost of medical supplies'),
('5103', 'Laboratory Supplies Expense', 'Expense', 'Cost of laboratory reagents and supplies'),
('5104', 'Radiology Supplies Expense', 'Expense', 'Cost of radiology consumables'),
('5105', 'Theatre Supplies Expense', 'Expense', 'Cost of theatre supplies'),
('5106', 'ICU Supplies Expense', 'Expense', 'Cost of ICU supplies'),
('5107', 'Maternity Supplies Expense', 'Expense', 'Cost of maternity supplies'),

-- Equipment and Maintenance (5200-5299)
('5200', 'Equipment and Maintenance', 'Expense', 'Equipment costs and maintenance'),
('5201', 'Equipment Maintenance', 'Expense', 'Medical equipment maintenance'),
('5202', 'Equipment Repairs', 'Expense', 'Equipment repair costs'),
('5203', 'Equipment Depreciation', 'Expense', 'Equipment depreciation expense'),
('5204', 'Equipment Rental', 'Expense', 'Equipment rental costs'),
('5205', 'Equipment Calibration', 'Expense', 'Equipment calibration costs'),

-- Facility and Utilities (5300-5399)
('5300', 'Facility and Utilities', 'Expense', 'Facility and utility costs'),
('5301', 'Rent Expense', 'Expense', 'Facility rent'),
('5302', 'Electricity Expense', 'Expense', 'Electricity and power costs'),
('5303', 'Water Expense', 'Expense', 'Water and sewerage costs'),
('5304', 'Internet and Communications', 'Expense', 'Internet, phone, and communication costs'),
('5305', 'Facility Maintenance', 'Expense', 'Building and facility maintenance'),
('5306', 'Cleaning Services', 'Expense', 'Cleaning and janitorial services'),
('5307', 'Security Services', 'Expense', 'Security services'),
('5308', 'Waste Management', 'Expense', 'Medical and general waste disposal'),

-- Professional Services (5400-5499)
('5400', 'Professional Services', 'Expense', 'Professional and consulting services'),
('5401', 'Doctor Fees - Consultants', 'Expense', 'Consultant doctor fees'),
('5402', 'Legal Fees', 'Expense', 'Legal and attorney fees'),
('5403', 'Audit Fees', 'Expense', 'Audit and accounting fees'),
('5404', 'Consulting Fees', 'Expense', 'Management and other consulting fees'),
('5405', 'IT Services', 'Expense', 'IT support and services'),

-- Insurance and Risk Management (5500-5599)
('5500', 'Insurance and Risk Management', 'Expense', 'Insurance and risk management costs'),
('5501', 'Medical Malpractice Insurance', 'Expense', 'Medical malpractice insurance'),
('5502', 'Property Insurance', 'Expense', 'Property and equipment insurance'),
('5503', 'General Liability Insurance', 'Expense', 'General liability insurance'),
('5504', 'Vehicle Insurance', 'Expense', 'Vehicle and ambulance insurance'),

-- Administrative Expenses (5600-5699)
('5600', 'Administrative Expenses', 'Expense', 'General administrative costs'),
('5601', 'Office Supplies', 'Expense', 'Office supplies and stationery'),
('5602', 'Printing and Stationery', 'Expense', 'Printing and paper costs'),
('5603', 'Postage and Courier', 'Expense', 'Postage and courier services'),
('5604', 'Bank Charges', 'Expense', 'Bank fees and charges'),
('5605', 'Marketing and Advertising', 'Expense', 'Marketing and advertising costs'),
('5606', 'Travel and Transport', 'Expense', 'Travel and transportation costs'),
('5607', 'Meals and Entertainment', 'Expense', 'Meals and entertainment expenses'),

-- Department-Specific Expenses (5700-5899)
('5700', 'Department Expenses', 'Expense', 'Department-specific expenses'),
('5701', 'OPD Operating Expenses', 'Expense', 'OPD department operating costs'),
('5702', 'IPD Operating Expenses', 'Expense', 'IPD department operating costs'),
('5703', 'Theatre Operating Expenses', 'Expense', 'Theatre department operating costs'),
('5704', 'Laboratory Operating Expenses', 'Expense', 'Laboratory department operating costs'),
('5705', 'Radiology Operating Expenses', 'Expense', 'Radiology department operating costs'),
('5706', 'Pharmacy Operating Expenses', 'Expense', 'Pharmacy department operating costs'),
('5707', 'Maternity Operating Expenses', 'Expense', 'Maternity department operating costs'),
('5708', 'ICU Operating Expenses', 'Expense', 'ICU department operating costs'),

-- Depreciation and Amortization (5800-5899)
('5800', 'Depreciation and Amortization', 'Expense', 'Depreciation and amortization expenses'),
('5801', 'Depreciation - Buildings', 'Expense', 'Building depreciation expense'),
('5802', 'Depreciation - Equipment', 'Expense', 'Equipment depreciation expense'),
('5803', 'Depreciation - Vehicles', 'Expense', 'Vehicle depreciation expense'),
('5804', 'Depreciation - Furniture', 'Expense', 'Furniture depreciation expense'),
('5805', 'Amortization - Intangibles', 'Expense', 'Intangible asset amortization'),

-- Other Expenses (5900-5999)
('5900', 'Other Expenses', 'Expense', 'Other miscellaneous expenses'),
('5901', 'Bad Debts Expense', 'Expense', 'Uncollectible accounts expense'),
('5902', 'Interest Expense', 'Expense', 'Interest on loans and financing'),
('5903', 'Foreign Exchange Loss', 'Expense', 'Foreign exchange losses'),
('5904', 'Donations and Grants Expense', 'Expense', 'Expenses related to donor programs'),
('5905', 'Government Program Expenses', 'Expense', 'Expenses related to government programs'),
('5906', 'Miscellaneous Expenses', 'Expense', 'Other miscellaneous expenses');

-- ============================================
-- NOTES
-- ============================================
-- This Chart of Accounts provides:
-- 1. Complete financial statement support (P&L, Balance Sheet, Cash Flow)
-- 2. Department-level revenue and expense tracking
-- 3. Insurance and third-party revenue tracking
-- 4. Donor and government funding tracking
-- 5. Cost center accounting by department
-- 6. Hierarchical structure for easy reporting
--
-- Account codes follow a logical structure:
--   - First digit: Major category (1=Assets, 2=Liabilities, 3=Equity, 4=Revenue, 5=Expenses)
--   - Second digit: Sub-category
--   - Third and fourth digits: Specific account
--
-- To add new accounts, follow the coding structure and use parentAccountId for sub-accounts.
-- Accounts can be edited or deleted (if no transactions exist) through the General Ledger UI.
-- ============================================
