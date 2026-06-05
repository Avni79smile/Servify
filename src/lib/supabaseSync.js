import { supabase } from "@/utils/supabase";
import { logger } from "@/lib/debugLogger";

const BOOKINGS_KEY = "servify_bookings";
const BOOKINGS_MIRROR_KEY = "servify_bookings_persist";
const SUBSCRIPTIONS_KEY = "servify_subscriptions";
const CAREER_APPLICATIONS_KEY = "servify_career_applications";
const RESCHEDULE_USAGE_KEY = "servify_reschedule_usage";
const REVIEWS_KEY = "servify_reviews";
const NOTIFICATIONS_KEY = "servify_notifications";
const METRICS_KEY = "servify_metrics";
const CHATS_KEY = "servify_chats";
const CAREER_NOTIFICATIONS_KEY = "servify_career_notifications";
const CAREER_CHATS_KEY = "servify_career_chats";

const hasSupabaseConfig = () => Boolean(import.meta.env.VITE_SUPABASE_URL) && Boolean(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));

const planToDbPlan = (planId) => {
  if (planId === "family-basic") return "starter-home";
  if (planId === "family-pro") return "family-plus";
  return planId;
};

const dbPlanToAppPlan = (planId) => {
  if (planId === "starter-home") return "family-basic";
  if (planId === "family-plus") return "family-pro";
  return planId;
};

const getServiceMaps = async () => {
  const { data, error } = await supabase.from("services").select("id, slug");
  if (error) {
    console.warn("Service map fetch failed:", error.message);
    return { slugToId: new Map(), idToSlug: new Map() };
  }

  const slugToId = new Map();
  const idToSlug = new Map();
  (data || []).forEach((row) => {
    slugToId.set(row.slug, row.id);
    idToSlug.set(row.id, row.slug);
  });

  return { slugToId, idToSlug };
};

const ensureServiceIdBySlug = async ({ slug, title = "" }) => {
  const targetSlug = String(slug || "").trim().toLowerCase();
  if (!targetSlug) return null;

  const { data: existing, error: selectError } = await supabase
    .from("services")
    .select("id")
    .eq("slug", targetSlug)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  if (selectError) {
    console.warn("Service lookup failed:", selectError.message);
  }

  const { error: insertError } = await supabase.from("services").insert([
    {
      slug: targetSlug,
      title: (title || targetSlug).trim() || targetSlug,
      description: `Service listing for ${(title || targetSlug).trim() || targetSlug}`,
    },
  ]);

  if (insertError) {
    console.warn("Service auto-create failed:", insertError.message);
  }

  const { data: created } = await supabase
    .from("services")
    .select("id")
    .eq("slug", targetSlug)
    .maybeSingle();

  return created?.id || null;
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const titleCase = (value = "") =>
  String(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const toSlug = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const providerNameFromEmail = (email = "") => {
  const local = String(email).split("@")[0] || "Professional";
  return titleCase(local.replace(/[._-]+/g, " ")) || "Professional";
};

const getProviderIdByEmail = async (email) => {
  const targetEmail = normalizeEmail(email);
  if (!targetEmail) return null;

  const { data, error } = await supabase.from("providers").select("id").eq("email", targetEmail).maybeSingle();
  if (error) {
    console.warn("Provider lookup failed:", error.message);
    return null;
  }
  return data?.id || null;
};

const ensureProviderIdByEmail = async ({ email, fullName = "" }) => {
  const targetEmail = normalizeEmail(email);
  if (!targetEmail) return null;

  const existing = await getProviderIdByEmail(targetEmail);
  if (existing) return existing;

  const payload = {
    email: targetEmail,
    full_name: (fullName || "").trim() || providerNameFromEmail(targetEmail),
  };

  const { error: insertError } = await supabase.from("providers").insert([payload]);
  if (insertError) {
    console.warn("Provider auto-create failed:", insertError.message);
  }

  return await getProviderIdByEmail(targetEmail);
};

const setLocalArray = (key, value) => {
  const payload = JSON.stringify(Array.isArray(value) ? value : []);
  localStorage.setItem(key, payload);
  if (key === BOOKINGS_KEY) {
    localStorage.setItem(BOOKINGS_MIRROR_KEY, payload);
  }
};

const getLocalArray = (key) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const mergeUserRowsById = ({ key, userEmail, incoming }) => {
  const targetEmail = normalizeEmail(userEmail);
  const existing = getLocalArray(key);
  const others = existing.filter((item) => normalizeEmail(item?.userEmail) !== targetEmail);
  const existingForUser = existing.filter((item) => normalizeEmail(item?.userEmail) === targetEmail);

  const incomingById = new Map(
    (incoming || [])
      .filter((item) => item?.id)
      .map((item) => [item.id, item]),
  );

  // Keep unsynced local rows that are not present in remote hydration yet.
  existingForUser.forEach((item) => {
    if (item?.id && !incomingById.has(item.id)) {
      incomingById.set(item.id, item);
    }
  });

  return [...others, ...Array.from(incomingById.values())];
};

const normalizeNotificationType = (type) => {
  const allowed = new Set(["general", "booking", "subscription", "dispute", "refund", "career"]);
  if (allowed.has(type)) return type;
  if (type === "appointment_alert") return "booking";
  return "general";
};

const mergeRowsById = (primaryRows = [], secondaryRows = []) => {
  const map = new Map();
  secondaryRows.forEach((row) => {
    if (row?.id) map.set(row.id, row);
  });
  primaryRows.forEach((row) => {
    if (row?.id) map.set(row.id, row);
  });
  return Array.from(map.values());
};

const BOOKING_SYNC_ERROR_KEY = "servify_last_booking_sync_error";
const CAREER_SYNC_ERROR_KEY = "servify_last_career_sync_error";

const setBookingSyncError = (message = "") => {
  const normalized = String(message || "").trim();
  if (!normalized) {
    localStorage.removeItem(BOOKING_SYNC_ERROR_KEY);
    return;
  }
  localStorage.setItem(BOOKING_SYNC_ERROR_KEY, normalized);
};

const setCareerSyncError = (message = "") => {
  const normalized = String(message || "").trim();
  if (!normalized) {
    localStorage.removeItem(CAREER_SYNC_ERROR_KEY);
    return;
  }
  localStorage.setItem(CAREER_SYNC_ERROR_KEY, normalized);
};

const getActiveSupabaseUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.warn("Supabase auth lookup failed:", error.message);
    return null;
  }
  return data?.user || null;
};

export const getCareerSyncError = () => localStorage.getItem(CAREER_SYNC_ERROR_KEY) || "";

export const hydrateCareerApplicationsFromSupabase = async ({ userId, isAdmin = false }) => {
  logger.supabase.info("📥 HYDRATE CAREER APPS - START", { userId, isAdmin });

  if (!userId) {
    logger.supabase.warn("⚠️ HYDRATE CAREER APPS - SKIPPED (NO USER ID)");
    return;
  }

  let supabaseRows = [];

  // ── PRIMARY: Read from Supabase career_applications table ──
  if (hasSupabaseConfig()) {
    logger.supabase.debug("🔍 HYDRATE - FETCHING FROM SUPABASE");

    let query = supabase
      .from("career_applications")
      .select(
        "id, user_id, user_name, user_email, phone, city, gender, service_id, service_slug, service_title, experience_years, profile_photo_url, why_join, status, reviewed_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (!isAdmin) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      logger.supabase.error("❌ HYDRATE - SUPABASE FETCH FAILED", { error: error.message, code: error.code });
    } else {
      supabaseRows = (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name || "",
        userEmail: row.user_email || "",
        phone: row.phone || "",
        city: row.city || "",
        gender: row.gender || "",
        serviceId: row.service_slug || row.service_id || "",
        serviceSlug: row.service_slug || "",
        serviceTitle: row.service_title || "",
        experienceYears: row.experience_years || 0,
        profilePhoto: row.profile_photo_url || "",
        whyJoin: row.why_join || "",
        status: row.status || "pending",
        reviewedAt: row.reviewed_at || null,
        createdAt: row.created_at,
      }));
      logger.supabase.info("📥 HYDRATE - SUPABASE DATA FETCHED", { rowCount: supabaseRows.length });
    }
  }

  // ✅ SMART MERGE: Prefer localStorage (it's more current), only use Supabase for new records or admin
  const incomingById = new Map();
  
  // Start with localStorage as the base (currently active data)
  const existing = getLocalArray(CAREER_APPLICATIONS_KEY);
  existing.forEach((item) => {
    if (item?.id) {
      // Only keep if it matches user context
      if (!isAdmin && item.userId !== userId) return;
      incomingById.set(item.id, item);
    }
  });

  // Merge Supabase rows: 
  // - For admin: use Supabase (has all data)
  // - For user: only add if not already in localStorage (don't overwrite local changes)
  supabaseRows.forEach((supabaseItem) => {
    if (!supabaseItem?.id) return;
    
    const existingLocal = incomingById.get(supabaseItem.id);
    
    if (isAdmin) {
      // Admin: Always use Supabase version for all records
      incomingById.set(supabaseItem.id, supabaseItem);
    } else if (!existingLocal) {
      // User: Only use Supabase if record doesn't exist locally
      // This preserves fresh localStorage updates (like admin approval)
      incomingById.set(supabaseItem.id, supabaseItem);
    }
    // Otherwise: keep the localStorage version (it's more current)
  });

  const finalArray = Array.from(incomingById.values());
  setLocalArray(CAREER_APPLICATIONS_KEY, finalArray);

  logger.supabase.success("✅ HYDRATE COMPLETE", { finalCount: finalArray.length, userId, isAdmin });
  window.dispatchEvent(new Event("servify-career-changed"));
};

export const persistCareerApplicationToSupabase = async ({ application, userId }) => {
  logger.supabase.info("📤 PERSIST CAREER APP - START", { 
    applicationId: application?.id,
    userId,
    appUserId: application?.userId
  });

  if (!application) {
    logger.supabase.error("❌ PERSIST FAILED - MISSING APPLICATION");
    setCareerSyncError("Missing application data.");
    return false;
  }

  if (!isUuid(application.id)) {
    logger.supabase.error("❌ PERSIST FAILED - INVALID ID", { 
      applicationId: application.id
    });
    setCareerSyncError("Invalid application id format.");
    return false;
  }

  // ✅ CRITICAL: Ensure userId is correct
  // If application already has userId, use that (most reliable)
  // Otherwise, fetch from Supabase to avoid using admin's ID
  let finalUserId = userId || application.userId;

  if (!isUuid(finalUserId) && hasSupabaseConfig()) {
    // Missing userId - fetch existing record from Supabase to preserve original owner
    logger.supabase.info("⚠️ PERSIST - USER_ID MISSING, FETCHING FROM SUPABASE");
    const { data: existing } = await supabase
      .from("career_applications")
      .select("user_id")
      .eq("id", application.id)
      .maybeSingle();

    if (existing?.user_id) {
      finalUserId = existing.user_id;
      logger.supabase.info("✅ PERSIST - RESTORED USER_ID FROM SUPABASE", { finalUserId });
    }
  }

  if (!isUuid(finalUserId)) {
    logger.supabase.error("❌ PERSIST FAILED - CANNOT DETERMINE USER_ID", { 
      hasApplication: !!application,
      hasUserId: !!userId,
      appUserId: application?.userId
    });
    setCareerSyncError("Cannot determine user ID for persistence.");
    return false;
  }

  logger.supabase.debug("🔍 PERSIST - RESOLVING SERVICE", { 
    serviceSlug: application.serviceSlug,
    serviceId: application.serviceId
  });

  const { slugToId } = await getServiceMaps();
  const serviceSlug = toSlug(application.serviceSlug || application.serviceId || "");
  const serviceTitle = String(application.serviceTitle || application.serviceId || "").trim();
  let serviceId = slugToId.get(serviceSlug) || application.serviceId;
  if (!isUuid(serviceId)) {
    serviceId = null;
  }

  logger.supabase.debug("✅ PERSIST - SERVICE RESOLVED", { resolvedServiceId: serviceId });

  // ── PRIMARY: Save directly to Supabase career_applications table ──
  if (hasSupabaseConfig()) {
    const supabasePayload = {
      id: application.id,
      user_id: finalUserId,  // ✅ Use finalUserId to ensure correct owner
      user_name: application.userName || "",
      user_email: application.userEmail || "",
      phone: application.phone || "",
      city: application.city || "",
      gender: application.gender || null,
      service_id: serviceId,
      service_slug: serviceSlug || "",
      service_title: serviceTitle || "",
      experience_years: Number(application.experienceYears || 0),
      profile_photo_url: application.profilePhoto || "",
      why_join: application.whyJoin || "",
      status: application.status || "pending",
      reviewed_at: application.reviewedAt || null,
      created_at: application.createdAt || new Date().toISOString(),
    };

    logger.supabase.info("📤 PERSIST - UPSERTING TO SUPABASE career_applications", {
      applicationId: application.id,
      userId: finalUserId,
    });

    const { error: supabaseError } = await supabase
      .from("career_applications")
      .upsert([supabasePayload], { onConflict: "id" });

    if (supabaseError) {
      logger.supabase.error("❌ PERSIST FAILED - SUPABASE ERROR", {
        applicationId: application.id,
        error: supabaseError.message,
        code: supabaseError.code,
      });
      setCareerSyncError(`Supabase error: ${supabaseError.message}`);
      return false;
    } else {
      logger.supabase.success("✅ PERSIST COMPLETE - SUPABASE SAVED", {
        applicationId: application.id,
        userId: finalUserId,
      });
      setCareerSyncError("");
      return true;
    }
  }

  // Fallback: No Supabase config
  const reason = "Supabase environment variables are missing";
  setCareerSyncError(reason);
  return false;
};

export const hydrateSubscriptionsFromSupabase = async ({ userId, userEmail }) => {
  if (!hasSupabaseConfig() || !userId || !userEmail) return;

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("id, plan_id, status, started_at, renews_at, paused_at, pause_until")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Subscriptions hydration failed:", error.code, error.message);
    return;
  }

  // Load all subscriptions (active, paused, and cancelled)
  // This ensures subscriptions are never lost, persisting for 30 days and beyond
  const subscriptions = (data || []).map((row) => ({
    id: row.id,
    userEmail,
    planId: dbPlanToAppPlan(row.plan_id),
    status: row.status,
    startedAt: row.started_at,
    renewsAt: row.renews_at,
    pausedAt: row.paused_at,
    pauseUntil: row.pause_until,
    householdMembers: [],
    creditWallet: { monthlyCredits: 0, rolloverCredits: 0, balance: 0, topupCredits: 0, lastResetAt: row.started_at },
    savings: { total: 0, thisMonth: 0, byBooking: [] },
    usage: { bookedWithCredits: 0, priorityBookingsUsed: 0 },
    recommendedPlanId: dbPlanToAppPlan(row.plan_id),
  }));

  setLocalArray(SUBSCRIPTIONS_KEY, subscriptions);
  window.dispatchEvent(new Event("servify-subscription-changed"));
};

export const persistSubscriptionToSupabase = async ({ activeSubscription, userId }) => {
  if (!hasSupabaseConfig() || !activeSubscription || !userId) return;

  try {
    // CRITICAL: Ensure Supabase auth session is available
    // This fixes the "auth.uid() returns NULL" RLS policy issue
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user?.id) {
      logger.supabase.warn("persistSubscriptionToSupabase: No active auth session. Subscription insert will likely fail due to RLS policy.");
      console.warn("User ID:", userId, "Auth UID:", null);
      // Continue anyway - the RLS policy now allows authenticated inserts with trusting app code
    }

    // Only change previous subscription status to "cancelled" if the new subscription is "active"
    // This ensures cancelled/paused subscriptions are preserved in the database
    if (activeSubscription.status === "active") {
      await supabase
        .from("user_subscriptions")
        .update({ status: "cancelled" })
        .eq("user_id", userId)
        .eq("status", "active");
    }

    const payload = {
      user_id: userId,
      plan_id: planToDbPlan(activeSubscription.planId),
      status: activeSubscription.status || "active",
      started_at: activeSubscription.startedAt || new Date().toISOString(),
      renews_at: activeSubscription.renewsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      paused_at: activeSubscription.pausedAt || null,
      pause_until: activeSubscription.pauseUntil || null,
      // NOTE: Removed non-existent columns: household_members, credit_wallet, savings, usage, recommended_plan_id
      // These are stored in localStorage but not in the database
    };

    logger.supabase.debug("persistSubscriptionToSupabase: Attempting to insert/update subscription", {
      userId,
      planId: payload.plan_id,
      status: payload.status,
    });

    // First, cancel any existing active subscriptions for this user
    await supabase
      .from("user_subscriptions")
      .update({ status: "cancelled" })
      .eq("user_id", userId)
      .eq("status", "active");

    // Now insert the new subscription (don't use upsert - it requires a unique constraint)
    const { data, error } = await supabase
      .from("user_subscriptions")
      .insert([payload]);
    
    if (error) {
      logger.supabase.error("Subscription save failed:", {
        code: error.code,
        message: error.message,
        status: error.status,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(`Failed to save subscription: ${error.message}`);
    }

    logger.supabase.success("Subscription saved to Supabase successfully", { userId, data });
    return { success: true, data };
  } catch (err) {
    logger.supabase.error("persistSubscriptionToSupabase exception:", {
      message: err?.message,
      code: err?.code,
    });
    throw err;
  }
};

export const hydrateBookingsFromSupabase = async ({ userId, userEmail }) => {
  if (!userId || !userEmail) return;



  const { idToSlug } = await getServiceMaps();

  let data = null;
  let error = null;

  const fullSelect = await supabase
    .from("bookings")
    .select("id, booking_code, service_id, service_title, provider_id, provider_name, provider_email, scheduled_date, scheduled_time, customer_name, customer_phone, customer_address, notes, status, payment_method, payment_status, payable_total, advance_payable, due_after_service, review_submitted, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  data = fullSelect.data;
  error = fullSelect.error;

  if (error) {
    const message = String(error.message || "").toLowerCase();
    if (message.includes("schema cache") || message.includes("column")) {
      const legacySelect = await supabase
        .from("bookings")
        .select("id, booking_code, service_id, provider_id, scheduled_date, scheduled_time, customer_name, customer_phone, customer_address, notes, status, payment_method, payment_status, payable_total, advance_payable, due_after_service, review_submitted, created_at, updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      data = legacySelect.data;
      error = legacySelect.error;
    }
  }

  if (error) {
    console.warn("Bookings hydration failed:", error.message);
    return;
  }

  const providerIds = [...new Set((data || []).map((row) => row.provider_id).filter(Boolean))];
  let providerMap = new Map();
  if (providerIds.length) {
    const { data: providers } = await supabase.from("providers").select("id, full_name, email").in("id", providerIds);
    providerMap = new Map((providers || []).map((row) => [row.id, row]));
  }

  const bookingIds = (data || []).map((row) => row.id);
  let otpMap = new Map();
  if (bookingIds.length) {
    const { data: otpRows } = await supabase.from("booking_otp").select("booking_id, start_otp, end_otp, start_verified, end_verified").in("booking_id", bookingIds);
    otpMap = new Map((otpRows || []).map((row) => [row.booking_id, row]));
  }

  let timelineMap = new Map();
  let disputeMap = new Map();
  if (bookingIds.length) {
    const [{ data: timelineRows }, { data: disputeRows }] = await Promise.all([
      supabase.from("booking_timeline").select("booking_id, state, note, at_time").in("booking_id", bookingIds).order("at_time", { ascending: true }),
      supabase.from("booking_disputes").select("booking_id, reason, status, resolution, raised_at, resolved_at").in("booking_id", bookingIds),
    ]);

    timelineMap = (timelineRows || []).reduce((map, row) => {
      const list = map.get(row.booking_id) || [];
      list.push({ state: row.state, note: row.note || "", at: row.at_time });
      map.set(row.booking_id, list);
      return map;
    }, new Map());

    disputeMap = new Map((disputeRows || []).map((row) => [row.booking_id, row]));
  }

  const mapped = (data || []).map((row) => {
    const provider = providerMap.get(row.provider_id);
    const otp = otpMap.get(row.id);
    const timeline = timelineMap.get(row.id) || [];
    const dispute = disputeMap.get(row.id) || null;
    const hydratedServiceId = idToSlug.get(row.service_id) || row.service_id || toSlug(row.service_title || "");
    return {
      id: row.booking_code || row.id,
      serviceId: hydratedServiceId,
      serviceTitle: row.service_title || "",
      professionalId: provider?.email || row.provider_id,
      professionalName: row.provider_name || provider?.full_name || "",
      professionalEmail: row.provider_email || provider?.email || "",
      date: row.scheduled_date,
      time: row.scheduled_time,
      name: row.customer_name,
      phone: row.customer_phone,
      address: row.customer_address,
      notes: row.notes || "",
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userEmail,
      paymentMethod: row.payment_method || "",
      paymentStatus: row.payment_status,
      priceBreakdown: {
        payable: row.payable_total || 0,
        advancePayable: row.advance_payable || 0,
        dueAfterService: row.due_after_service || 0,
      },
      otp: {
        start: otp?.start_otp || "",
        end: otp?.end_otp || "",
        startVerified: Boolean(otp?.start_verified),
        endVerified: Boolean(otp?.end_verified),
      },
      timeline,
      lifecycle: {
        startedAt: timeline.find((item) => item.state === "in_progress")?.at || null,
        completedAt: timeline.find((item) => item.state === "completed")?.at || null,
        cancelledAt: timeline.find((item) => item.state === "cancelled")?.at || null,
      },
      dispute: dispute
        ? {
            reason: dispute.reason,
            status: dispute.status,
            resolution: dispute.resolution || "",
            raisedAt: dispute.raised_at,
            resolvedAt: dispute.resolved_at || null,
          }
        : null,
      reviewSubmitted: Boolean(row.review_submitted),
    };
  });

  const merged = mergeUserRowsById({ key: BOOKINGS_KEY, userEmail, incoming: mapped });
  setLocalArray(BOOKINGS_KEY, merged);
  window.dispatchEvent(new Event("servify-bookings-changed"));
};

export const persistBookingToSupabase = async ({ booking, userId, professionalEmail, professionalName, userEmail }) => {
  if (!booking || !userId) {
    const reason = "Missing booking payload or user session";
    setBookingSyncError(reason);
    return { ok: false, source: "local", error: reason };
  }

  if (!hasSupabaseConfig()) {
    const reason = "Supabase environment variables are missing";
    setBookingSyncError(reason);
    return { ok: false, source: "local", error: reason };
  }

  const { slugToId } = await getServiceMaps();
  const titleSlug = toSlug(booking.serviceTitle || "");
  const idSlug = toSlug(booking.serviceId || "");
  const bookingServiceSlug = titleSlug || idSlug;
  let mappedServiceId = slugToId.get(titleSlug) || slugToId.get(idSlug) || booking.serviceId;
  if (!isUuid(mappedServiceId)) {
    mappedServiceId = await ensureServiceIdBySlug({ slug: bookingServiceSlug, title: booking.serviceTitle });
  }
  const serviceId = isUuid(mappedServiceId) ? mappedServiceId : null;

  const providerId = await ensureProviderIdByEmail({ email: professionalEmail, fullName: professionalName });

  if (!serviceId) {
    console.warn(`Service mapping unresolved for slug '${bookingServiceSlug || "unknown"}', saving booking with service_title only.`);
  }

  if (!providerId) {
    console.warn(`Provider mapping unresolved for email '${String(professionalEmail || "").trim().toLowerCase() || "unknown"}', saving booking with provider_name/email only.`);
  }

  const payload = {
    booking_code: booking.id,
    user_id: userId,
    service_id: serviceId,
    service_title: booking.serviceTitle || booking.serviceId || null,
    provider_id: providerId || null,
    provider_name: booking.professionalName || professionalName || null,
    provider_email: booking.professionalEmail || professionalEmail || null,
    scheduled_date: String(booking.date || "").slice(0, 10),
    scheduled_time: booking.time,
    customer_name: booking.name,
    customer_phone: booking.phone,
    customer_address: booking.address,
    notes: booking.notes || "",
    status: booking.status || "confirmed",
    payment_method: booking.paymentMethod || null,
    payment_status: booking.paymentStatus || "advance_paid",
    payable_total: booking.priceBreakdown?.payable || 0,
    advance_payable: booking.priceBreakdown?.advancePayable || 0,
    due_after_service: booking.priceBreakdown?.dueAfterService || 0,
    review_submitted: Boolean(booking.reviewSubmitted),
  };

  const fallbackPayload = {
    booking_code: booking.id,
    user_id: userId,
    service_id: serviceId,
    provider_id: providerId || null,
    scheduled_date: String(booking.date || "").slice(0, 10),
    scheduled_time: booking.time,
    customer_name: booking.name,
    customer_phone: booking.phone,
    customer_address: booking.address,
    status: booking.status || "confirmed",
    payment_method: booking.paymentMethod || null,
    payment_status: booking.paymentStatus || "advance_paid",
  };

  let data = null;
  let error = null;
  let bookingDbId = null;

  const upsertAttempt = await supabase
    .from("bookings")
    .upsert([payload], { onConflict: "booking_code" })
    .select("id")
    .maybeSingle();
  data = upsertAttempt.data;
  error = upsertAttempt.error;

  if (error) {
    const upsertErrorText = String(error.message || "").toLowerCase();
    if (upsertErrorText.includes("no unique") || upsertErrorText.includes("on conflict")) {
      const insertAttempt = await supabase.from("bookings").insert([payload]).select("id").maybeSingle();
      data = insertAttempt.data;
      error = insertAttempt.error;
    }
  }

  if (error) {
    const message = String(error.message || "").toLowerCase();
    if (message.includes("schema cache") || message.includes("column")) {
      const legacyUpsertPayload = {
        booking_code: booking.id,
        user_id: userId,
        service_id: serviceId,
        provider_id: providerId || null,
        scheduled_date: String(booking.date || "").slice(0, 10),
        scheduled_time: booking.time,
        customer_name: booking.name,
        customer_phone: booking.phone,
        customer_address: booking.address,
        notes: booking.notes || "",
        status: booking.status || "confirmed",
        payment_method: booking.paymentMethod || null,
        payment_status: booking.paymentStatus || "advance_paid",
        payable_total: booking.priceBreakdown?.payable || 0,
        advance_payable: booking.priceBreakdown?.advancePayable || 0,
        due_after_service: booking.priceBreakdown?.dueAfterService || 0,
        review_submitted: Boolean(booking.reviewSubmitted),
      };
      const legacyUpsert = await supabase
        .from("bookings")
        .upsert([legacyUpsertPayload], { onConflict: "booking_code" })
        .select("id")
        .maybeSingle();
      data = legacyUpsert.data;
      error = legacyUpsert.error;
    }
  }

  if (error) {
    const fallbackAttempt = await supabase
      .from("bookings")
      .insert([fallbackPayload])
      .select("id")
      .maybeSingle();
    data = fallbackAttempt.data;
    error = fallbackAttempt.error;
  }

  if (error) {
    console.warn("Booking save failed:", error.message);
    setBookingSyncError(error.message || "Bookings insert blocked");
    return { ok: false, source: "local", error: error.message || "Bookings insert blocked" };
  }

  bookingDbId = data?.id;
  if (!bookingDbId) {
    const reason = "Booking insert returned no id";
    setBookingSyncError(reason);
    return { ok: false, source: "local", error: reason };
  }

  if (Array.isArray(booking.timeline)) {
    await supabase.from("booking_timeline").delete().eq("booking_id", bookingDbId);
    if (booking.timeline.length) {
      const timelinePayload = booking.timeline.map((item) => ({
        booking_id: bookingDbId,
        state: item.state,
        note: item.note || null,
        at_time: item.at || item.atTime || item.createdAt || new Date().toISOString(),
      }));
      const { error: timelineError } = await supabase.from("booking_timeline").insert(timelinePayload);
      if (timelineError) {
        console.warn("Booking timeline save failed:", timelineError.message);
      }
    }
  }

  if (booking.dispute) {
    const disputePayload = {
      booking_id: bookingDbId,
      user_id: userId,
      reason: booking.dispute.reason || "",
      status: booking.dispute.status || "open",
      resolution: booking.dispute.resolution || null,
      raised_at: booking.dispute.raisedAt || new Date().toISOString(),
      resolved_at: booking.dispute.resolvedAt || null,
    };
    const { error: disputeError } = await supabase.from("booking_disputes").upsert([disputePayload], { onConflict: "booking_id" });
    if (disputeError) {
      console.warn("Booking dispute save failed:", disputeError.message);
    }
  }

  if (!booking.otp) return;

  const otpPayload = {
    booking_id: bookingDbId,
    start_otp: booking.otp.start || "0000",
    end_otp: booking.otp.end || "0000",
    start_verified: Boolean(booking.otp.startVerified),
    end_verified: Boolean(booking.otp.endVerified),
  };

  const { error: otpError } = await supabase.from("booking_otp").upsert([otpPayload], { onConflict: "booking_id" });
  if (otpError) {
    console.warn("Booking OTP save failed:", otpError.message);
  }

  setBookingSyncError("");
  return { ok: true, source: "supabase", bookingDbId };
};

export const hydrateRescheduleUsageFromSupabase = async ({ userId, userEmail }) => {
  if (!hasSupabaseConfig() || !userId || !userEmail) return;

  const { data, error } = await supabase
    .from("user_reschedule_usage")
    .select("window_start, used_count")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Reschedule usage hydration failed:", error.message);
    return;
  }

  const next = {
    [userEmail]: {
      windowStart: data?.window_start || new Date().toISOString(),
      used: Number(data?.used_count || 0),
    },
  };
  localStorage.setItem(RESCHEDULE_USAGE_KEY, JSON.stringify(next));
};

export const persistRescheduleUsageToSupabase = async ({ userId, usage }) => {
  if (!hasSupabaseConfig() || !userId || !usage) return;
  const payload = {
    user_id: userId,
    window_start: usage.windowStart || new Date().toISOString(),
    used_count: Number(usage.used || 0),
  };

  const { error } = await supabase
    .from("user_reschedule_usage")
    .upsert([payload], { onConflict: "user_id" });

  if (error) {
    console.warn("Reschedule usage save failed:", error.message);
  }
};

export const hydrateMarketplaceAuxFromSupabase = async ({ userId, userEmail }) => {
  if (!userId || !userEmail) return;

  if (!hasSupabaseConfig()) {
    return;
  }

  const [{ data: notifications }, { data: userBookings }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, title, message, type, read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("bookings").select("id, booking_code").eq("user_id", userId),
  ]);

  const notificationIds = (notifications || []).map((row) => row.id).filter(Boolean);
  let notificationActions = [];
  if (notificationIds.length) {
    const { data } = await supabase
      .from("notification_actions")
      .select("notification_id, label, action_type, payload")
      .in("notification_id", notificationIds);
    notificationActions = data || [];
  }

  const [{ data: reviews }, { data: metrics }] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, booking_id, service_id, provider_id, user_id, rating, comment, verified, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("metrics_events")
      .select("id, event_type, payload, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ]);

  const reviewIds = (reviews || []).map((row) => row.id).filter(Boolean);
  let reviewTagMap = new Map();
  if (reviewIds.length) {
    const { data: tagRows } = await supabase.from("review_tags").select("review_id, tag").in("review_id", reviewIds);
    reviewTagMap = (tagRows || []).reduce((map, row) => {
      const list = map.get(row.review_id) || [];
      list.push(row.tag);
      map.set(row.review_id, list);
      return map;
    }, new Map());
  }

  const bookingCodes = (userBookings || []).map((row) => row.booking_code).filter(Boolean);
  const bookingIdMap = new Map((userBookings || []).map((row) => [row.id, row.booking_code]));
  const bookingIds = (userBookings || []).map((row) => row.id).filter(Boolean);

  let chats = [];
  if (bookingIds.length) {
    // Fetch from NEW booking_chats table (not old chat_messages/chat_threads)
    const { data: chatData } = await supabase
      .from("booking_chats")
      .select("id, booking_id, sender_id, sender_name, sender_email, message_text, created_at")
      .in("booking_id", bookingCodes)
      .order("created_at", { ascending: true });
    chats = chatData || [];
  }

  const [mongoChats, mongoMetrics] = [[], []];
  // MongoDB disabled - using empty arrays

  const hydratedNotifications = (notifications || []).map((row) => ({
      id: row.id,
      userEmail,
      title: row.title,
      message: row.message,
      type: row.type || "general",
      actions: notificationActions.filter((action) => action.notification_id === row.id).map((action) => ({
        label: action.label,
        type: action.action_type,
        payload: action.payload,
      })),
      read: Boolean(row.read),
      createdAt: row.created_at,
    }));

  setLocalArray(
    NOTIFICATIONS_KEY,
    mergeUserRowsById({ key: NOTIFICATIONS_KEY, userEmail, incoming: hydratedNotifications }),
  );

  setLocalArray(
    REVIEWS_KEY,
    (reviews || []).map((row) => ({
      id: row.id,
      bookingId: bookingIdMap.get(row.booking_id) || row.booking_id,
      professionalId: row.provider_id,
      serviceId: row.service_id,
      userEmail,
      rating: Number(row.rating || 0),
      tags: reviewTagMap.get(row.id) || [],
      comment: row.comment || "",
      verified: Boolean(row.verified),
      createdAt: row.created_at,
      mongoAlt1: row.mongo_alt_1 || null,
      mongoAlt2: row.mongo_alt_2 || null,
      mongoAlt3: row.mongo_alt_3 || null,
    })),
  );

  const hydratedSupabaseMetrics = (metrics || []).map((row) => ({
      id: row.id,
      type: row.event_type,
      payload: row.payload || {},
      createdAt: row.created_at,
      mongoAlt1: row.mongo_alt_1 || null,
      mongoAlt2: row.mongo_alt_2 || null,
      mongoAlt3: row.mongo_alt_3 || null,
    }));

  const hydratedMongoMetrics = (mongoMetrics || []).map((row) => ({
    id: row.id,
    type: row.type,
    payload: row.payload || {},
    createdAt: row.createdAt || row.created_at || new Date().toISOString(),
  }));

  setLocalArray(METRICS_KEY, mergeRowsById(hydratedSupabaseMetrics, hydratedMongoMetrics));

  const hydratedSupabaseChats = chats.map((row) => ({
      id: row.id,
      bookingId: row.booking_id,
      senderEmail: row.sender_email,
      senderName: row.sender_name,
      text: row.message_text,
      createdAt: row.created_at,
      mongoAlt1: row.mongo_alt_1 || null,
      mongoAlt2: row.mongo_alt_2 || null,
      mongoAlt3: row.mongo_alt_3 || null,
    }));

  const hydratedMongoChats = (mongoChats || []).map((row) => ({
    id: row.id,
    bookingId: row.bookingId || null,
    senderEmail: row.senderEmail || "",
    senderName: row.senderName || "",
    text: row.text || "",
    createdAt: row.createdAt || row.created_at || new Date().toISOString(),
  }));

  const mergedHydratedChats = mergeRowsById(hydratedSupabaseChats, hydratedMongoChats);
  setLocalArray(CHATS_KEY, mergeRowsById(mergedHydratedChats, getLocalArray(CHATS_KEY)));

  window.dispatchEvent(new Event("servify-notifications-changed"));
  window.dispatchEvent(new Event("servify-reviews-changed"));
  window.dispatchEvent(new Event("servify-chats-changed"));
};

export const persistMarketplaceNotificationToSupabase = async ({ notification, userId }) => {
  if (!hasSupabaseConfig() || !notification?.id || !userId) return;

  const payload = {
    id: notification.id,
    user_id: userId,
    title: notification.title || "",
    message: notification.message || "",
    type: normalizeNotificationType(notification.type || "general"),
    read: Boolean(notification.read),
    created_at: notification.createdAt || new Date().toISOString(),
    related_booking_id: notification.relatedBookingId || null,
    booking_details: notification.bookingDetails ? JSON.stringify(notification.bookingDetails) : null,
  };

  const { error } = await supabase.from("notifications").upsert([payload], { onConflict: "id" });
  if (error) {
    console.warn("Notification save failed:", error.code, error.message);
  }

  await supabase.from("notification_actions").delete().eq("notification_id", notification.id);
  if (Array.isArray(notification.actions) && notification.actions.length) {
    const actionPayload = notification.actions.map((action) => ({
      notification_id: notification.id,
      label: action.label,
      action_type: action.type || action.actionType || "open_url",
      payload: action.payload || {},
    }));
    const { error: actionError } = await supabase.from("notification_actions").insert(actionPayload);
    if (actionError) {
      console.warn("Notification actions save failed:", actionError.message);
    }
  }
};

export const deleteMarketplaceNotificationFromSupabase = async (notificationId) => {
  if (!hasSupabaseConfig() || !notificationId) return;
  const { error } = await supabase.from("notifications").delete().eq("id", notificationId);
  if (error) {
    console.warn("Notification delete failed:", error.message);
  }
};

export const persistMarketplaceReviewToSupabase = async ({ review, userId }) => {
  if (!hasSupabaseConfig() || !review?.id || !userId) return;
  const payload = {
    id: review.id,
    user_id: userId,
    booking_id: review.bookingId,
    service_id: review.serviceId,
    provider_id: review.professionalId,
    rating: Number(review.rating || 0),
    comment: review.comment || "",
    verified: Boolean(review.verified),
    created_at: review.createdAt || new Date().toISOString(),
  };

  const { error } = await supabase.from("reviews").upsert([payload], { onConflict: "booking_id" });
  if (error) {
    console.warn("Review save failed:", error.message);
  }

  await supabase.from("review_tags").delete().eq("review_id", review.id);
  if (Array.isArray(review.tags) && review.tags.length) {
    const tagPayload = review.tags.map((tag) => ({ review_id: review.id, tag }));
    const { error: tagError } = await supabase.from("review_tags").insert(tagPayload);
    if (tagError) {
      console.warn("Review tags save failed:", tagError.message);
    }
  }
};

export const persistMarketplaceMetricToSupabase = async ({ metric, userId }) => {
  if (!metric?.id || !userId) return;

  if (!hasSupabaseConfig()) return;

  const payload = {
    id: metric.id,
    user_id: userId,
    event_type: metric.type,
    payload: metric.payload || {},
    created_at: metric.createdAt || new Date().toISOString(),
  };

  const { error } = await supabase.from("metrics_events").upsert([payload], { onConflict: "id" });
  if (error) {
    console.warn("Metric save failed:", error.message);
  }
};

export const persistMarketplaceChatToSupabase = async ({ message, userId }) => {
  if (!message?.id || !userId) return;

  if (!hasSupabaseConfig()) return;

  const payload = {
    id: message.id,
    booking_id: message.bookingId || "",
    sender_id: userId,
    sender_email: message.senderEmail || "",
    sender_name: message.senderName || "",
    message_text: message.text || "",
    created_at: message.createdAt || new Date().toISOString(),
  };

  try {
    // Use insert instead of upsert (upsert requires unique constraint which doesn't exist)
    const { error } = await supabase.from("booking_chats").insert([payload]);
    if (error) {
      logger.supabase.error("Booking chat save failed:", {
        code: error.code,
        message: error.message,
        status: error.status,
      });
      return;
    }
    logger.supabase.success("Booking chat saved to Supabase");
  } catch (err) {
    logger.supabase.error("persistMarketplaceChatToSupabase exception:", {
      message: err?.message,
    });
  }
};

export const hydrateCareerAuxFromSupabase = async ({ userId, userEmail, isAdmin = false }) => {
  if (!userId || !userEmail) return;

  if (!hasSupabaseConfig()) {
    const mongoCareerChats = [];
    // MongoDB disabled - using empty array
    setLocalArray(
      CAREER_CHATS_KEY,
      mergeRowsById(
        (mongoCareerChats || []).map((row) => ({
          id: row.id,
          applicationId: row.applicationId || null,
          senderEmail: row.senderEmail || "",
          senderName: row.senderName || "",
          text: row.text || "",
          createdAt: row.createdAt || new Date().toISOString(),
        })),
        getLocalArray(CAREER_CHATS_KEY),
      ),
    );
    window.dispatchEvent(new Event("servify-career-changed"));
    return;
  }

  let notificationsQuery = supabase
    .from("career_notifications")
    .select("id, user_id, application_id, title, message, read, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (!isAdmin) {
    notificationsQuery = notificationsQuery.eq("user_id", userId);
  }

  const [{ data: notifications }, { data: applications }] = await Promise.all([
    notificationsQuery,
    isAdmin
      ? supabase.from("career_applications").select("id, user_email")
      : supabase.from("career_applications").select("id, user_email").eq("user_id", userId),
  ]);

  const applicationEmailMap = new Map((applications || []).map((row) => [row.id, row.user_email || userEmail]));

  const applicationIds = (applications || []).map((row) => row.id).filter(Boolean);
  let chats = [];
  if (applicationIds.length) {
    const { data: careerChatData } = await supabase
      .from("career_chats")
      .select("id, application_id, sender_id, sender_name, sender_email, message_text, created_at")
      .in("application_id", applicationIds)
      .order("created_at", { ascending: true });
    chats = careerChatData || [];
  }

  const mongoCareerChats = [];
  // MongoDB disabled - using empty array

  setLocalArray(
    CAREER_NOTIFICATIONS_KEY,
    (notifications || []).map((row) => ({
      id: row.id,
      userEmail: applicationEmailMap.get(row.application_id) || userEmail,
      title: row.title,
      message: row.message,
      createdAt: row.created_at,
      read: Boolean(row.read),
      applicationId: row.application_id || null,
    })),
  );

  const hydratedSupabaseCareerChats = chats.map((row) => ({
      id: row.id,
      applicationId: row.application_id,
      senderEmail: row.sender_email,
      senderName: row.sender_name,
      text: row.message_text,
      createdAt: row.created_at,
      mongoAlt1: row.mongo_alt_1 || null,
      mongoAlt2: row.mongo_alt_2 || null,
      mongoAlt3: row.mongo_alt_3 || null,
    }));

  const hydratedMongoCareerChats = (mongoCareerChats || []).map((row) => ({
    id: row.id,
    applicationId: row.applicationId || null,
    senderEmail: row.senderEmail || "",
    senderName: row.senderName || "",
    text: row.text || "",
    createdAt: row.createdAt || row.created_at || new Date().toISOString(),
  }));

  const mergedHydratedCareerChats = mergeRowsById(hydratedSupabaseCareerChats, hydratedMongoCareerChats);
  setLocalArray(CAREER_CHATS_KEY, mergeRowsById(mergedHydratedCareerChats, getLocalArray(CAREER_CHATS_KEY)));

  window.dispatchEvent(new Event("servify-career-changed"));
};

export const persistCareerNotificationToSupabase = async ({ notification, userId }) => {
  if (!hasSupabaseConfig() || !notification?.id || !userId) return;

  const payload = {
    id: notification.id,
    user_id: userId,
    application_id: notification.applicationId || null,
    title: notification.title || "",
    message: notification.message || "",
    read: Boolean(notification.read),
    created_at: notification.createdAt || new Date().toISOString(),
  };

  const { error } = await supabase.from("career_notifications").upsert([payload], { onConflict: "id" });
  if (error) {
    console.warn("Career notification save failed:", error.code, error.message);
  }
};

export const deleteCareerNotificationFromSupabase = async (notificationId) => {
  if (!hasSupabaseConfig() || !notificationId) return;
  const { error } = await supabase.from("career_notifications").delete().eq("id", notificationId);
  if (error) {
    console.warn("Career notification delete failed:", error.message);
  }
};

export const persistCareerChatToSupabase = async ({ message, userId }) => {
  if (!message?.id || !userId) return;

  if (!hasSupabaseConfig()) return;

  if (!isUuid(message.applicationId)) return;
  const payload = {
    id: message.id,
    application_id: message.applicationId,
    sender_id: userId,
    sender_email: message.senderEmail || "",
    sender_name: message.senderName || "",
    message_text: message.text || "",
    created_at: message.createdAt || new Date().toISOString(),
  };

  try {
    // Use insert instead of upsert (upsert requires unique constraint which doesn't exist)
    const { error } = await supabase.from("career_chats").insert([payload]);
    if (error) {
      logger.supabase.error("Career chat save failed:", {
        code: error.code,
        message: error.message,
        status: error.status,
      });
      return;
    }
    logger.supabase.success("Career chat saved to Supabase");
  } catch (err) {
    logger.supabase.error("persistCareerChatToSupabase exception:", {
      message: err?.message,
    });
  }
};

export const deleteCareerChatFromSupabase = async (messageId) => {
  if (!hasSupabaseConfig() || !messageId) return;

  const { error } = await supabase
    .from("career_chats")
    .delete()
    .eq("id", messageId);

  if (error) {
    console.warn("Career chat delete failed:", error.message);
  }
};

export const deleteBookingChatFromSupabase = async (messageId) => {
  if (!hasSupabaseConfig() || !messageId) return;

  const { error } = await supabase
    .from("booking_chats")
    .delete()
    .eq("id", messageId);

  if (error) {
    console.warn("Booking chat delete failed:", error.message);
  }
};
