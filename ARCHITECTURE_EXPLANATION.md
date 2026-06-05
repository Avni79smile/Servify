# SERVIFY - Complete Architecture & Database Integration Guide

## 📋 Table of Contents
1. [Tech Stack](#tech-stack)
2. [System Architecture](#system-architecture)
3. [Authentication Flow](#authentication-flow)
4. [Data Flow & Integration](#data-flow--integration)
5. [Database Schema](#database-schema)
6. [Key Features Implementation](#key-features-implementation)
7. [How Everything is Connected](#how-everything-is-connected)

---

## 1. Tech Stack

### **Frontend**
- **React 18** - UI library
- **Vite** - Build tool (fast development)
- **Tailwind CSS** - Styling
- **Shadcn UI** - Component library
- **React Router** - Page navigation
- **Sonner** - Toast notifications

### **Backend**
- **Supabase** - Complete backend platform
  - PostgreSQL database
  - Authentication (Auth0-compatible)
  - Real-time subscriptions
  - Row Level Security (RLS)
  - REST API

### **Storage**
- **Browser LocalStorage** - Client-side cache (fast, offline)
- **Supabase PostgreSQL** - Cloud database (persistent, shared)

### **Build & Deployment**
- **Node.js** - JavaScript runtime
- **npm/Bun** - Package manager
- **GitHub** - Version control

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER BROWSER                         │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │           React Application (Frontend)           │  │
│  │  ├─ Pages (SubscriptionPlans, BookService, etc) │  │
│  │  ├─ Components (UI Elements)                     │  │
│  │  └─ State Management (React Hooks)              │  │
│  └──────────────────────────────────────────────────┘  │
│                       ↕ (API Calls)                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │       Browser LocalStorage (Offline Cache)       │  │
│  │  ├─ subscriptions                               │  │
│  │  ├─ bookings                                    │  │
│  │  ├─ chats                                       │  │
│  │  ├─ notifications                              │  │
│  │  └─ career_applications                        │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                   ↕ (REST API + Auth)
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE (Backend)                   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │          PostgreSQL Database                     │  │
│  │  Tables:                                         │  │
│  │  ├─ auth.users (authentication)                │  │
│  │  ├─ public.profiles (user info)                │  │
│  │  ├─ public.user_subscriptions (premium plans)  │  │
│  │  ├─ public.bookings (service bookings)         │  │
│  │  ├─ public.booking_chats (booking messages)    │  │
│  │  ├─ public.career_applications (job apps)      │  │
│  │  ├─ public.career_chats (career messages)      │  │
│  │  ├─ public.services (service listings)         │  │
│  │  └─ public.providers (professional profiles)   │  │
│  └──────────────────────────────────────────────────┘  │
│                       ↓                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │        Authentication (JWT Tokens)               │  │
│  │  ├─ signup/login                               │  │
│  │  ├─ password reset                             │  │
│  │  └─ session management                         │  │
│  └──────────────────────────────────────────────────┘  │
│                       ↓                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │   Row Level Security (RLS Policies)              │  │
│  │  ├─ Users see only their own data              │  │
│  │  ├─ Admins see all data                        │  │
│  │  └─ Anonymous can view public data             │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Authentication Flow

### **How Users Log In:**

```
1. User clicks "Login" button
   ↓
2. User enters email + password
   ↓
3. Frontend sends to Supabase Auth API
   ↓
4. Supabase creates JWT token
   ↓
5. Token stored in browser
   ↓
6. Supabase creates auth.users record
   ↓
7. Trigger function creates profiles record
   ↓
8. User logged in! ✅
```

### **Code Flow:**

**File:** `src/lib/auth.js`

```javascript
// 1. Login function
export const loginUser = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  
  // 2. Sync to localStorage
  const sessionUser = buildSessionUser(data.user);
  setCurrentUser(sessionUser);
  
  // 3. Hydrate data from database
  void hydrateBookingsFromSupabase({ 
    userId: sessionUser.id, 
    userEmail: sessionUser.email 
  });
  
  return sessionUser;
};
```

### **Database Trigger:**

When a user signs up, this SQL trigger runs automatically:

```sql
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- This function creates a profile for new users
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    new.user_metadata->>'full_name',
    new.email,
    'user'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 4. Data Flow & Integration

### **Subscription Purchase Flow:**

```
┌─────────────────────────────────────────┐
│ User clicks "Complete Purchase"         │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ SubscriptionPlans.jsx                   │
│ completePlanPurchase() runs             │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ subscribePlan() [LOCAL]                 │
│ ├─ Add to localStorage                  │
│ ├─ Update UI state                      │
│ └─ Emit subscription-changed event      │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ persistSubscriptionToSupabase()          │
│ ├─ Check auth session                   │
│ ├─ Cancel old subscriptions              │
│ └─ Insert new subscription to DB        │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ Supabase API receives request           │
│ ├─ Validates JWT token                  │
│ ├─ Checks RLS policy                    │
│ └─ Inserts row to user_subscriptions    │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ Success! ✅                              │
│ ├─ Show "Payment successful" toast      │
│ ├─ User's subscription is active        │
│ └─ Data persists in database            │
└─────────────────────────────────────────┘
```

### **Code Implementation:**

**File:** `src/pages/SubscriptionPlans.jsx`

```javascript
const completePlanPurchase = async () => {
  const plan = selectedPlan;
  
  // 1. Validate user is logged in
  if (!currentUser?.email || !currentUser?.id) {
    toast.error("Missing user information. Please login again.");
    return;
  }
  
  try {
    // 2. Subscribe locally (fast response to user)
    subscribePlan(currentUser.email, plan.id);
    const latestActive = getActiveSubscriptionByEmail(currentUser.email);
    
    // 3. Update UI state
    setActive(latestActive);
    setUsage(getSubscriptionUsageByEmail(currentUser.email));
    
    // 4. Persist to database (async, waits for response)
    await persistSubscriptionToSupabase({ 
      activeSubscription: latestActive, 
      userId: currentUser.id 
    });
    
    // 5. Show success
    toast.success(`Payment successful. ${plan.name} activated.`);
    
  } catch (err) {
    // 6. Show error if persistence fails
    toast.error(`Failed to save subscription: ${err?.message}`);
  }
};
```

**File:** `src/data/subscriptions.js`

```javascript
// Local storage management
const write = (value) => {
  localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(value));
  
  // Also persist to Supabase
  const sessionUser = getCurrentUser();
  if (sessionUser?.id && value) {
    void persistSubscriptionToSupabase({ 
      activeSubscription: value, 
      userId: sessionUser.id 
    });
  }
  
  // Notify UI to update
  window.dispatchEvent(new Event(SUBSCRIPTION_EVENT));
};
```

**File:** `src/lib/supabaseSync.js`

```javascript
export const persistSubscriptionToSupabase = async ({ 
  activeSubscription, 
  userId 
}) => {
  // 1. Validate inputs
  if (!activeSubscription || !userId) return;
  
  try {
    // 2. Ensure auth session is ready
    const { data: sessionData } = await supabase.auth.getSession();
    
    // 3. Cancel previous subscriptions
    if (activeSubscription.status === "active") {
      await supabase
        .from("user_subscriptions")
        .update({ status: "cancelled" })
        .eq("user_id", userId)
        .eq("status", "active");
    }
    
    // 4. Prepare data for database
    const payload = {
      user_id: userId,
      plan_id: planToDbPlan(activeSubscription.planId),
      status: activeSubscription.status || "active",
      started_at: activeSubscription.startedAt || new Date().toISOString(),
      renews_at: activeSubscription.renewsAt || new Date(...).toISOString(),
      paused_at: activeSubscription.pausedAt || null,
      pause_until: activeSubscription.pauseUntil || null,
    };
    
    // 5. Insert into database
    const { data, error } = await supabase
      .from("user_subscriptions")
      .insert([payload]);
    
    // 6. Handle response
    if (error) {
      logger.supabase.error("Subscription save failed:", {
        code: error.code,
        message: error.message,
      });
      throw new Error(`Failed to save: ${error.message}`);
    }
    
    logger.supabase.success("Subscription saved successfully");
    return { success: true, data };
    
  } catch (err) {
    logger.supabase.error("Exception:", err?.message);
    throw err;
  }
};
```

---

## 5. Database Schema

### **Core Tables:**

#### **auth.users** (Managed by Supabase)
```sql
-- Created by Supabase Auth system
id UUID PRIMARY KEY
email TEXT UNIQUE NOT NULL
encrypted_password TEXT
email_confirmed_at TIMESTAMP
user_metadata JSONB  -- Stores full_name, avatar_url, etc
created_at TIMESTAMP DEFAULT NOW()
```

#### **public.profiles** (User Information)
```sql
id UUID PRIMARY KEY REFERENCES auth.users(id)
full_name TEXT
email TEXT
avatar_url TEXT
role TEXT DEFAULT 'user'  -- 'user' or 'admin'
created_at TIMESTAMP DEFAULT NOW()

-- RLS Policy: Users see only their own profile
-- Admin sees all profiles
```

#### **public.user_subscriptions** (Premium Plans)
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
plan_id TEXT NOT NULL  -- 'family-basic', 'family-pro', 'pro'
status TEXT DEFAULT 'active'  -- 'active', 'paused', 'cancelled'
started_at TIMESTAMP
renews_at TIMESTAMP
paused_at TIMESTAMP
pause_until TIMESTAMP
created_at TIMESTAMP DEFAULT NOW()

-- RLS Policy: Users see only their subscriptions
-- Admins see all subscriptions
```

#### **public.bookings** (Service Bookings)
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
provider_id UUID REFERENCES providers(id)
service_id UUID REFERENCES services(id)
status TEXT DEFAULT 'pending'  -- 'pending', 'confirmed', 'completed'
scheduled_at TIMESTAMP
created_at TIMESTAMP DEFAULT NOW()

-- RLS Policy: Users see their bookings, providers see their bookings
```

#### **public.booking_chats** (Chat Messages)
```sql
id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE
sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
sender_email TEXT
sender_name TEXT
message_text TEXT NOT NULL
created_at TIMESTAMP DEFAULT NOW()

-- RLS Policy: Allow all authenticated users to read/write
```

#### **public.services** (Service Listings)
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
slug TEXT UNIQUE
title TEXT
description TEXT
category TEXT
price_range TEXT
created_at TIMESTAMP DEFAULT NOW()
```

#### **public.providers** (Professional Profiles)
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
email TEXT UNIQUE NOT NULL
full_name TEXT
expertise TEXT[]  -- Array of skills
rating DECIMAL(3,2)
reviews_count INT DEFAULT 0
created_at TIMESTAMP DEFAULT NOW()
```

---

## 6. Key Features Implementation

### **A. Subscription System**

**How it works:**

1. **Local State** - Subscriptions stored in localStorage for instant access
2. **Database Persistence** - Also saved to `user_subscriptions` table
3. **Benefits** - Users get premium features: more bookings, priority support
4. **Automatic Cancellation** - Old subscriptions marked as "cancelled" when new one purchased

**Flow:**
```
User selects plan
  → Save to localStorage (instant)
  → Show success toast
  → Save to Supabase (background)
  → Next login: load from database
```

### **B. Chat System**

**How it works:**

1. **Booking Chats** - Messages within a booking conversation
2. **Career Chats** - Messages within a job application
3. **Real-time** - Uses Supabase real-time subscriptions (optional)
4. **Persistence** - All messages saved to database

**Tables:**
- `booking_chats` - Messages about service bookings
- `career_chats` - Messages about job applications

**Code:**
```javascript
// src/data/marketplace.js
export const sendChatMessage = ({ bookingId, senderEmail, senderName, text }) => {
  // 1. Create message object
  const message = {
    id: crypto.randomUUID(),
    bookingId,
    senderEmail,
    senderName,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  
  // 2. Save to localStorage immediately
  const messages = readJson(CHATS_KEY, []);
  messages.push(message);
  writeJson(CHATS_KEY, messages);
  
  // 3. Persist to database (background)
  if (sessionUser?.id) {
    void persistMarketplaceChatToSupabase({ 
      message, 
      userId: sessionUser.id 
    });
  }
};
```

### **C. Career Applications**

**How it works:**

1. User applies for a job/career
2. Creates row in `career_applications` table
3. User can send messages to admin
4. Admin can review and approve

**Table Structure:**
```sql
career_applications (
  id, user_id, user_name, user_email, phone, city,
  experience_years, why_join, status, created_at
)
```

---

## 7. How Everything is Connected

### **Data Synchronization:**

```
┌──────────────────┐
│  Browser Cache   │
│  (localStorage)  │
└────────┬─────────┘
         │ Fast reads
         │ Quick writes
         ↓
┌──────────────────┐        ┌──────────────────┐
│  React State     │←---────│  Supabase DB     │
│  (in-memory)     │ Syncs  │  (PostgreSQL)    │
└────────┬─────────┘        └──────────────────┘
         │                         ↑
         │ Display updates         │ Persistent storage
         ↓                         │
    ┌─────────┐          On login: hydrate
    │   UI    │          On change: persist
    └─────────┘
```

### **Complete User Journey:**

```
1. USER VISITS APP
   ├─ App loads React
   ├─ Checks localStorage for user
   └─ No user? Show login screen

2. USER LOGS IN
   ├─ Sends email + password to Supabase
   ├─ Supabase validates & returns JWT token
   ├─ App stores token + user info in localStorage
   └─ App hydrates data from Supabase

3. USER BUYS SUBSCRIPTION
   ├─ Clicks "Complete Purchase"
   ├─ App saves to localStorage (instant)
   ├─ Shows "Payment successful" toast
   ├─ App sends to Supabase in background
   └─ Supabase stores in user_subscriptions table

4. USER BOOKS A SERVICE
   ├─ Creates booking locally
   ├─ Sends to Supabase
   └─ Supabase RLS checks: user_id matches? → Allow

5. USER SENDS CHAT MESSAGE
   ├─ App creates message locally
   ├─ Shows in chat UI immediately
   ├─ Sends to Supabase in background
   └─ Supabase inserts into booking_chats

6. USER LOGS OUT
   ├─ Clears localStorage
   ├─ Clears React state
   └─ Clears auth token

7. USER LOGS BACK IN
   ├─ App loads from Supabase database
   ├─ All subscriptions, bookings, chats restored
   └─ User sees exact same state as before
```

---

## 8. Security Implementation

### **Row Level Security (RLS):**

```sql
-- Example: Users can only see their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.user_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can see all
CREATE POLICY "Admins can view all"
  ON public.user_subscriptions
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

**How it works:**
1. User makes database request with JWT token
2. Supabase extracts `auth.uid()` from token
3. RLS policy checks: Does data belong to user?
4. If no → returns 403 Forbidden
5. If yes → returns data

### **Authentication:**

- **JWT Tokens** - Secure, stateless authentication
- **Password Hashing** - Bcrypt (done by Supabase)
- **HTTPS Only** - All requests encrypted
- **Session Storage** - Token stored in localStorage

---

## 9. Tech Integration Summary

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | React 18 | User interface |
| Build | Vite | Fast bundling |
| Styling | Tailwind CSS | Responsive design |
| UI Components | Shadcn/ui | Pre-built elements |
| Routing | React Router | Page navigation |
| Backend | Supabase | Database + Auth |
| Database | PostgreSQL | Data persistence |
| Authentication | Supabase Auth | User login/signup |
| Security | RLS Policies | Data isolation |
| API | REST + Real-time | Frontend-backend communication |
| Cache | localStorage | Offline support |
| Notifications | Sonner | Toast messages |

---

## 10. How to Explain This to Your Teacher

### **Simple Summary:**

**"Servify is a service marketplace built with modern web technologies. Here's how it works:"**

1. **Frontend (React):** Users interact with a beautiful, responsive interface. All data is displayed using React components and state management.

2. **Local Cache (localStorage):** When users load data, it's stored in their browser for instant access and offline support.

3. **Backend (Supabase):** A complete backend service that provides:
   - PostgreSQL database for permanent data storage
   - Authentication system for user login/signup
   - REST API for frontend-backend communication
   - Row Level Security to ensure users only see their own data

4. **Data Flow:**
   - User performs action (buy subscription, send chat, book service)
   - App saves locally first (fast response)
   - App sends to Supabase in background (persistent storage)
   - On next login, data is restored from database

5. **Security:**
   - JWT tokens for authentication
   - RLS policies to prevent unauthorized data access
   - HTTPS encryption for all requests

6. **Key Features:**
   - Subscriptions for premium plans
   - Booking system for services
   - Chat messaging
   - Career applications
   - Real-time notifications

---

## 11. Important Files Reference

| File | Purpose |
|------|---------|
| `src/lib/auth.js` | Authentication logic |
| `src/lib/supabaseSync.js` | Database synchronization |
| `src/pages/SubscriptionPlans.jsx` | Subscription UI |
| `src/data/subscriptions.js` | Subscription business logic |
| `src/data/marketplace.js` | Chat & booking logic |
| `src/utils/supabase.js` | Supabase client initialization |
| `.env` | Environment variables (API keys) |

---

**This is your complete system architecture!** All pieces work together to create a robust, scalable marketplace application. 🚀
