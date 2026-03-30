# ⚠️ Temporary Configuration - Hidden Menus

**Date:** October 23, 2025  
**Reason:** Focus on Payouts module development  
**Status:** TEMPORARY

---

## 🚫 Currently Hidden

The following menus are temporarily hidden during development:

- **Home** (`/`) - Dashboard with metrics and quick actions
- **Receive** (`/receive`) - Payment links and commerce link
- **Activity** (`/activity`) - All transactions with filters

## ✅ Currently Active

- **Payouts** (`/payouts`) - Main focus for development
  - Default route when accessing `/`
  - Only visible menu in navigation

---

## 🔄 How to Restore All Menus

When ready to restore all functionality, follow these steps:

### Step 1: Restore Navigation Menu

**File:** `frontend/components/main-nav.tsx`

**Current (Hidden):**

```typescript
// TEMPORARY: Only Payouts menu visible for development
// To restore all menus, see docs/TEMPORARY_CONFIG.md
const navItems = [
  // { href: "/", label: "Home", icon: Home }, // HIDDEN: Temporarily disabled
  // { href: "/receive", label: "Receive", icon: QrCode }, // HIDDEN: Temporarily disabled
  { href: "/payouts", label: "Payouts", icon: Receipt },
  // { href: "/activity", label: "Activity", icon: Activity }, // HIDDEN: Temporarily disabled
];
```

**Restore to:**

```typescript
const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/receive", label: "Receive", icon: QrCode },
  { href: "/payouts", label: "Payouts", icon: Receipt },
  { href: "/activity", label: "Activity", icon: Activity },
];
```

### Step 2: Restore Home Page

**File:** `frontend/app/page.tsx`

**Current (Redirect to Payouts):**

```typescript
"use client";

// TEMPORARY: Redirect to /payouts during development
// To restore Home page, see docs/TEMPORARY_CONFIG.md

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/payouts");
  }, [router]);

  return null;
}

// ORIGINAL HOME PAGE CODE - COMMENTED OUT TEMPORARILY
// Uncomment this and remove the redirect above to restore Home page
/* ... original code ... */
```

**Restore to:**

1. **Delete** lines 1-17 (redirect code)
2. **Uncomment** the entire block starting with `/*` (line 21)
3. **Remove** the closing `*/` at the end

### Step 3: Verify All Pages Work

After restoring, test all routes:

- ✅ `/` - Should show Home dashboard
- ✅ `/payouts` - Should show Payouts list
- ✅ `/receive` - Should show Receive options
- ✅ `/receive/links` - Should show Payment Links
- ✅ `/receive/commerce-link` - Should show Commerce Link
- ✅ `/receive/developers` - Should show Developers (Coming Soon)
- ✅ `/activity` - Should show Activity list
- ✅ `/account` - Should show Account profile

---

## 📁 Files Modified (Temporary Changes)

| File                                | Change                 | Status                  |
| ----------------------------------- | ---------------------- | ----------------------- |
| `frontend/components/main-nav.tsx`  | Hidden 3 menu items    | Commented out           |
| `frontend/app/page.tsx`             | Redirect to `/payouts` | Original code preserved |
| `frontend/docs/TEMPORARY_CONFIG.md` | This document          | NEW                     |

---

## 🔍 Pages Still Accessible (Not Deleted)

All page files remain intact and functional:

### Home Module

- ✅ `frontend/app/page.tsx` - Code commented but preserved
- ✅ `frontend/components/quick-actions.tsx` - Fully functional
- ✅ `frontend/components/home-metrics.tsx` - Fully functional
- ✅ `frontend/components/recent-activity.tsx` - Fully functional

### Receive Module

- ✅ `frontend/app/receive/page.tsx` - Fully functional
- ✅ `frontend/app/receive/links/page.tsx` - Fully functional
- ✅ `frontend/app/receive/commerce-link/page.tsx` - Fully functional
- ✅ `frontend/app/receive/developers/page.tsx` - Fully functional
- ✅ `frontend/components/create-payment-link-dialog.tsx` - Fully functional
- ✅ `frontend/components/qr-modal.tsx` - Fully functional

### Activity Module

- ✅ `frontend/app/activity/page.tsx` - Fully functional
- ✅ `frontend/components/activity-list.tsx` - Fully functional

### Payouts Module (Active)

- ✅ `frontend/app/payouts/page.tsx` - **ACTIVE**
- ✅ `frontend/components/create-payout-dialog.tsx` - **ACTIVE**
- ✅ `frontend/components/create-payout/` - **ACTIVE**
- ✅ `frontend/components/payouts-list.tsx` - **ACTIVE**

---

## ⚡ Quick Restore Command

If you need to restore everything quickly:

```bash
# Navigate to frontend directory
cd frontend

# Open the two files that need changes
# 1. components/main-nav.tsx - Uncomment the 3 hidden menu items
# 2. app/page.tsx - Replace redirect with commented original code
```

---

## 📝 Notes

- **No code was deleted** - Everything is preserved
- **Easy to restore** - Just uncomment lines
- **No breaking changes** - All dependencies remain intact
- **Clean separation** - Only navigation is affected

---

## 🎯 Current Focus

During this temporary configuration:

- **Payouts module** is being fully developed
- **Squid integration** is being implemented
- **Balance tracking** is being perfected
- **Backend integration** is being completed

Once Payouts is complete, all other modules will be restored.

---

**Last Updated:** October 23, 2025  
**To Remove This Config:** Delete this file after restoring menus
