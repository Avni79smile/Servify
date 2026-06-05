# Supabase Database Fix Guide

## Overview
These SQL scripts fix RLS (Row Level Security) policies and table structure issues preventing your app from working properly.

## What's Broken
- ❌ **403 Forbidden errors** on profile inserts (RLS too restrictive)
- ❌ **400 Bad Request** on bookings/applications (schema mismatch)
- ❌ **Career applications** can't be submitted because RLS blocks inserts

## How to Fix

### Step 1: Open Supabase SQL Editor
1. Go to https://app.supabase.com
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run the Scripts IN ORDER

#### Script 1: Fix RLS Policies (5 min)
📄 **File:** `01-fix-rls-policies.sql`
- Creates the `is_admin()` helper function
- Fixes RLS on profiles, providers, and bookings tables
- Adds missing columns

**How to run:**
1. Open `01-fix-rls-policies.sql`
2. Copy ALL the SQL
3. Paste into Supabase SQL Editor
4. Click **Run**
5. ✅ Should see success (no errors)

---

#### Script 2: Fix Career Applications (5 min)
📄 **File:** `02-fix-career-applications.sql`
- Creates career_applications table with correct structure
- Removes ALL conflicting RLS policies
- Creates clean, simple policies
- **THIS IS THE MOST IMPORTANT ONE FOR YOUR ISSUE**

**How to run:**
1. Open `02-fix-career-applications.sql`
2. Copy ALL the SQL
3. Paste into Supabase SQL Editor
4. Click **Run**
5. ✅ Should see success

---

#### Script 3: Run Health Check (2 min)
📄 **File:** `03-health-check.sql`
- Verifies all tables and RLS policies
- Shows counts and data integrity

**How to run:**
1. Open `03-health-check.sql`
2. Copy a section (e.g., "CHECK BOOKINGS TABLE STATUS")
3. Paste and run in Supabase SQL Editor
4. Review results (all counts should be 0 for errors)

---

## Expected Results After Running

### ✅ What Should Work Now:
- Career applications submit without 403 errors
- Profiles can be created/updated without RLS blocks
- All tables respect proper permissions

### ✅ RLS Behavior:
- **Users** can see/edit only their own data
- **Admins** can see everything
- **Anonymous** users can create profiles (for signup flow)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `function is_admin() not found` | Run script 1 first and ensure it completed |
| `policy already exists` | Script 2 drops old policies first, so it's safe to re-run |
| `Permission denied` | You need Supabase **owner** role to modify RLS |
| Still seeing 403 errors | Run health check to verify policies exist |

---

## Key Changes Made

### profiles table:
- ✅ Allows users to insert/update their own profile
- ✅ Allows anonymous profiles (for signup)
- ❌ Removed overly restrictive policies

### bookings table:
- ✅ Users can only see their own bookings
- ✅ Admins can see all
- ✅ Added service_title, provider_name, provider_email columns
- ❌ Made provider_id optional

### career_applications table:
- ✅ Users can insert their own applications
- ✅ Admins can see/edit all applications
- ✅ Clean, simple policies (removed conflicts)
- ❌ All old conflicting policies dropped

---

## After Fixing

1. **Reload your app** (Ctrl+Shift+R in browser)
2. **Try submitting a career application** - should work now! 🎉
3. **Check browser console** - no more 403/400 errors
4. **Verify in Supabase** - view the data in table browser

---

## Files Location
```
supabase/sql/
  ├── 01-fix-rls-policies.sql          (Run first)
  ├── 02-fix-career-applications.sql   (Run second)
  └── 03-health-check.sql              (Run last to verify)
```

---

Questions? All scripts are safe to re-run multiple times! 🚀
