import { getCurrentUser } from "@/lib/auth";
import { persistRescheduleUsageToSupabase, persistSubscriptionToSupabase } from "@/lib/supabaseSync";

const SUBSCRIPTIONS_KEY = "servify_subscriptions";
const SUBSCRIPTION_EVENT = "servify-subscription-changed";
const RESCHEDULE_USAGE_KEY = "servify_reschedule_usage";
export const FREE_RESCHEDULE_LIMIT_NO_PLAN = 30;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const plans = [
  {
    id: "family-basic",
    name: "Family Basic",
    priceMonthly: 95,
    monthlyCredits: 100,
    discountPercent: 0,
    householdLimit: 2,
    freeReschedulesMonthly: 100,
    rolloverMonths: 0,
    priorityWindowHours: 2,
    benefits: ["Free access for 2 family members", "100 free reschedules for 1 month"],
    color: "from-orange-500 to-amber-500",
  },
  {
    id: "family-pro",
    name: "Family Pro",
    priceMonthly: 130,
    monthlyCredits: 200,
    discountPercent: 0,
    householdLimit: 4,
    freeReschedulesMonthly: 200,
    rolloverMonths: 1,
    priorityWindowHours: 6,
    benefits: ["Free access for 4 family members", "200 free reschedules for 1 month"],
    color: "from-slate-900 to-slate-700",
  },
];

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(SUBSCRIPTIONS_KEY) || "[]");
  } catch {
    return [];
  }
};

const write = (value) => {
  localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(value));

  const sessionUser = getCurrentUser();
  const activeSubscription = Array.isArray(value)
    ? value.find((item) => item.status === "active")
    : null;
  if (sessionUser?.id && activeSubscription) {
    void persistSubscriptionToSupabase({ activeSubscription, userId: sessionUser.id });
  }

  window.dispatchEvent(new Event(SUBSCRIPTION_EVENT));
};

export const subscriptionEvent = SUBSCRIPTION_EVENT;
export const subscriptionPlans = plans;

const nowIso = () => new Date().toISOString();

const addDaysIso = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const getPlanById = (planId) => plans.find((item) => item.id === planId) || null;

const readRescheduleUsage = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RESCHEDULE_USAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeRescheduleUsage = (value) => {
  localStorage.setItem(RESCHEDULE_USAGE_KEY, JSON.stringify(value));

  const sessionUser = getCurrentUser();
  const usage = value?.[sessionUser?.email || ""];
  if (sessionUser?.id && usage) {
    void persistRescheduleUsageToSupabase({ userId: sessionUser.id, usage });
  }
};

const resolveRescheduleLimitByEmail = (email) => {
  const active = getActiveSubscriptionByEmail(email);
  const plan = active ? getPlanById(active.planId) : null;
  return {
    limit: plan?.freeReschedulesMonthly || FREE_RESCHEDULE_LIMIT_NO_PLAN,
    hasActivePlan: Boolean(plan),
    activePlanId: plan?.id || null,
  };
};

const getUsageWindowForEmail = (email, shouldPersistReset = false) => {
  const allUsage = readRescheduleUsage();
  const now = Date.now();
  const record = allUsage[email];
  const startMs = record?.windowStart ? new Date(record.windowStart).getTime() : 0;
  const shouldReset = !record || Number.isNaN(startMs) || startMs <= 0 || now - startMs >= THIRTY_DAYS_MS;

  if (shouldReset) {
    const next = { windowStart: new Date(now).toISOString(), used: 0 };
    if (shouldPersistReset) {
      allUsage[email] = next;
      writeRescheduleUsage(allUsage);
    }
    return { allUsage, record: next };
  }

  return {
    allUsage,
    record: {
      windowStart: record.windowStart,
      used: Math.max(0, Number(record.used || 0)),
    },
  };
};

export const getActiveSubscriptionByEmail = (email) =>
  read().find((item) => (
    item.userEmail === email
    && item.status === "active"
    && (!item.renewsAt || new Date(item.renewsAt).getTime() > Date.now())
  )) || null;

export const getSubscriptionHistoryByEmail = (email) =>
  read().filter((item) => item.userEmail === email).sort((a, b) => b.startedAt.localeCompare(a.startedAt));

export const getSubscriptionUsageByEmail = (email) => {
  const active = getActiveSubscriptionByEmail(email);
  if (!active) {
    return {
      hasActive: false,
      creditsRemaining: 0,
      creditsTotal: 0,
      rolloverCredits: 0,
      creditsUsed: 0,
      savingsTotal: 0,
      householdMembers: [],
      recommendedPlanId: "family-basic",
      rescheduleAllowance: FREE_RESCHEDULE_LIMIT_NO_PLAN,
    };
  }

  const plan = getPlanById(active.planId);
  const creditsTotal = (active.creditWallet?.monthlyCredits || plan?.monthlyCredits || 0) + (active.creditWallet?.rolloverCredits || 0);
  const creditsRemaining = active.creditWallet?.balance || 0;
  const creditsUsed = Math.max(0, creditsTotal - creditsRemaining);

  return {
    hasActive: true,
    active,
    plan,
    creditsRemaining,
    creditsTotal,
    rolloverCredits: active.creditWallet?.rolloverCredits || 0,
    creditsUsed,
    savingsTotal: active.savings?.total || 0,
    householdMembers: active.householdMembers || [],
    recommendedPlanId: active.recommendedPlanId || active.planId,
    rescheduleAllowance: plan?.freeReschedulesMonthly || FREE_RESCHEDULE_LIMIT_NO_PLAN,
  };
};

export const subscribePlan = (userEmail, planId) => {
  const plan = plans.find((item) => item.id === planId);
  if (!plan) {
    throw new Error("Plan not found");
  }

  const records = read().filter((item) => item.userEmail !== userEmail || item.status !== "active");
  const previous = getSubscriptionHistoryByEmail(userEmail)[0];
  const rolloverCredits =
    previous && previous.status === "active" && plan.rolloverMonths > 0
      ? Math.min(4, previous.creditWallet?.balance || 0)
      : 0;

  records.unshift({
    id: `SUB-${Date.now().toString(36).toUpperCase()}`,
    userEmail,
    planId,
    status: "active",
    startedAt: nowIso(),
    renewsAt: addDaysIso(30),
    pausedAt: null,
    pauseUntil: null,
    householdMembers: [],
    creditWallet: {
      monthlyCredits: plan.monthlyCredits,
      rolloverCredits,
      balance: plan.monthlyCredits + rolloverCredits,
      topupCredits: 0,
      lastResetAt: nowIso(),
    },
    savings: {
      total: 0,
      thisMonth: 0,
      byBooking: [],
    },
    usage: {
      bookedWithCredits: 0,
      priorityBookingsUsed: 0,
    },
    recommendedPlanId: planId,
  });

  write(records);
  return records[0];
};

export const cancelSubscription = (userEmail) => {
  const records = read().map((item) =>
    item.userEmail === userEmail && item.status === "active"
      ? { ...item, status: "cancelled", cancelledAt: nowIso() }
      : item,
  );
  write(records);
};

export const pauseSubscription = (userEmail, pauseDays = 30) => {
  const records = read().map((item) => {
    if (item.userEmail !== userEmail || item.status !== "active") {
      return item;
    }

    return {
      ...item,
      status: "paused",
      pausedAt: nowIso(),
      pauseUntil: addDaysIso(Math.max(7, pauseDays)),
    };
  });
  write(records);
};

export const resumeSubscription = (userEmail) => {
  const records = read().map((item) => {
    if (item.userEmail !== userEmail || item.status !== "paused") {
      return item;
    }

    return {
      ...item,
      status: "active",
      pausedAt: null,
      pauseUntil: null,
      renewsAt: addDaysIso(30),
    };
  });
  write(records);
};

export const addHouseholdMember = (userEmail, memberLabel) => {
  const label = memberLabel.trim();
  if (!label) {
    throw new Error("Member name is required");
  }

  const records = read().map((item) => {
    if (item.userEmail !== userEmail || (item.status !== "active" && item.status !== "paused")) {
      return item;
    }

    const plan = getPlanById(item.planId);
    const members = item.householdMembers || [];
    if (members.length >= (plan?.householdLimit || 1)) {
      throw new Error("Household member limit reached for this plan");
    }
    if (members.includes(label)) {
      return item;
    }

    return {
      ...item,
      householdMembers: [...members, label],
    };
  });
  write(records);
};

export const removeHouseholdMember = (userEmail, memberLabel) => {
  const records = read().map((item) => {
    if (item.userEmail !== userEmail || (item.status !== "active" && item.status !== "paused")) {
      return item;
    }

    return {
      ...item,
      householdMembers: (item.householdMembers || []).filter((member) => member !== memberLabel),
    };
  });
  write(records);
};

export const addTopupCredits = (userEmail, credits = 1) => {
  const creditsToAdd = Math.max(1, Number(credits || 0));
  const records = read().map((item) => {
    if (item.userEmail !== userEmail || item.status !== "active") {
      return item;
    }

    return {
      ...item,
      creditWallet: {
        ...(item.creditWallet || {}),
        topupCredits: (item.creditWallet?.topupCredits || 0) + creditsToAdd,
        balance: (item.creditWallet?.balance || 0) + creditsToAdd,
      },
    };
  });
  write(records);
};

export const consumeCreditsForBooking = (userEmail, bookingId, credits = 1) => {
  let updatedRecord = null;
  const records = read().map((item) => {
    if (item.userEmail !== userEmail || item.status !== "active") {
      return item;
    }

    const balance = item.creditWallet?.balance || 0;
    const needed = Math.max(0, Number(credits || 0));
    if (needed === 0 || balance < needed) {
      return item;
    }

    updatedRecord = {
      ...item,
      creditWallet: {
        ...(item.creditWallet || {}),
        balance: balance - needed,
      },
      usage: {
        ...(item.usage || {}),
        bookedWithCredits: (item.usage?.bookedWithCredits || 0) + 1,
      },
    };
    return updatedRecord;
  });

  write(records);
  return updatedRecord;
};

export const recordSubscriptionSavings = (userEmail, bookingId, amountSaved = 0) => {
  const safeAmount = Math.max(0, Math.round(Number(amountSaved || 0)));
  if (!safeAmount) {
    return null;
  }

  let updatedRecord = null;
  const records = read().map((item) => {
    if (item.userEmail !== userEmail || (item.status !== "active" && item.status !== "paused")) {
      return item;
    }

    const savings = item.savings || { total: 0, thisMonth: 0, byBooking: [] };
    if ((savings.byBooking || []).some((entry) => entry.bookingId === bookingId)) {
      updatedRecord = item;
      return item;
    }

    updatedRecord = {
      ...item,
      savings: {
        total: savings.total + safeAmount,
        thisMonth: savings.thisMonth + safeAmount,
        byBooking: [...(savings.byBooking || []), { bookingId, amount: safeAmount, createdAt: nowIso() }],
      },
    };
    return updatedRecord;
  });

  write(records);
  return updatedRecord;
};

export const getRescheduleAllowanceStatus = (email) => {
  if (!email) {
    return {
      allowed: false,
      limit: FREE_RESCHEDULE_LIMIT_NO_PLAN,
      used: 0,
      remaining: 0,
      daysUntilReset: 30,
      hasActivePlan: false,
      activePlanId: null,
      windowStart: null,
    };
  }

  const { limit, hasActivePlan, activePlanId } = resolveRescheduleLimitByEmail(email);
  const { record } = getUsageWindowForEmail(email, true);
  const windowStartMs = new Date(record.windowStart).getTime();
  const remainingMs = Math.max(0, THIRTY_DAYS_MS - (Date.now() - windowStartMs));
  const daysUntilReset = Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
  const used = Math.max(0, Number(record.used || 0));
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    limit,
    used,
    remaining,
    daysUntilReset,
    hasActivePlan,
    activePlanId,
    windowStart: record.windowStart,
  };
};

export const consumeRescheduleAllowance = (email, count = 1) => {
  if (!email) {
    return getRescheduleAllowanceStatus(email);
  }

  const consumeCount = Math.max(1, Number(count || 1));
  const { limit, hasActivePlan, activePlanId } = resolveRescheduleLimitByEmail(email);
  const { allUsage, record } = getUsageWindowForEmail(email, true);
  const used = Math.max(0, Number(record.used || 0));

  if (used + consumeCount > limit) {
    return getRescheduleAllowanceStatus(email);
  }

  const nextUsed = used + consumeCount;
  allUsage[email] = {
    windowStart: record.windowStart,
    used: nextUsed,
  };
  writeRescheduleUsage(allUsage);

  const windowStartMs = new Date(record.windowStart).getTime();
  const remainingMs = Math.max(0, THIRTY_DAYS_MS - (Date.now() - windowStartMs));
  return {
    allowed: nextUsed < limit,
    limit,
    used: nextUsed,
    remaining: Math.max(0, limit - nextUsed),
    daysUntilReset: Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000))),
    hasActivePlan,
    activePlanId,
    windowStart: record.windowStart,
  };
};

export const recommendSubscriptionPlan = ({ monthlyBookings = 0, familyMembers = 1 }) => {
  if (monthlyBookings >= 4 || familyMembers > 2) {
    return "family-pro";
  }
  return "family-basic";
};
