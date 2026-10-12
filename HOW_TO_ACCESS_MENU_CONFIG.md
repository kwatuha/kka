# How to Access Role Menu & Tab Configuration

## Quick Guide

The **Menu & Tab Access** configuration is available when **editing an existing role**, not when creating a new one.

## Step-by-Step Instructions

### 1. Navigate to Administration
- Go to **Administrative** → **System Administration** (or click the "Administration" menu item)
- Click on the **Roles** tab

### 2. Edit an Existing Role
- Find the role you want to configure in the roles table
- Click the **Edit** button (pencil icon) for that role
- The role form will open with **two tabs**:
  - **Basic Info & Privileges** - Configure role name, description, and privileges
  - **Menu & Tab Access** - Configure which menus, sidebar items, and tabs the role can access

### 3. Configure Menu Access
- Click on the **"Menu & Tab Access"** tab
- You'll see:
  - **Top Menu Categories** - Collapsible cards for each category (Dashboard, Patient Care, etc.)
  - **Sidebar Items** - Expand each category to see and configure sidebar items
  - **Page Tabs** - Configure which tabs are visible in pages like Patient Profile, Vendor Details, etc.

### 4. Save Configuration
- Make your selections (check/uncheck categories, items, and tabs)
- Click **"Save Configuration"** at the bottom
- The changes will be applied immediately

## For New Roles

If you're creating a **new role**:

1. **Create the role first**:
   - Click "Add Role"
   - Fill in role name, description
   - Assign privileges
   - Click "Create Role"

2. **Then configure menu access**:
   - After creation, find the new role in the list
   - Click **Edit** on the newly created role
   - Now you'll see the **"Menu & Tab Access"** tab
   - Configure as needed

## Why This Design?

The menu configuration requires a `roleId` to save the settings to the database. Since new roles don't have an ID until they're created, the menu configuration tab only appears when editing existing roles.

## Troubleshooting

**Q: I don't see the "Menu & Tab Access" tab**
- Make sure you're **editing** an existing role, not creating a new one
- The role must have been saved at least once

**Q: The categories are empty**
- Check that the database migration was run successfully
- Verify the `role_menu_categories` table exists
- Default permissions should be set for all existing roles

**Q: Changes aren't saving**
- Check browser console for errors
- Verify API endpoint is accessible
- Check network tab for API responses

## Visual Guide

```
Administration Page
  └── Roles Tab
      └── Roles Table
          └── [Edit Button] → Role Form Dialog
              ├── Tab 1: Basic Info & Privileges
              └── Tab 2: Menu & Tab Access ← This is what you're looking for!
                  ├── Top Menu Categories (collapsible)
                  ├── Sidebar Items (within each category)
                  └── Page Tabs (for specific pages)
```

## Quick Access Path

**URL Pattern**: `/administration` → Click "Roles" tab → Click "Edit" on any role → Click "Menu & Tab Access" tab
