# Role-Based Menu and Tab Access Control - Analysis & Design

## Executive Summary

This document outlines the analysis and design for implementing a role-based access control system for top menus, sidebar items, and page tabs. This system will allow administrators to configure which menu items and tabs each role can access, providing fine-grained control over the application's user interface.

## Current System Analysis

### 1. Navigation Structure

#### Top Menus (Navigation Categories)
Defined in `lib/navigation.ts` as `navigationCategories`:
- **Dashboard** (id: "overview")
- **Patient Care** (id: "patient-care")
- **Clinical Services** (id: "clinical-services")
- **Financial Management** (id: "financial")
- **Procurement & Inventory** (id: "procurement")
- **Administrative** (id: "administrative")

#### Sidebar Items
Each category contains an `items` array with:
- `title`: Display name
- `href`: Route path
- `icon`: Icon component
- `description`: Optional description

Example sidebar items:
- Dashboard category: Dashboard, Departments, Analytics, Regional Dashboard
- Patient Care category: Patient Registration, Triaging, Appointments, Queue Management, Medical Records
- Clinical Services: Doctors Module, Pharmacy, Laboratory, Radiology, Inpatient, Maternity, ICU, Ambulance Management
- And more...

#### Tabs Within Pages
Tabs are implemented using the `Tabs` component from `@/components/ui/tabs`. Examples:

**Patient Profile Page** (`/patients/[id]`):
- Overview, Vitals, Lab Results, Medications, Procedures, Orders, Appointments, Billing, Admissions, Documents, Allergies, Insurance, Family History, Queue Status

**Vendor Detail Page** (`/procurement/vendors/[id]`):
- Overview, Products, Orders, Contracts, Documents, Ratings, Issues, Performance

**Inpatient Management**:
- Overview, Reviews, Nursing, Vitals, Procedures, Labs, Orders, Medications

### 2. Current Role/Privilege System

**Database Schema:**
```sql
roles (roleId, roleName, description, isActive)
privileges (privilegeId, privilegeName, description, module)
role_privileges (roleId, privilegeId)
```

**Current Capabilities:**
- Roles can be created and managed
- Privileges can be created and organized by module
- Roles can be assigned multiple privileges
- Privileges are used for feature-level access control

**Limitations:**
- No direct mapping between roles and menu visibility
- No control over which tabs a role can see
- Menu visibility is currently not role-based

## Proposed Solution

### 1. Database Schema Extensions

#### Table: `role_menu_categories`
Maps roles to top menu categories (navigation categories):
```sql
CREATE TABLE IF NOT EXISTS role_menu_categories (
    roleId INT NOT NULL,
    categoryId VARCHAR(50) NOT NULL,  -- e.g., "overview", "patient-care"
    isAllowed BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (roleId, categoryId),
    FOREIGN KEY (roleId) REFERENCES roles(roleId) ON DELETE CASCADE,
    INDEX idx_role (roleId),
    INDEX idx_category (categoryId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Table: `role_menu_items`
Maps roles to sidebar menu items:
```sql
CREATE TABLE IF NOT EXISTS role_menu_items (
    roleId INT NOT NULL,
    categoryId VARCHAR(50) NOT NULL,  -- Parent category
    menuItemPath VARCHAR(255) NOT NULL,  -- e.g., "/patients", "/triaging"
    isAllowed BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (roleId, categoryId, menuItemPath),
    FOREIGN KEY (roleId) REFERENCES roles(roleId) ON DELETE CASCADE,
    INDEX idx_role (roleId),
    INDEX idx_path (menuItemPath)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Table: `role_page_tabs`
Maps roles to tabs within specific pages:
```sql
CREATE TABLE IF NOT EXISTS role_page_tabs (
    roleId INT NOT NULL,
    pagePath VARCHAR(255) NOT NULL,  -- e.g., "/patients/[id]", "/procurement/vendors/[id]"
    tabId VARCHAR(100) NOT NULL,  -- e.g., "overview", "vitals", "lab-results"
    isAllowed BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (roleId, pagePath, tabId),
    FOREIGN KEY (roleId) REFERENCES roles(roleId) ON DELETE CASCADE,
    INDEX idx_role (roleId),
    INDEX idx_page (pagePath)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2. Access Control Logic

#### Default Behavior
- **Whitelist Approach**: If no records exist for a role, deny access (secure by default)
- **Inheritance**: If a category is allowed, all items within it are allowed unless explicitly denied
- **Override**: Individual menu items and tabs can be explicitly allowed/denied

#### Permission Hierarchy
1. **Category Level**: If category is denied, all items within are denied
2. **Item Level**: Can override category permission
3. **Tab Level**: Independent of menu item permission

### 3. API Endpoints

#### Role Menu Configuration API
```
GET    /api/roles/:roleId/menu-config
POST   /api/roles/:roleId/menu-config
PUT    /api/roles/:roleId/menu-config
DELETE /api/roles/:roleId/menu-config/category/:categoryId
DELETE /api/roles/:roleId/menu-config/item/:itemPath
DELETE /api/roles/:roleId/menu-config/tab/:pagePath/:tabId
```

#### User Menu Access API (for frontend)
```
GET    /api/users/me/menu-access
```
Returns filtered menu structure based on current user's role.

### 4. Frontend Implementation

#### Menu Filtering Utilities
Create `lib/role-menu-filter.ts`:
- `filterNavigationCategories(categories, userRole)`: Filter top menus
- `filterSidebarItems(items, categoryId, userRole)`: Filter sidebar items
- `filterPageTabs(tabs, pagePath, userRole)`: Filter tabs

#### Modified Components
- `components/top-navigation.tsx`: Apply role-based filtering
- `components/app-sidebar.tsx`: Apply role-based filtering
- Tab components: Apply role-based filtering

#### Role Configuration UI
- `components/administration/role-menu-config.tsx`: UI for configuring role menu/tab access
- Extend `components/administration/role-form.tsx`: Add menu/tab configuration tab

### 5. Integration with Existing Privilege System

**Option A: Separate System**
- Menu/tab access is independent of privileges
- Privileges control feature functionality
- Menu/tab access controls UI visibility

**Option B: Integrated System**
- Create privileges for menu categories, items, and tabs
- Use existing role_privileges table
- More unified but requires privilege creation for each menu item/tab

**Recommendation: Option A (Separate System)**
- Cleaner separation of concerns
- Easier to manage
- More intuitive for administrators
- Can still reference privileges for feature-level checks

## Implementation Plan

### Phase 1: Database & API
1. Create database migration for new tables
2. Create API routes for role menu/tab configuration
3. Create API route for user menu access
4. Add database seed data for default roles

### Phase 2: Frontend Utilities
1. Create role-menu-filter utilities
2. Create hooks for accessing user role and menu permissions
3. Update navigation context to include role-based filtering

### Phase 3: UI Components
1. Update TopNavigation to filter by role
2. Update AppSidebar to filter by role
3. Create tab filtering wrapper component
4. Create role menu configuration UI

### Phase 4: Testing & Documentation
1. Test with different roles
2. Create admin documentation
3. Update user manual

## Example Use Cases

### Use Case 1: Nurse Role
- **Allowed Categories**: Patient Care, Clinical Services
- **Allowed Items**: Patient Registration, Triaging, Queue Management, Medical Records, Pharmacy, Laboratory
- **Denied Items**: Financial Management, Procurement, Administrative
- **Patient Profile Tabs**: Overview, Vitals, Lab Results, Medications, Orders (deny: Billing, Insurance)

### Use Case 2: Finance Role
- **Allowed Categories**: Financial Management, Administrative
- **Allowed Items**: All financial items, Reports
- **Denied Items**: Clinical Services, Patient Care (except Medical Records for billing)
- **Patient Profile Tabs**: Overview, Billing, Insurance (deny: Vitals, Lab Results, Medications)

### Use Case 3: Administrator Role
- **Allowed Categories**: All
- **Allowed Items**: All
- **Allowed Tabs**: All

## Benefits

1. **Fine-Grained Control**: Control access at category, item, and tab levels
2. **Security**: Hide UI elements users shouldn't access
3. **User Experience**: Cleaner interface tailored to user's role
4. **Compliance**: Better audit trail of what users can see
5. **Flexibility**: Easy to configure without code changes

## Migration Strategy

1. **Default Permissions**: For existing roles, grant access to all menus/tabs initially
2. **Gradual Rollout**: Configure roles one at a time
3. **Testing**: Test with non-admin roles first
4. **Documentation**: Provide clear documentation for administrators

## Next Steps

1. ✅ Review and approve this design
2. ✅ Create database migration script
3. ✅ Implement API endpoints
4. ⏳ Implement frontend filtering
5. ⏳ Create configuration UI
6. ⏳ Test and deploy

## Database Migration

To apply the migration, use the correct container name:

```bash
docker exec -i kiplombe_mysql mysql -ukiplombe_user -pkiplombe_password kiplombe_hmis < api/database/migrations/add_role_menu_tab_access.sql
```

**Note**: The container name is `kiplombe_mysql` (not `db`).
