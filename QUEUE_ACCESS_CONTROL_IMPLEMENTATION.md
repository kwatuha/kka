# Queue Access Control Implementation

## Overview

This document describes the implementation of role-based queue access control, allowing administrators to configure which queue service points each role can access.

## What Has Been Implemented

### ✅ Database Schema
**File**: `api/database/migrations/add_role_queue_access.sql`

Created `role_queue_access` table:
- Maps roles to queue service points
- Default permissions granted to all existing roles
- Supports 8 service points: triage, registration, consultation, laboratory, radiology, pharmacy, billing, cashier

### ✅ API Updates
**File**: `api/routes/roleMenuRoutes.js`

Updated endpoints:
- `GET /api/roles/:roleId/menu-config` - Now includes queue access
- `POST /api/roles/:roleId/menu-config` - Now accepts queue configuration
- `GET /api/users/me/menu-access` - Now returns allowed queue service points

### ✅ Frontend Updates

#### 1. Role Menu Configuration UI
**File**: `components/administration/role-menu-config.tsx`

Added "Queue Service Points" section:
- Grid layout showing all 8 service points
- Checkbox for each service point
- Visual indicators (badges) showing allowed/denied status
- Integrated into existing menu configuration interface

#### 2. Queue Management Page
**File**: `app/(main)/queue/page.tsx`

- Filters service points dropdown based on role permissions
- Only shows allowed service points in filter options
- Queue summary cards only show allowed service points

#### 3. Queue Display Component
**File**: `components/queue-display.tsx`

- Filters service point tabs based on role permissions
- Only shows allowed service points in tabs
- Automatically adjusts selected tab if current one becomes invalid

#### 4. Filtering Utilities
**File**: `lib/role-menu-filter.ts`

Added functions:
- `isQueueAllowed()` - Check if a service point is allowed
- `filterQueueServicePoints()` - Filter array of service points

#### 5. Type Updates
**File**: `lib/hooks/use-role-menu-access.ts`

- Updated `RoleMenuAccess` interface to include `queues` array
- Hook now returns queue permissions

## How to Use

### For Administrators

1. **Configure Queue Access for a Role**:
   - Go to Administration → Roles
   - Click "Edit" on the role you want to configure
   - Click the "Menu & Tab Access" tab
   - Scroll to "Queue Service Points" section
   - Check/uncheck the service points the role should access
   - Click "Save Configuration"

2. **Queue Service Points Available**:
   - Triage
   - Registration
   - Consultation
   - Laboratory
   - Radiology
   - Pharmacy
   - Billing
   - Cashier

### For Users

- Users will only see queue tabs/service points they have permission to access
- If a user tries to access a restricted queue, they won't see it in the interface
- Queue management page will only show allowed service points in filters

## Database Migration

The migration has been applied. To verify:

```bash
docker exec kiplombe_mysql mysql -ukiplombe_user -pkiplombe_password kiplombe_hmis -e "SHOW TABLES LIKE 'role_%';"
```

Expected tables:
- `role_menu_categories`
- `role_menu_items`
- `role_page_tabs`
- `role_queue_access` ← New table

## Example Configuration

### Example 1: Nurse Role
```json
{
  "queues": [
    { "servicePoint": "triage", "isAllowed": true },
    { "servicePoint": "consultation", "isAllowed": true },
    { "servicePoint": "pharmacy", "isAllowed": true },
    { "servicePoint": "laboratory", "isAllowed": true }
  ]
}
```

### Example 2: Finance Role
```json
{
  "queues": [
    { "servicePoint": "billing", "isAllowed": true },
    { "servicePoint": "cashier", "isAllowed": true }
  ]
}
```

### Example 3: Registration Staff
```json
{
  "queues": [
    { "servicePoint": "registration", "isAllowed": true },
    { "servicePoint": "triage", "isAllowed": true }
  ]
}
```

## Default Behavior

- **New Roles**: No queue access by default (secure)
- **Existing Roles**: All queues allowed by default (migration grants all access)
- **No Role**: No queue access
- **While Loading**: Shows all queues (prevents flickering)

## Files Created/Modified

### Created:
- `api/database/migrations/add_role_queue_access.sql`
- `QUEUE_ACCESS_CONTROL_IMPLEMENTATION.md` (this file)

### Modified:
- `api/routes/roleMenuRoutes.js` - Added queue access endpoints
- `components/administration/role-menu-config.tsx` - Added queue configuration UI
- `app/(main)/queue/page.tsx` - Added role-based filtering
- `components/queue-display.tsx` - Added role-based filtering
- `lib/role-menu-filter.ts` - Added queue filtering functions
- `lib/hooks/use-role-menu-access.ts` - Updated interface
- `lib/api.ts` - Updated API client

## Testing

To test the implementation:

1. **Create/Edit a Role**:
   - Go to Administration → Roles
   - Edit a role
   - Go to "Menu & Tab Access" tab
   - Configure queue service points
   - Save

2. **Test as User**:
   - Log in as a user with that role
   - Go to Queue Management
   - Verify only allowed service points are visible
   - Check queue display component shows only allowed tabs

## Next Steps (Optional Enhancements)

1. **Queue Statistics**: Filter queue statistics by role permissions
2. **Queue Actions**: Restrict queue actions (add, edit, delete) by role
3. **Queue History**: Filter queue history by role permissions
4. **Notifications**: Only send queue notifications for allowed service points
