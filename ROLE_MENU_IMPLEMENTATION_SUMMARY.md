# Role-Based Menu and Tab Access - Implementation Summary

## Overview

This document summarizes the implementation of a role-based access control system for top menus, sidebar items, and page tabs in the application.

## What Has Been Implemented

### 1. Database Schema ✅
**File**: `api/database/migrations/add_role_menu_tab_access.sql`

Created three new tables:
- `role_menu_categories`: Maps roles to top menu categories
- `role_menu_items`: Maps roles to sidebar menu items
- `role_page_tabs`: Maps roles to tabs within pages

**Migration includes:**
- Default permissions for existing roles (all access granted initially)
- Proper foreign keys and indexes
- Timestamp tracking

### 2. API Routes ✅
**File**: `api/routes/roleMenuRoutes.js`

Endpoints created:
- `GET /api/roles/:roleId/menu-config` - Get menu/tab config for a role
- `POST /api/roles/:roleId/menu-config` - Update menu/tab config for a role
- `GET /api/users/me/menu-access` - Get menu access for current user

**Integration**: Added to `api/app.js` as `/api/roles` routes

### 3. Frontend API Client ✅
**File**: `lib/api.ts`

Added `roleMenuApi` with methods:
- `getMenuConfig(roleId)` - Get configuration
- `updateMenuConfig(roleId, config)` - Update configuration
- `getUserMenuAccess(userId?)` - Get user's menu access

### 4. Filtering Utilities ✅
**File**: `lib/role-menu-filter.ts`

Functions created:
- `filterNavigationCategories()` - Filter top menus
- `filterSidebarItems()` - Filter sidebar items
- `isTabAllowed()` - Check if tab is allowed
- `filterTabs()` - Filter tabs array
- `normalizePagePath()` - Normalize paths for matching
- `matchPagePath()` - Match page paths with patterns

### 5. React Hook ✅
**File**: `lib/hooks/use-role-menu-access.ts`

Hook `useRoleMenuAccess()` provides:
- Menu access data
- Loading state
- Error handling
- Refetch capability

## What Still Needs to Be Done

### 1. UI Components for Configuration ⏳
**Priority: High**

Create `components/administration/role-menu-config.tsx`:
- Visual interface for configuring role menu/tab access
- Tree view or checkbox list for categories
- Expandable sections for menu items within categories
- Tab configuration per page
- Bulk select/deselect options

**Integration**: Add as a tab in `components/administration/role-form.tsx`

### 2. Update Navigation Components ⏳
**Priority: High**

**Files to update:**
- `components/top-navigation.tsx`: Apply `filterNavigationCategories()`
- `components/app-sidebar.tsx`: Apply `filterSidebarItems()`

**Implementation:**
```typescript
// In top-navigation.tsx
const { menuAccess } = useRoleMenuAccess()
const filteredCategories = filterNavigationCategories(
  navigationCategories,
  menuAccess
)
```

### 3. Tab Filtering in Pages ⏳
**Priority: Medium**

Create a wrapper component or hook for tab filtering:
- `components/role-filtered-tabs.tsx` - Wrapper component
- Or `lib/hooks/use-filtered-tabs.ts` - Hook for filtering

**Pages to update:**
- `app/(main)/patients/[id]/page.tsx`
- `app/(main)/procurement/vendors/[id]/page.tsx`
- `components/inpatient-management.tsx`
- Other pages with tabs

**Example usage:**
```typescript
const { menuAccess } = useRoleMenuAccess()
const allowedTabs = filterTabs(
  allTabs,
  '/patients/[id]',
  menuAccess
)
```

### 4. User Authentication Integration ⏳
**Priority: High**

Update `api/routes/roleMenuRoutes.js`:
- Integrate with authentication middleware
- Get user from session/token instead of query parameter
- Ensure proper authorization checks

### 5. Default Permissions Strategy ⏳
**Priority: Medium**

Decide on default behavior:
- **Option A**: Deny by default (secure, requires explicit grants)
- **Option B**: Allow by default (permissive, requires explicit denies)

**Current implementation**: Migration grants all access initially, but new roles will have no access by default.

### 6. Testing ⏳
**Priority: High**

- Test with different roles
- Test category-level restrictions
- Test item-level overrides
- Test tab-level restrictions
- Test edge cases (no role, invalid paths, etc.)

### 7. Documentation ⏳
**Priority: Medium**

- Admin user guide for configuring role access
- Developer guide for adding new menu items/tabs
- API documentation

## Database Migration Instructions

To apply the database migration:

```bash
# Option 1: Using Docker (correct container name)
docker exec -i kiplombe_mysql mysql -ukiplombe_user -pkiplombe_password kiplombe_hmis < api/database/migrations/add_role_menu_tab_access.sql

# Option 2: Using Docker with root user
docker exec -i kiplombe_mysql mysql -uroot -proot_password kiplombe_hmis < api/database/migrations/add_role_menu_tab_access.sql

# Option 3: Direct MySQL (if not using Docker)
mysql -ukiplombe_user -pkiplombe_password kiplombe_hmis < api/database/migrations/add_role_menu_tab_access.sql
```

## Example Configuration

### Example 1: Nurse Role
```json
{
  "categories": [
    { "categoryId": "patient-care", "isAllowed": true },
    { "categoryId": "clinical-services", "isAllowed": true }
  ],
  "menuItems": [
    { "categoryId": "patient-care", "menuItemPath": "/patients", "isAllowed": true },
    { "categoryId": "patient-care", "menuItemPath": "/triaging", "isAllowed": true },
    { "categoryId": "clinical-services", "menuItemPath": "/pharmacy", "isAllowed": true }
  ],
  "tabs": [
    { "pagePath": "/patients/[id]", "tabId": "overview", "isAllowed": true },
    { "pagePath": "/patients/[id]", "tabId": "vitals", "isAllowed": true },
    { "pagePath": "/patients/[id]", "tabId": "lab-results", "isAllowed": true },
    { "pagePath": "/patients/[id]", "tabId": "billing", "isAllowed": false }
  ]
}
```

### Example 2: Finance Role
```json
{
  "categories": [
    { "categoryId": "financial", "isAllowed": true },
    { "categoryId": "administrative", "isAllowed": true }
  ],
  "menuItems": [
    { "categoryId": "financial", "menuItemPath": "/billing", "isAllowed": true },
    { "categoryId": "financial", "menuItemPath": "/finance/ledger", "isAllowed": true }
  ],
  "tabs": [
    { "pagePath": "/patients/[id]", "tabId": "overview", "isAllowed": true },
    { "pagePath": "/patients/[id]", "tabId": "billing", "isAllowed": true },
    { "pagePath": "/patients/[id]", "tabId": "insurance", "isAllowed": true }
  ]
}
```

## Architecture Decisions

### 1. Separate from Privileges
Menu/tab access is separate from the existing privilege system:
- **Privileges**: Control feature functionality (can user create patient?)
- **Menu/Tab Access**: Control UI visibility (can user see patient menu?)

This separation provides:
- Clearer separation of concerns
- Easier management
- More intuitive for administrators

### 2. Whitelist Approach
- If no configuration exists, deny access (secure by default)
- Explicit grants required for access
- Can be overridden per item/tab

### 3. Path Matching
- Supports exact paths: `/patients`
- Supports dynamic paths: `/patients/[id]` → `/patients/*`
- Supports prefix matching: `/patients` matches `/patients/123`

## Next Steps

1. **Immediate**: Create UI component for role menu configuration
2. **Immediate**: Update navigation components to use filtering
3. **Short-term**: Integrate with authentication system
4. **Short-term**: Add tab filtering to key pages
5. **Medium-term**: Comprehensive testing
6. **Medium-term**: Documentation

## Files Created/Modified

### Created:
- `api/database/migrations/add_role_menu_tab_access.sql`
- `api/routes/roleMenuRoutes.js`
- `lib/role-menu-filter.ts`
- `lib/hooks/use-role-menu-access.ts`
- `ROLE_MENU_TAB_ACCESS_ANALYSIS.md`
- `ROLE_MENU_IMPLEMENTATION_SUMMARY.md` (this file)

### Modified:
- `api/app.js` - Added role menu routes
- `lib/api.ts` - Added roleMenuApi

### To Be Modified:
- `components/top-navigation.tsx`
- `components/app-sidebar.tsx`
- `components/administration/role-form.tsx`
- Various page components with tabs

## Questions/Considerations

1. **Performance**: Should menu access be cached? (Consider Redis or in-memory cache)
2. **Real-time Updates**: Should menu changes reflect immediately or require logout?
3. **Audit Trail**: Should we track who changed role menu configurations?
4. **Bulk Operations**: Should we support copying menu config from one role to another?
5. **Templates**: Should we support role templates (e.g., "Nurse", "Doctor", "Finance")?
