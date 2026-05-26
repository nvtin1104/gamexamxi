# Plan: Modern Header + Sidebar Bug Fixes

## Overview
Three tasks: modernize the dashboard header, fix sidebar rail hover border bug, fix sidebar hover scope.

## Task 1: Fix Sidebar Hover Border Bug (SidebarRail)

**File:** `apps/dashboard/src/components/ui/sidebar.tsx` (lines 284-311)

**Problem:** The `SidebarRail` component uses `hover:after:bg-sidebar-border` which creates a visible 2px border line on hover across the entire sidebar height. This appears as a right border showing up when hovering anywhere near the sidebar edge.

**Fix:** Remove `hover:after:bg-sidebar-border` from the SidebarRail className. The rail should still be clickable for toggling but should not show a visual border on hover.

**Change in SidebarRail className (line 299):**
- Remove: `hover:after:bg-sidebar-border`
- The rest of the rail functionality (click to toggle) remains unchanged.

## Task 2: Fix Sidebar Hover Scope

**File:** `apps/dashboard/src/components/dashboard/AppSidebar.tsx` (line 287)

**Problem:** `AppSidebar` has `className="border-r border-sidebar-border"` which is redundant - the `Sidebar` primitive in `ui/sidebar.tsx` already applies `group-data-[side=left]:border-r` on its inner fixed container (line 240).

**Fix:** Remove `border-r border-sidebar-border` from AppSidebar to eliminate the duplicate border. The sidebar border is already handled by the primitive.

## Task 3: Modern Header with Search & Notifications

**File:** `apps/dashboard/src/components/Header.tsx`

**New dependencies to install:**
- `cmdk` (for command palette)
- `@radix-ui/react-popover` (for notifications popover)

**New UI components to create:**
1. `apps/dashboard/src/components/ui/breadcrumb.tsx` - shadcn Breadcrumb component
2. `apps/dashboard/src/components/ui/command.tsx` - shadcn Command component (wraps cmdk)
3. `apps/dashboard/src/components/ui/popover.tsx` - shadcn Popover component
4. `apps/dashboard/src/components/ui/dialog.tsx` - shadcn Dialog component (needed by Command)

**Dialog component does NOT exist yet** - Command depends on it. `@radix-ui/react-dialog` is installed (v1.1.15). Need to create `ui/dialog.tsx`.

**Header redesign:**
- Add `sticky top-0 z-10` for fixed positioning
- Replace static `<h2>` title with `Breadcrumb` component
- Replace basic search `Input` with a trigger button that opens `CommandDialog`
  - Shows placeholder text "Search..." with `Ctrl+K` badge
  - Opens command palette with categories: Pages, Users, Settings
  - Keyboard shortcut Ctrl+K / Cmd+K
- Replace static Bell icon with `Popover` containing notifications list:
  - Header: "Notifications" + "Mark all read" button
  - Mock notification items with avatar, message, time, read/unread state
  - "View all" link at bottom
  - Unread count badge on the bell icon

## Implementation Order
1. Install deps: `pnpm add cmdk @radix-ui/react-popover` (DONE)
2. Check/create Dialog UI component
3. Create Breadcrumb, Command, Popover UI components
4. Fix SidebarRail hover border
5. Fix AppSidebar duplicate border
6. Rewrite Header.tsx
7. Verify build
