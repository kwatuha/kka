# AZ CarePlus HMIS — User Manual

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [System Overview](#system-overview)
4. [User Roles and Permissions](#user-roles-and-permissions)
5. [Core Modules](#core-modules)
6. [Common Workflows](#common-workflows)
7. [Tips and Best Practices](#tips-and-best-practices)
8. [Troubleshooting](#troubleshooting)
9. [Support and Contact](#support-and-contact)

---

## Introduction

### Welcome to AZ CarePlus HMIS

**AZ CarePlus HMIS** is a comprehensive web-based hospital information system provided by **AZIMKIM INVESTMENTS LIMITED**. It is deployed at licensed hospitals, clinics, and county health facilities under the governance of each site’s **health data controller** (facility or county administration).

The system integrates patient management, clinical workflows, billing, pharmacy, laboratory, radiology, and administrative functions into a single interface. Your facility may enable additional modules (maternity, ICU, integrations, reporting) according to local configuration.

### About this manual

This document describes **product behaviour** common to all deployments. Local policies (opening hours, contacts, branding, and URLs) are set by your facility ICT team and are not repeated here.

### Key Features

- **Centralized Patient Management**: Complete patient records accessible from anywhere in the system
- **Real-time Queue Management**: Live tracking of patient queues across all service points
- **Integrated Billing**: Seamless billing and invoicing for all services
- **Clinical Modules**: Pharmacy, Laboratory, Radiology, and Medical Records
- **Administrative Tools**: HR, Finance, Inventory, and Procurement management
- **Role-based Access**: Secure access control based on user roles
- **Modern Interface**: Responsive design with dark/light mode support

### System Requirements

- **Web Browser**: Chrome, Firefox, Safari, or Edge (latest versions)
- **Internet Connection**: Stable internet connection for optimal performance
- **Screen Resolution**: Minimum 1024x768 pixels (1920x1080 recommended)
- **JavaScript**: Must be enabled in your browser

---

## Getting Started

### Accessing the System

1. Open your web browser (Chrome, Firefox, Safari, or Edge — latest version recommended).
2. Navigate to the **HMIS web address (URL)** supplied by your facility ICT administrator (HTTPS only).
3. You will see the login page for **AZ CarePlus HMIS** (facility name and logo may appear if configured locally).
4. If you are not authenticated, any protected page redirects you to login.

### Logging In

1. Enter your **Username** in the username field
2. Enter your **Password** in the password field
3. Click the **Login** button or press Enter

**Important Security Notes:**
- Never share your login credentials with anyone
- Always log out when finished, especially on shared computers
- Contact IT support immediately if you suspect unauthorized access

### User accounts

Usernames and initial passwords are **issued by facility ICT** — there are no shared or generic production accounts. Each person must have a **unique username** tied to their role. Passwords must meet the policy configured under **Administration → Security settings**. Contact ICT to reset a password or request role changes.

### System Navigation

Once logged in, you will see:

- **Header Bar**: Contains user profile menu, notifications, and theme toggle
- **Sidebar Navigation**: Main menu with all available modules (visible based on your role)
- **Main Content Area**: Where module-specific content is displayed
- **Breadcrumbs**: Shows your current location in the system

### Logging Out

1. Click on your profile name/icon in the top-right corner
2. Select **Logout** from the dropdown menu
3. You will be redirected to the login page

---

## System Overview

### Dashboard

The main dashboard provides an overview of key metrics and quick access to common tasks:

- **Patient Statistics**: Total patients, new registrations, appointments
- **Queue Status**: Current queue lengths at different service points
- **Financial Summary**: Revenue, pending invoices, payments
- **Quick Actions**: Shortcuts to frequently used functions
- **Notifications**: Important alerts and reminders

### Module Organization

The system is organized into the following main modules:

1. **Patients** - Patient registration and management
2. **Appointments** - Appointment scheduling
3. **Queue** - Queue management for service points
4. **Medical Records** - Electronic health records
5. **Billing** - Patient billing and invoicing
6. **Pharmacy** - Medication management and dispensing
7. **Laboratory** - Lab tests and results
8. **Radiology** - Imaging services
9. **Inpatient** - Ward management
10. **ICU** - Intensive care unit management
11. **Maternity** - Maternity ward management
12. **Doctors** - Doctor schedules and management
13. **Triaging** - Patient triage assessment
14. **Inventory** - Medical supplies and equipment
15. **Procurement** - Purchase orders and vendor management
16. **Finance** - Financial management
17. **Insurance** - Insurance claims and management
18. **HR** - Human resources management
19. **Departments** - Department configuration
20. **Analytics** - Reports and analytics
21. **Settings** - System configuration
22. **Regional Dashboard** - Multi-facility overview

---

## User Roles and Permissions

### Administrator

**Full Access** to all modules and system configuration.

- Manage all users and roles
- Configure system settings
- Access all patient data
- Manage departments and facilities
- View comprehensive analytics and reports
- Financial management and oversight

### Doctor

**Clinical Access** focused on patient care and medical records.

- View and update patient medical records
- Create and manage appointments
- Prescribe medications
- Order laboratory and radiology tests
- View test results
- Manage assigned patients
- Document clinical notes and diagnoses
- Access patient history

**Cannot access:** Financial data, user management, system settings

### Nurse

**Patient Care Access** for nursing workflows.

- View patient records
- Record vital signs and observations
- Administer medications
- Update patient status
- Assist with triage
- Document nursing notes
- View assigned patients

**Cannot access:** Billing, prescriptions, system configuration

### Lab Technician

**Laboratory Module Access** for test management.

- Receive lab orders
- Process laboratory tests
- Enter test results
- View patient information related to tests
- Manage lab inventory
- Generate lab reports

**Cannot access:** Billing, prescriptions, patient full records

### Registration Officer

**Patient Registration Access** for front desk operations.

- Register new patients
- Update patient demographic information
- Search and view patient records
- Manage appointments
- Add patients to queues
- Print patient cards and forms

**Cannot access:** Medical records, billing details, clinical data

### Billing Clerk

**Billing and Finance Access** for financial operations.

- View patient billing information
- Create invoices
- Process payments
- View financial reports
- Manage service charges
- Handle insurance claims
- Generate billing reports

**Cannot access:** Medical records, clinical data, system settings

### Pharmacy Staff

**Pharmacy Module Access** for medication management.

- View prescriptions
- Dispense medications
- Manage pharmacy inventory
- View prescription history
- Check drug interactions
- Manage stock levels

**Cannot access:** Patient full records, billing, clinical notes

---

## Core Modules

### 1. Patients Module

The Patients module is central to all operations in the HMIS.

#### Viewing Patient List

1. Navigate to **Patients** from the sidebar
2. Use the search bar to find patients by:
   - Patient ID
   - Name
   - Phone number
   - Date of birth
3. Patient cards display:
   - Patient ID
   - Full name
   - Age
   - Last visit date
   - Quick action buttons

#### Registering a New Patient

1. Click **Add New Patient** button
2. Fill in the registration form:
   - **Personal Information**: Full name, date of birth, gender, ID number
   - **Contact Information**: Phone number, email, address
   - **Emergency Contact**: Name and phone number
   - **Medical Information**: Allergies, chronic conditions (if applicable)
3. Click **Save** to register the patient
4. A unique Patient ID will be generated automatically

#### Viewing Patient Details

1. Search for the patient
2. Click on the patient card or patient ID
3. Patient details page shows:
   - **Demographics**: Personal and contact information
   - **Medical History**: Past diagnoses and conditions
   - **Appointments**: Upcoming and past appointments
   - **Visits**: Visit history with dates and departments
   - **Prescriptions**: Medication history
   - **Lab Results**: Laboratory test results
   - **Billing**: Payment and invoice history

#### Updating Patient Information

1. Open patient details
2. Click **Edit** button
3. Update the required fields
4. Click **Save** to apply changes

**Note:** Some fields may be restricted based on your role.

---

### 2. Appointments Module

Manage patient appointments across all departments.

#### Creating an Appointment

1. Navigate to **Appointments**
2. Click **New Appointment**
3. Fill in appointment details:
   - **Patient**: Search and select patient
   - **Department**: Select department (e.g., Cardiology, Pediatrics)
   - **Doctor**: Select doctor (if applicable)
   - **Date and Time**: Choose appointment date and time
   - **Type**: Consultation, Follow-up, Procedure, etc.
   - **Notes**: Additional information or reason for visit
4. Click **Schedule Appointment**

#### Viewing Appointments

- **Calendar View**: See appointments in a calendar format
- **List View**: View all appointments in a table
- **Filter Options**: Filter by date, department, doctor, or status

#### Appointment Statuses

- **Scheduled**: Confirmed appointment
- **Checked In**: Patient has arrived
- **In Progress**: Currently with doctor
- **Completed**: Appointment finished
- **Cancelled**: Appointment cancelled
- **No Show**: Patient did not arrive

#### Managing Appointments

- **Check In**: Mark patient as arrived
- **Reschedule**: Change date/time
- **Cancel**: Cancel appointment
- **Add Notes**: Add clinical or administrative notes

---

### 3. Queue Module

Manage patient queues at various service points.

#### Adding Patient to Queue

1. Navigate to **Queue**
2. Click **Add to Queue**
3. Select:
   - **Patient**: Search and select patient
   - **Service Point**: Department or clinic
   - **Priority**: Normal, Urgent, Emergency
   - **Reason**: Brief reason for visit
4. Click **Add to Queue**

#### Viewing Queue

- **Active Queue**: Patients currently waiting
- **Queue by Service Point**: Filter by specific department
- **Priority Queue**: Urgent and emergency cases highlighted

#### Queue Management

- **Call Next**: Move patient to current position
- **Skip**: Move patient later in queue
- **Remove**: Remove from queue
- **Transfer**: Move to different service point
- **Update Status**: Mark as seen, in progress, completed

#### Queue Display

- **Digital Display**: Shows queue numbers on public displays
- **Audio Announcements**: Optional audio alerts for next patient
- **Mobile Notifications**: Notify patients of their turn (if enabled)

---

### 4. Medical Records Module

Access and manage electronic health records.

#### Viewing Medical Records

1. Navigate to **Medical Records**
2. Search for patient
3. View comprehensive record including:
   - **Visit History**: All past visits
   - **Diagnoses**: Current and past diagnoses
   - **Medications**: Current and past prescriptions
   - **Allergies**: Known allergies and reactions
   - **Vital Signs**: Historical vital signs data
   - **Lab Results**: All laboratory test results
   - **Imaging**: Radiology reports and images
   - **Clinical Notes**: Doctor and nurse notes
   - **Procedures**: Procedures performed

#### Adding Clinical Notes

1. Open patient's medical record
2. Click **Add Note**
3. Select note type:
   - **Consultation Note**: Doctor consultation notes
   - **Progress Note**: Follow-up notes
   - **Nursing Note**: Nursing observations
   - **Procedure Note**: Procedure documentation
4. Enter notes using appropriate templates
5. Add attachments if needed (images, documents)
6. Save the note

#### Recording Vital Signs

1. Open patient record
2. Click **Record Vitals**
3. Enter:
   - Blood Pressure
   - Temperature
   - Pulse/Heart Rate
   - Respiratory Rate
   - Oxygen Saturation (SpO2)
   - Weight and Height
   - Pain Score (if applicable)
4. Save vital signs

---

### 5. Billing Module

Handle patient billing and invoicing.

#### Creating an Invoice

1. Navigate to **Billing**
2. Click **New Invoice**
3. Select patient
4. Add service charges:
   - Search for service (consultation, procedure, test, etc.)
   - Select service and quantity
   - System will apply current pricing
5. Review invoice summary
6. Apply discounts or adjustments if needed
7. Select payment method
8. Click **Generate Invoice**

#### Processing Payments

1. Open invoice
2. Click **Receive Payment**
3. Enter payment details:
   - **Payment Method**: Cash, Card, Mobile Money, Insurance
   - **Amount**: Full or partial payment
   - **Reference**: Receipt or transaction number
4. Print receipt
5. Save payment

#### Viewing Billing Information

- **Patient Invoices**: All invoices for a patient
- **Pending Payments**: Unpaid invoices
- **Payment History**: Transaction history
- **Service Charges**: List of all chargeable services
- **Billing Reports**: Financial summaries

#### Insurance Claims

1. Open invoice
2. Click **Submit to Insurance**
3. Select insurance provider
4. Enter authorization number
5. Submit claim
6. Track claim status

---

### 6. Pharmacy Module

Manage medication dispensing and inventory.

#### Viewing Prescriptions

1. Navigate to **Pharmacy**
2. View pending prescriptions:
   - **New Prescriptions**: Awaiting fulfillment
   - **Ready for Pickup**: Medications prepared
   - **Dispensed**: Completed prescriptions
3. Click on prescription to view details

#### Dispensing Medications

1. Open prescription
2. Review prescribed medications
3. Check medication availability in stock
4. If available:
   - Select medication from inventory
   - Enter quantity to dispense
   - Review dosage instructions
   - Print prescription label
   - Mark as dispensed
5. If not available:
   - Mark as pending
   - Notify prescriber or patient
   - Order medication if needed

#### Pharmacy Inventory

- **Stock Levels**: Current medication stock
- **Low Stock Alerts**: Medications running low
- **Expiry Tracking**: Medications near expiration
- **Reorder Points**: Automatic reorder notifications

#### Drug Information

- View drug details and interactions
- Check contraindications
- Review dosage guidelines
- Access drug reference information

---

### 7. Laboratory Module

Manage laboratory tests and results.

#### Receiving Lab Orders

1. Navigate to **Laboratory**
2. View pending orders:
   - Orders from doctors
   - Patient information
   - Tests requested
   - Priority level
3. Click **Receive Sample** when patient provides sample

#### Processing Tests

1. Open lab order
2. Select tests to process
3. Enter test results:
   - Use result templates
   - Enter numerical values or select from options
   - Add notes or observations
4. Review results for accuracy
5. Verify results (if required by protocol)
6. Mark tests as completed

#### Viewing Results

- **Pending Results**: Tests awaiting processing
- **Completed Results**: Ready for review
- **Patient Results**: All results for a patient
- **Result History**: Historical test results

#### Lab Reports

1. Open completed test
2. Review results
3. Generate report
4. Print or email report to ordering doctor
5. Mark as reported

**Note:** Results can be viewed by authorized clinical staff in patient records.

---

### 8. Radiology Module

Manage imaging services and reports.

#### Viewing Imaging Requests

1. Navigate to **Radiology**
2. View pending imaging requests:
   - Patient information
   - Type of imaging (X-ray, CT, MRI, Ultrasound, etc.)
   - Body part or area
   - Clinical indication
   - Priority

#### Performing Imaging

1. Open imaging request
2. Verify patient identity
3. Perform imaging procedure
4. Upload images to system
5. Enter procedure notes
6. Mark as completed

#### Generating Reports

1. Open completed imaging study
2. View images
3. Create radiology report:
   - Findings
   - Impression
   - Recommendations
4. Review and finalize report
5. Submit report to requesting doctor
6. Mark as reported

#### Viewing Images and Reports

- Access images from patient records
- View radiology reports
- Compare with previous studies
- Download or print reports

---

### 9. Inventory Module

Manage medical supplies and equipment.

#### Viewing Inventory

1. Navigate to **Inventory**
2. Browse inventory items:
   - Search by name, category, or ID
   - Filter by category (medications, supplies, equipment)
   - View stock levels and locations

#### Stock Management

1. Open inventory item
2. View current stock level
3. Perform stock operations:
   - **Receive Stock**: Add new inventory
   - **Issue Stock**: Remove inventory for use
   - **Adjust Stock**: Correct discrepancies
   - **Transfer Stock**: Move between locations

#### Inventory Reports

- **Stock Levels**: Current quantities
- **Low Stock Items**: Items below reorder point
- **Expired Items**: Items past expiration
- **Stock Movements**: Receipts, issues, and transfers
- **Usage Analytics**: Consumption patterns

#### Adding New Items

1. Click **Add Item**
2. Enter item details:
   - Name and description
   - Category and subcategory
   - Unit of measure
   - Reorder level
   - Supplier information
   - Pricing (if applicable)
3. Save item

---

### 10. Finance Module

Comprehensive financial management tools.

#### Financial Dashboard

- Revenue overview
- Outstanding receivables
- Payment trends
- Financial summaries by department

#### Sub-modules:

**Ledger**
- General ledger entries
- Account transactions
- Financial statements

**Budgeting**
- Create and manage budgets
- Budget vs actual comparisons
- Department budgets

**Assets**
- Fixed asset management
- Depreciation tracking
- Asset register

**Receivables**
- Accounts receivable
- Patient outstanding balances
- Collection tracking

**Payables**
- Accounts payable
- Supplier invoices
- Payment processing

**Cash Management**
- Cash flow tracking
- Bank reconciliation
- Cash registers

**Service Charges**
- Manage chargeable services
- Pricing configuration
- Service categories

**Revenue Share**
- Revenue distribution
- Department revenue sharing
- Commission tracking

---

### 11. Other Important Modules

#### Inpatient Module
- Ward management
- Bed allocation
- Patient admission and discharge
- Ward rounds tracking

#### ICU Module
- Intensive care unit management
- Ventilator tracking
- Critical care monitoring
- ICU bed management

#### Maternity Module
- Antenatal care
- Delivery records
- Postnatal care
- Maternity ward management

#### Doctors Module
- Doctor schedules
- Doctor availability
- Doctor profiles and credentials
- Performance metrics

#### Triaging Module
- Patient assessment
- Triage categories (Red, Yellow, Green, Blue)
- Priority assignment
- Triage documentation

#### Insurance Module
- Insurance provider management
- Claims processing
- Authorization requests
- Insurance coverage verification

#### HR Module
- Employee management
- Staff schedules
- Leave management
- Performance reviews

#### Procurement Module
- Purchase orders
- Vendor management
- Requisition management
- Supply chain tracking

#### Departments Module
- Department configuration
- Service point management
- Department settings

#### Analytics Module
- Comprehensive reports
- Statistics and trends
- Custom report generation
- Data visualization

#### Settings Module
- System configuration (Administrators only)
- User management
- Role and permission configuration
- System preferences

#### Regional Dashboard
- Multi-facility overview
- Cross-facility analytics
- Regional statistics

---

## Common Workflows

### Workflow 1: Patient Registration and Consultation

1. **Registration Officer** registers new patient
2. Patient receives Patient ID
3. **Registration Officer** creates appointment or adds to queue
4. **Nurse** performs triage (if applicable)
5. Patient waits in queue
6. **Doctor** calls patient from queue
7. **Doctor** conducts consultation and documents notes
8. **Doctor** may order tests, prescribe medications, or schedule follow-up
9. Patient proceeds to billing (if applicable)
10. Patient collects medications from pharmacy (if prescribed)
11. Patient completes visit

### Workflow 2: Laboratory Test Order and Results

1. **Doctor** orders laboratory test during consultation
2. Order appears in Laboratory module
3. Patient provides sample at lab
4. **Lab Technician** receives sample and processes test
5. **Lab Technician** enters results
6. Results are verified
7. **Lab Technician** generates report
8. Results are available in patient's medical record
9. **Doctor** reviews results in patient record
10. Results inform diagnosis and treatment decisions

### Workflow 3: Medication Prescription and Dispensing

1. **Doctor** prescribes medication during consultation
2. Prescription appears in Pharmacy module
3. Patient goes to pharmacy
4. **Pharmacy Staff** reviews prescription
5. **Pharmacy Staff** checks drug availability and interactions
6. **Pharmacy Staff** dispenses medication
7. Prescription is marked as dispensed
8. Medication is deducted from inventory
9. Patient receives medication and instructions

### Workflow 4: Inpatient Admission

1. **Doctor** decides patient needs admission
2. **Registration** checks bed availability
3. Patient is assigned to ward and bed
4. **Nurse** admits patient to ward
5. Admission documentation is completed
6. Patient receives inpatient care
7. Daily rounds and documentation
8. **Doctor** decides discharge
9. **Nurse** completes discharge process
10. Final billing is processed
11. Patient is discharged

---

## Tips and Best Practices

### Data Entry Best Practices

1. **Accuracy First**: Always verify patient information before saving
2. **Complete Fields**: Fill in all required fields for better record quality
3. **Use Standard Formats**: Follow naming conventions for consistency
4. **Document Everything**: Add notes when making important decisions
5. **Review Before Saving**: Double-check entries before submitting

### Security Best Practices

1. **Log Out**: Always log out when finished, especially on shared computers
2. **Password Security**: Use strong passwords and change them regularly
3. **No Sharing**: Never share login credentials
4. **Patient Privacy**: Maintain patient confidentiality at all times
5. **Report Issues**: Report any security concerns immediately

### Performance Tips

1. **Use Search**: Use search functions rather than scrolling through long lists
2. **Apply Filters**: Use filters to narrow down results
3. **Bookmark Pages**: Bookmark frequently accessed pages in your browser
4. **Clear Cache**: Clear browser cache if experiencing slow performance
5. **Report Bugs**: Report system issues to IT support

### Navigation Tips

1. **Keyboard Shortcuts**: Learn keyboard shortcuts for common actions
2. **Breadcrumbs**: Use breadcrumbs to navigate back
3. **Quick Actions**: Use quick action buttons for common tasks
4. **Menu Organization**: Familiarize yourself with menu structure
5. **Dashboard**: Use dashboard for quick overview and access

### Communication

1. **Use Notes**: Add notes in patient records for team communication
2. **Status Updates**: Update status fields to keep team informed
3. **Alerts**: Pay attention to system alerts and notifications
4. **Documentation**: Document important decisions and actions

---

## Troubleshooting

### Login Issues

**Problem:** Cannot log in with correct credentials

**Solutions:**
- Check Caps Lock and Num Lock keys
- Verify username and password are correct
- Clear browser cache and cookies
- Try a different browser
- Contact IT support if issue persists

**Problem:** "Session expired" message

**Solutions:**
- Simply log in again
- This is normal after extended inactivity

### Performance Issues

**Problem:** System is slow or unresponsive

**Solutions:**
- Check internet connection
- Close unnecessary browser tabs
- Clear browser cache
- Try refreshing the page
- Check if others are experiencing the same issue
- Contact IT support if problem continues

### Data Not Appearing

**Problem:** Recently entered data is not visible

**Solutions:**
- Refresh the page
- Check if you're viewing the correct date range
- Verify filters are not excluding the data
- Check if you have permission to view the data
- Clear browser cache

### Printing Issues

**Problem:** Cannot print reports or receipts

**Solutions:**
- Check printer connection
- Verify printer is set as default
- Try printing from different browser
- Save as PDF and print from PDF viewer
- Contact IT support for printer configuration

### Browser Compatibility

**Recommended Browsers:**
- Google Chrome (Latest version) - Recommended
- Mozilla Firefox (Latest version)
- Microsoft Edge (Latest version)
- Safari (Latest version) - for Mac users

**Not Recommended:**
- Internet Explorer (no longer supported)
- Very old browser versions

### Getting Help

If you encounter issues not covered here:

1. Check this manual first
2. Ask colleagues for assistance
3. Contact your supervisor
4. Submit a ticket to IT support
5. Include:
   - Description of the problem
   - Steps to reproduce
   - Error messages (if any)
   - Your user role
   - Browser and operating system

---

## Support and Contact

### Your facility (health data controller)

Clinical workflows, local SOPs, and patient-facing enquiries are handled by **your hospital or county administration**. Use the contact board, help desk, or medical superintendent’s office published **on your facility premises** — those details are not included in this product manual.

### ICT and system support

For login issues, access requests, printers, workstations, and network connectivity:

- Contact your **facility ICT help desk** or county health informatics unit  
- Provide your **username**, **module/screen**, and a short description or screenshot of any error  

For **application defects**, integration failures, or vendor maintenance (where contracted):

- Escalate through your ICT lead to **AZ CarePlus HMIS** support per your deployment agreement with AZIMKIM INVESTMENTS LIMITED  

### System Support (summary)

For technical support, system issues, or training requests:

- Contact your IT administrator
- Submit support tickets through the system (if available)
- Email IT support team
- Refer to system documentation and training materials

### Training

- New user training sessions are available
- Advanced training for specific modules
- Refresher courses for existing users
- Contact your supervisor or IT department for training requests

---

## Appendices

### Appendix A: Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Search | Ctrl+F / Cmd+F |
| Save | Ctrl+S / Cmd+S |
| New Record | Ctrl+N / Cmd+N |
| Refresh | F5 / Cmd+R |
| Close Dialog | Esc |
| Navigate Menu | Arrow Keys |
| Select/Deselect All | Ctrl+A / Cmd+A |

### Appendix B: Common Terms

- **HMIS**: Hospital Management Information System
- **EHR**: Electronic Health Record
- **EMR**: Electronic Medical Record
- **OPD**: Outpatient Department
- **IPD**: Inpatient Department
- **ICU**: Intensive Care Unit
- **HDU**: High Dependency Unit
- **ER**: Emergency Room
- **OR**: Operating Room
- **OT**: Operation Theater

### Appendix C: Status Indicators

- 🟢 Green: Active, Available, Normal
- 🟡 Yellow: Pending, Warning, Attention Required
- 🔴 Red: Urgent, Critical, Inactive
- 🔵 Blue: Information, In Progress
- ⚪ Gray: Completed, Closed, Inactive

---

## Document Version

**Version:** 2.0 (AZ CarePlus product manual)  
**Last Updated:** October 2026  
**Next Review:** October 2027

---

**Thank you for using AZ CarePlus HMIS.**

For the latest updates to this manual, contact your facility ICT administrator or refer to documentation supplied with your deployment.

