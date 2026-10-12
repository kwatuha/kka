# Sample Data Guide for Procedures and Orders

## Where Dropdowns Get Data From

### Procedures Dropdown
- **Source**: `procedures` table
- **API Call**: `proceduresApi.getAll()` 
- **Location**: `components/patient-encounter-form.tsx` line 508

### Orders/Consumables Dropdown  
- **Source**: `service_charges` table where `chargeType='Consumable'`
- **API Call**: `serviceChargeApi.getAll(..., 'Consumable')`
- **Location**: `components/patient-encounter-form.tsx` line 509

## Sample Data File

The sample data is in: **`api/database/22_procedures_and_consumables_sample_data.sql`**

This file contains:
- **23 Procedures** (General, Dental, Surgical, Diagnostic, Maternity, Emergency)
- **27 Consumables** (Medical Supplies, Wound Care, Syringes, IV Supplies, etc.)

## Loading Sample Data

### Option 1: Using Docker (Recommended)
```bash
docker exec -i kiplombe_mysql mysql -u root -proot_password kiplombe_hmis < api/database/22_procedures_and_consumables_sample_data.sql
```

### Option 2: Direct MySQL
```bash
mysql -u root -p kiplombe_hmis < api/database/22_procedures_and_consumables_sample_data.sql
```

## Adding More Sample Data

### Adding More Procedures

Edit `api/database/22_procedures_and_consumables_sample_data.sql` and add:

```sql
INSERT INTO procedures (procedureCode, procedureName, category, description, duration, cost, isActive) VALUES
('YOUR-CODE', 'Your Procedure Name', 'Category', 'Description', 30, 5000.00, TRUE);
```

### Adding More Consumables

Edit the same file and add:

```sql
INSERT INTO service_charges (chargeCode, name, category, department, cost, chargeType, unit, description, status) VALUES
('YOUR-CODE', 'Item Name', 'Category', 'Department', 1000.00, 'Consumable', 'per unit', 'Description', 'Active');
```

**Important**: Make sure `chargeType='Consumable'` for items to appear in the Orders dropdown!

## Verifying Data

### Check Procedures Count
```bash
docker exec kiplombe_mysql mysql -u root -proot_password kiplombe_hmis -e "SELECT COUNT(*) FROM procedures;"
```

### Check Consumables Count
```bash
docker exec kiplombe_mysql mysql -u root -proot_password kiplombe_hmis -e "SELECT COUNT(*) FROM service_charges WHERE chargeType='Consumable';"
```

### View All Procedures
```bash
docker exec kiplombe_mysql mysql -u root -proot_password kiplombe_hmis -e "SELECT procedureCode, procedureName, category, cost FROM procedures;"
```

### View All Consumables
```bash
docker exec kiplombe_mysql mysql -u root -proot_password kiplombe_hmis -e "SELECT chargeCode, name, unit, cost FROM service_charges WHERE chargeType='Consumable';"
```

## Current Sample Data

### Procedures Included (23 total)
- General: Consultation, Physical Exam, Vital Signs
- Dental: Extraction, Filling, Cleaning, Root Canal
- Surgical: Minor Surgery, Wound Suturing, Biopsy
- Diagnostic: ECG, Echocardiogram, Ultrasounds
- Maternity: Antenatal Checkup, Pregnancy Ultrasound, Delivery
- Emergency: IV Insertion, Catheter, Nebulization
- Other: Dressing Change, Injections, Blood Draw

### Consumables Included (27 total)
- Medical Supplies: Gloves, Masks
- Wound Care: Bandages, Gauze, Antiseptic
- Syringes & Needles: Various sizes
- IV Supplies: IV Sets, Cannulas, Fluids
- Laboratory: Vacutainers, Swabs, Urine Cups
- Maternity: Delivery Kits, Umbilical Clamps
- Emergency: Oxygen Masks, Nebulizer Kits, Splints
- Equipment: Thermometers, BP Cuffs, Stethoscopes

## Troubleshooting

### Dropdowns are Empty

1. **Check if data exists:**
   ```bash
   docker exec kiplombe_mysql mysql -u root -proot_password kiplombe_hmis -e "SELECT COUNT(*) FROM procedures;"
   docker exec kiplombe_mysql mysql -u root -proot_password kiplombe_hmis -e "SELECT COUNT(*) FROM service_charges WHERE chargeType='Consumable';"
   ```

2. **Check API is working:**
   - Open browser console (F12)
   - Check Network tab for API calls to `/api/procedures` and `/api/billing/charges?chargeType=Consumable`

3. **Restart frontend:**
   ```bash
   docker compose restart frontend
   ```

### Procedures Not Showing

- Make sure `isActive=TRUE` in the database
- Check the API response in browser console
- Verify `proceduresApi.getAll()` is being called

### Consumables Not Showing

- Make sure `chargeType='Consumable'` (exact match, case-sensitive)
- Make sure `status='Active'`
- Check the API response includes the consumables






