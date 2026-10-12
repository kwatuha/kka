# Hospital Chart of Accounts

## Overview

This Chart of Accounts (COA) provides a comprehensive, standardized structure for hospital financial management. It supports:

✅ **Financial Statements** - Complete P&L, Balance Sheet, and Cash Flow reporting
✅ **Department Reporting** - Revenue and expenses tracked by department (Lab, Pharmacy, Radiology, IPD, OPD, Theatre, ICU, Maternity)
✅ **Insurance Tracking** - Separate accounts for NHIF, private insurance, and government insurance
✅ **Donor/Government Funding** - Dedicated accounts for tracking donor grants and government funding
✅ **Cost Center Accounting** - Department-level expense tracking for cost analysis
✅ **Easy System Coding** - Hierarchical account code structure (1000-5999) for automation

## Account Code Structure

```
1000-1999: Assets
  1000-1099: Current Assets (Cash, Receivables, Inventory)
  1100-1199: Fixed Assets (Buildings, Equipment, Vehicles)
  1200-1299: Other Assets

2000-2999: Liabilities
  2000-2099: Current Liabilities (Payables, Accruals)
  2100-2199: Long-term Liabilities (Loans, Bonds)

3000-3999: Equity
  3100-3999: Share Capital, Retained Earnings, Donor/Government Equity

4000-4999: Revenue (by Department)
  4000-4099: OPD Revenue
  4100-4199: IPD Revenue
  4200-4299: Theatre Revenue
  4300-4399: Laboratory Revenue
  4400-4499: Radiology Revenue
  4500-4599: Pharmacy Revenue
  4600-4699: Maternity Revenue
  4700-4799: ICU Revenue
  4800-4899: Other Revenue
  4900-4999: Insurance, Donor, Government Revenue

5000-5999: Expenses (by Department/Cost Center)
  5000-5099: Salaries and Wages
  5100-5199: Medical Supplies and Drugs
  5200-5299: Equipment and Maintenance
  5300-5399: Facility and Utilities
  5400-5499: Professional Services
  5500-5599: Insurance and Risk Management
  5600-5699: Administrative Expenses
  5700-5899: Department Expenses
  5800-5899: Depreciation and Amortization
  5900-5999: Other Expenses
```

## Loading the Chart of Accounts

### Option 1: Using the Script (Recommended)

```bash
# Load the Chart of Accounts
node api/scripts/load-hospital-chart-of-accounts.js

# Preview what would be loaded (dry run)
node api/scripts/load-hospital-chart-of-accounts.js --dry-run

# Clear existing accounts and reload (use with caution)
node api/scripts/load-hospital-chart-of-accounts.js --clear
```

### Option 2: Direct SQL Execution

```bash
# Using MySQL command line
mysql -u root -p kiplombe_hms < api/database/21_hospital_chart_of_accounts.sql

# Or using Docker
docker exec -i kiplombe_db mysql -u root -p kiplombe_hms < api/database/21_hospital_chart_of_accounts.sql
```

## Managing Accounts

### Viewing Accounts

Navigate to: **Financial Management → General Ledger**

The ledger page shows all accounts with:
- Account code and name
- Account type
- Current balance
- Transaction history

### Creating New Accounts

1. Go to **Financial Management → General Ledger**
2. Click **"New Account"** button
3. Fill in:
   - **Account Code**: Follow the coding structure (e.g., 4016 for new OPD revenue account)
   - **Account Name**: Descriptive name
   - **Account Type**: Asset, Liability, Equity, Revenue, or Expense
   - **Parent Account** (optional): Link to a parent account for hierarchy
   - **Description**: Additional details

### Editing Accounts

1. Find the account in the General Ledger
2. Click the **Edit** icon
3. Update the account details
4. Save changes

### Deleting Accounts

**Important**: Accounts can only be deleted if:
- They have **no transactions** (no journal entries)
- They have **no active sub-accounts**

To delete:
1. Find the account in the General Ledger
2. Click the **Delete** icon
3. Confirm deletion

If an account has transactions, you can:
- **Deactivate** it instead (set `isActive = 0`) - it won't appear in new transactions but historical data is preserved
- **Reassign transactions** to another account first

## Department Reporting

The COA structure enables easy department-level reporting:

### Revenue by Department

- **OPD**: Accounts 4010-4015
- **IPD**: Accounts 4100-4107
- **Theatre**: Accounts 4200-4203
- **Laboratory**: Accounts 4300-4303
- **Radiology**: Accounts 4400-4405
- **Pharmacy**: Accounts 4500-4502
- **Maternity**: Accounts 4600-4604
- **ICU**: Accounts 4700-4703

### Expenses by Department

- **Salaries**: Accounts 5010-5033 (by staff type)
- **Supplies**: Accounts 5100-5107 (by department)
- **Operating Expenses**: Accounts 5700-5708 (by department)

## Financial Statements

### Income Statement (P&L)

**Revenue**: All accounts 4000-4999
**Expenses**: All accounts 5000-5999

### Balance Sheet

**Assets**: All accounts 1000-1999
**Liabilities**: All accounts 2000-2999
**Equity**: All accounts 3000-3999

### Cash Flow

**Operating Activities**:
- Cash from operations (Revenue accounts)
- Cash paid for expenses (Expense accounts)

**Investing Activities**:
- Fixed asset purchases (1100-1199)
- Equipment purchases (1130-1136)

**Financing Activities**:
- Loans received/paid (2030, 2110-2112)
- Equity contributions (3100-3600)

## Insurance and Third-Party Tracking

### Insurance Revenue

- **4901**: NHIF Revenue
- **4902**: Private Insurance Revenue
- **4903**: Government Insurance Revenue

### Insurance Receivables

- **1022**: Insurance Receivable (amounts due from insurance)
- **1015**: Cash - Insurance Account (separate bank account)

## Donor and Government Funding

### Donor Funding

- **3300**: Donor Equity
- **4910-4912**: Donor Revenue
- **1024**: Donor Receivable
- **1014**: Cash - Donor Funds Account

### Government Funding

- **3400**: Government Equity
- **4920-4922**: Government Revenue
- **1023**: Government Receivable

## Cost Center Accounting

Each department has dedicated expense accounts for cost analysis:

- **5701**: OPD Operating Expenses
- **5702**: IPD Operating Expenses
- **5703**: Theatre Operating Expenses
- **5704**: Laboratory Operating Expenses
- **5705**: Radiology Operating Expenses
- **5706**: Pharmacy Operating Expenses
- **5707**: Maternity Operating Expenses
- **5708**: ICU Operating Expenses

## Best Practices

1. **Follow the Coding Structure**: When adding new accounts, use the next available code in the appropriate range
2. **Use Parent Accounts**: Link related accounts to parent accounts for hierarchical reporting
3. **Descriptive Names**: Use clear, descriptive account names
4. **Regular Review**: Periodically review accounts to ensure they're still needed
5. **Documentation**: Add descriptions to accounts for clarity

## Customization

The COA can be customized for your specific needs:

- Add department-specific accounts as needed
- Create sub-accounts under existing accounts
- Add cost centers for specific programs or projects
- Modify account codes if needed (ensure consistency)

## Support

For questions or issues:
1. Check the General Ledger UI for account management
2. Review account transactions before deleting
3. Use the Financial Reports page for statement generation
4. Consult with your finance team for account structure decisions
