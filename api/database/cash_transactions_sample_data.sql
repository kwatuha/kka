-- ============================================
-- CASH TRANSACTIONS SAMPLE DATA
-- ============================================
-- This script creates sample data for cash transactions

-- Get user IDs for handledBy
SET @user1 = (SELECT userId FROM users LIMIT 1 OFFSET 0);
SET @user2 = (SELECT userId FROM users LIMIT 1 OFFSET 1);
SET @user3 = (SELECT userId FROM users LIMIT 1 OFFSET 2);

-- Create sample cash transactions
INSERT IGNORE INTO cash_transactions (
    transactionNumber, transactionDate, transactionType, amount, 
    referenceNumber, referenceType, cashRegister, handledBy, notes, createdAt
)
VALUES
    -- Receipts (Income)
    ('CASH-20250420-0001', DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'receipt', 25000.00, 
     'INV-2023-1001', 'invoice', 'Main Cash Register', @user1, 
     'Payment from patient John Imbayi', DATE_SUB(CURDATE(), INTERVAL 5 DAY)),
    
    ('CASH-20250419-0001', DATE_SUB(CURDATE(), INTERVAL 6 DAY), 'receipt', 18000.00, 
     'INV-2023-1005', 'invoice', 'Main Cash Register', @user1, 
     'Payment from patient David Kimutai', DATE_SUB(CURDATE(), INTERVAL 6 DAY)),
    
    ('CASH-20250418-0001', DATE_SUB(CURDATE(), INTERVAL 7 DAY), 'receipt', 350000.00, 
     'CLM-2023-0078', 'claim', 'Insurance Counter', @user2, 
     'Payment from SHA', DATE_SUB(CURDATE(), INTERVAL 7 DAY)),
    
    ('CASH-20250417-0001', DATE_SUB(CURDATE(), INTERVAL 8 DAY), 'receipt', 45000.00, 
     'INV-2023-1008', 'invoice', 'Main Cash Register', @user1, 
     'Payment from patient Sarah Wanjiku', DATE_SUB(CURDATE(), INTERVAL 8 DAY)),
    
    ('CASH-20250416-0001', DATE_SUB(CURDATE(), INTERVAL 9 DAY), 'receipt', 120000.00, 
     'INV-2023-1010', 'invoice', 'Pharmacy Counter', @user3, 
     'Payment for medication', DATE_SUB(CURDATE(), INTERVAL 9 DAY)),
    
    ('CASH-20250415-0001', DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'receipt', 28000.00, 
     'INV-2023-1012', 'invoice', 'Main Cash Register', @user1, 
     'Payment from patient Peter Otieno', DATE_SUB(CURDATE(), INTERVAL 10 DAY)),
    
    ('CASH-20250414-0001', DATE_SUB(CURDATE(), INTERVAL 11 DAY), 'receipt', 150000.00, 
     'CLM-2023-0080', 'claim', 'Insurance Counter', @user2, 
     'Payment from AAR Insurance', DATE_SUB(CURDATE(), INTERVAL 11 DAY)),
    
    ('CASH-20250413-0001', DATE_SUB(CURDATE(), INTERVAL 12 DAY), 'receipt', 32000.00, 
     'INV-2023-1015', 'invoice', 'Main Cash Register', @user1, 
     'Payment from patient Mary Wambui', DATE_SUB(CURDATE(), INTERVAL 12 DAY)),
    
    -- Payments (Expenses)
    ('CASH-20250412-0001', DATE_SUB(CURDATE(), INTERVAL 13 DAY), 'payment', 150000.00, 
     'PO-2023-0045', 'purchase_order', 'Accounts Payable', @user2, 
     'Payment to Medical Supplies Ltd', DATE_SUB(CURDATE(), INTERVAL 13 DAY)),
    
    ('CASH-20250411-0001', DATE_SUB(CURDATE(), INTERVAL 14 DAY), 'payment', 800000.00, 
     'PAY-2023-0004', 'payroll', 'Payroll Account', @user2, 
     'Staff salaries for April 2023', DATE_SUB(CURDATE(), INTERVAL 14 DAY)),
    
    ('CASH-20250410-0001', DATE_SUB(CURDATE(), INTERVAL 15 DAY), 'payment', 120000.00, 
     'PO-2023-0046', 'purchase_order', 'Accounts Payable', @user2, 
     'Payment to Lab Supplies Co', DATE_SUB(CURDATE(), INTERVAL 15 DAY)),
    
    ('CASH-20250409-0001', DATE_SUB(CURDATE(), INTERVAL 16 DAY), 'payment', 45000.00, 
     'UTL-2023-0012', 'utility', 'Accounts Payable', @user2, 
     'Electricity bill payment', DATE_SUB(CURDATE(), INTERVAL 16 DAY)),
    
    ('CASH-20250408-0001', DATE_SUB(CURDATE(), INTERVAL 17 DAY), 'payment', 35000.00, 
     'UTL-2023-0013', 'utility', 'Accounts Payable', @user2, 
     'Water bill payment', DATE_SUB(CURDATE(), INTERVAL 17 DAY)),
    
    ('CASH-20250407-0001', DATE_SUB(CURDATE(), INTERVAL 18 DAY), 'payment', 250000.00, 
     'PO-2023-0047', 'purchase_order', 'Accounts Payable', @user2, 
     'Payment to Pharmacy Wholesalers', DATE_SUB(CURDATE(), INTERVAL 18 DAY)),
    
    -- Transfers
    ('CASH-20250406-0001', DATE_SUB(CURDATE(), INTERVAL 19 DAY), 'transfer', 500000.00, 
     'TRF-2023-0001', 'transfer', 'Main Account', @user2, 
     'Transfer to Investment Account', DATE_SUB(CURDATE(), INTERVAL 19 DAY)),
    
    ('CASH-20250405-0001', DATE_SUB(CURDATE(), INTERVAL 20 DAY), 'transfer', 200000.00, 
     'TRF-2023-0002', 'transfer', 'Main Account', @user2, 
     'Transfer to Payroll Account', DATE_SUB(CURDATE(), INTERVAL 20 DAY)),
    
    -- Adjustments
    ('CASH-20250404-0001', DATE_SUB(CURDATE(), INTERVAL 21 DAY), 'adjustment', -5000.00, 
     'ADJ-2023-0001', 'adjustment', 'Main Cash Register', @user2, 
     'Cash shortage adjustment', DATE_SUB(CURDATE(), INTERVAL 21 DAY)),
    
    ('CASH-20250403-0001', DATE_SUB(CURDATE(), INTERVAL 22 DAY), 'adjustment', 3000.00, 
     'ADJ-2023-0002', 'adjustment', 'Pharmacy Counter', @user3, 
     'Cash overage adjustment', DATE_SUB(CURDATE(), INTERVAL 22 DAY)),
    
    -- More recent transactions
    ('CASH-20250421-0001', DATE_SUB(CURDATE(), INTERVAL 4 DAY), 'receipt', 55000.00, 
     'INV-2023-1020', 'invoice', 'Main Cash Register', @user1, 
     'Payment from patient James Kariuki', DATE_SUB(CURDATE(), INTERVAL 4 DAY)),
    
    ('CASH-20250422-0001', DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'receipt', 42000.00, 
     'INV-2023-1022', 'invoice', 'Main Cash Register', @user1, 
     'Payment from patient Grace Nyambura', DATE_SUB(CURDATE(), INTERVAL 3 DAY)),
    
    ('CASH-20250423-0001', DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'payment', 95000.00, 
     'PO-2023-0048', 'purchase_order', 'Accounts Payable', @user2, 
     'Payment to Medical Equipment Ltd', DATE_SUB(CURDATE(), INTERVAL 2 DAY)),
    
    ('CASH-20250424-0001', DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'receipt', 38000.00, 
     'INV-2023-1025', 'invoice', 'Main Cash Register', @user1, 
     'Payment from patient Michael Ochieng', DATE_SUB(CURDATE(), INTERVAL 1 DAY)),
    
    ('CASH-20250425-0001', CURDATE(), 'receipt', 67000.00, 
     'INV-2023-1028', 'invoice', 'Main Cash Register', @user1, 
     'Payment from patient Lucy Akinyi', CURDATE());

-- Verify the data
SELECT 
    transactionType,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM cash_transactions
GROUP BY transactionType
ORDER BY transactionType;

SELECT 
    DATE_FORMAT(transactionDate, '%Y-%m') as month,
    transactionType,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM cash_transactions
GROUP BY DATE_FORMAT(transactionDate, '%Y-%m'), transactionType
ORDER BY month DESC, transactionType;

