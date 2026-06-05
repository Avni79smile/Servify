import {
  consumeCreditsForBooking,
  getActiveSubscriptionByEmail,
  recordSubscriptionSavings,
  subscriptionPlans,
} from "@/data/subscriptions";
import { getProfessionalById } from "@/data/professionals";
import { getCurrentUser } from "@/lib/auth";
import { deleteRowsByField } from "@/lib/supabaseData";
import {
  deleteMarketplaceNotificationFromSupabase,
  persistBookingToSupabase,
  persistMarketplaceChatToSupabase,
  persistMarketplaceMetricToSupabase,
  persistMarketplaceNotificationToSupabase,
  persistMarketplaceReviewToSupabase,
} from "@/lib/supabaseSync";

const BOOKINGS_KEY = "servify_bookings";
const BOOKINGS_MIRROR_KEY = "servify_bookings_persist";
const REVIEWS_KEY = "servify_reviews";
const NOTIFICATIONS_KEY = "servify_notifications";
const METRICS_KEY = "servify_metrics";
const CHATS_KEY = "servify_chats";

const BOOKING_EVENT = "servify-bookings-changed";
const NOTIFICATION_EVENT = "servify-notifications-changed";
const REVIEW_EVENT = "servify-reviews-changed";
const CHAT_EVENT = "servify-chats-changed";

const EVENT_TYPES = {
  VISIT: "visit",
  SEARCH: "search",
  BOOKING_CREATED: "booking_created",
  BOOKING_COMPLETED: "booking_completed",
  BOOKING_CANCELLED: "booking_cancelled",
  BOOKING_DELETED: "booking_deleted",
};

const readJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
  if (key === BOOKINGS_KEY) {
    localStorage.setItem(BOOKINGS_MIRROR_KEY, JSON.stringify(value));
  }
};

const emit = (eventName) => {
  window.dispatchEvent(new Event(eventName));
};

const parsePrice = (priceText = "") => {
  const digits = String(priceText).replace(/[^0-9]/g, "");
  return Number(digits || 0);
};

const randomOtp = () => String(Math.floor(1000 + Math.random() * 9000));
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const normalizeDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
};

const removeCompletedBookingInboxItems = (email, bookingId) => {
  const targetEmail = normalizeEmail(email);
  const notifications = readJson(NOTIFICATIONS_KEY, []);
  const removed = notifications.filter(
    (item) => normalizeEmail(item.userEmail) === targetEmail && item.relatedBookingId === bookingId,
  );
  if (!removed.length) {
    return;
  }

  const kept = notifications.filter(
    (item) => !(normalizeEmail(item.userEmail) === targetEmail && item.relatedBookingId === bookingId),
  );

  writeJson(NOTIFICATIONS_KEY, kept);
  emit(NOTIFICATION_EVENT);
  removed.forEach((item) => {
    void deleteMarketplaceNotificationFromSupabase(item.id);
  });
};

export const marketplaceEvents = {
  BOOKING_EVENT,
  NOTIFICATION_EVENT,
  REVIEW_EVENT,
  CHAT_EVENT,
};

export const getAllBookings = () => {
  const current = readJson(BOOKINGS_KEY, []);
  const mirror = readJson(BOOKINGS_MIRROR_KEY, []);
  if (!Array.isArray(mirror) || mirror.length === 0) {
    return current;
  }

  const byId = new Map(current.filter((item) => item?.id).map((item) => [item.id, item]));
  mirror.forEach((item) => {
    if (item?.id && !byId.has(item.id)) {
      byId.set(item.id, item);
    }
  });

  const merged = Array.from(byId.values());
  if (merged.length !== current.length) {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(merged));
  }
  return merged;
};

export const getBookingsByEmail = (email) => {
  const targetEmail = normalizeEmail(email);
  return getAllBookings().filter((booking) => normalizeEmail(booking.userEmail) === targetEmail);
};

export const getBookedSlots = (professionalId, date) => {
  const key = normalizeDateKey(date);
  return getAllBookings()
    .filter(
      (booking) =>
        booking.professionalId === professionalId &&
        normalizeDateKey(booking.date) === key &&
        booking.status !== "cancelled",
    )
    .map((booking) => booking.time);
};

export const getBookedDates = (professionalId) => {
  const allBookings = getAllBookings();
  const filtered = allBookings.filter(
    (booking) =>
      booking.professionalId === professionalId &&
      booking.status !== "cancelled",
  );
  
  const dates = filtered.map((booking) => {
    const dateStr = normalizeDateKey(booking.date);
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  })
  .filter((date, index, self) => 
    index === self.findIndex((d) => d.toDateString() === date.toDateString())
  );
  
  return dates;
};

export const calculateDynamicPricing = ({ service, selectedDate, selectedSlot, userEmail, couponCode = "" }) => {
  const baseFare = parsePrice(service?.price);
  const date = selectedDate ? new Date(selectedDate) : new Date();
  const day = date.getDay();

  const isWeekend = day === 0 || day === 6;
  const isPeakHour = /06:00 PM|07:00 PM|08:00 PM|09:00 PM/i.test(selectedSlot || "");

  const weekendSurge = isWeekend ? Math.round(baseFare * 0.18) : 0;
  const peakSurge = isPeakHour ? Math.round(baseFare * 0.1) : 0;

  const pastBookings = getBookingsByEmail(userEmail);
  const firstBookingDiscount = pastBookings.length === 0 ? Math.min(200, Math.round(baseFare * 0.15)) : 0;

  const normalizedCoupon = couponCode.trim().toUpperCase();
  const couponDiscount = normalizedCoupon === "WELCOME10" ? Math.min(300, Math.round(baseFare * 0.1)) : 0;

  const platformFee = Math.round(Math.max(39, baseFare * 0.06));

  const activeSubscription = getActiveSubscriptionByEmail(userEmail);
  const plan = activeSubscription ? subscriptionPlans.find((item) => item.id === activeSubscription.planId) : null;
  const memberDiscount = plan ? Math.round(baseFare * ((plan.discountPercent || 0) / 100)) : 0;
  const prioritySlotDiscount = plan && /07:00 AM|10:00 PM/i.test(selectedSlot || "") ? Math.round(baseFare * 0.03) : 0;

  const gross = baseFare + weekendSurge + peakSurge + platformFee;
  const totalDiscount = firstBookingDiscount + couponDiscount + memberDiscount + prioritySlotDiscount;
  const payable = Math.max(99, gross - totalDiscount);

  return {
    baseFare,
    weekendSurge,
    peakSurge,
    platformFee,
    firstBookingDiscount,
    couponDiscount,
    memberDiscount,
    prioritySlotDiscount,
    payable,
    advancePayable: Math.round(payable * 0.25),
    dueAfterService: payable - Math.round(payable * 0.25),
    subscriptionPlanId: plan?.id || null,
  };
};

export const createBooking = async ({
  service,
  professional,
  date,
  time,
  name,
  phone,
  address,
  notes,
  userEmail,
  paymentMethod,
  couponCode,
}) => {
  const pricing = calculateDynamicPricing({
    service,
    selectedDate: date,
    selectedSlot: time,
    userEmail,
    couponCode,
  });

  // UPI payment is required
  const normalizedPricing = {
    ...pricing,
    advancePayable: pricing.payable,
    dueAfterService: 0,
  };

  const booking = {
    id: `SVF-${Date.now().toString(36).toUpperCase()}`,
    serviceId: service.id,
    serviceTitle: service.title,
    professionalId: professional.id,
    professionalName: professional.name,
    professionalEmail: professional.email,
    date,
    time,
    name,
    phone,
    address,
    notes,
    status: "confirmed",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userEmail,
    paymentMethod: "upi",
    paymentStatus: "fully_paid",
    priceBreakdown: normalizedPricing,
    timeline: [
      { state: "confirmed", at: new Date().toISOString(), note: "Booking created" },
    ],
    lifecycle: {
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
    },
    otp: {
      start: randomOtp(),
      end: randomOtp(),
      startVerified: false,
      endVerified: false,
    },
    dispute: null,
    reviewSubmitted: false,
  };

  const bookings = getAllBookings();
  bookings.push(booking);
  writeJson(BOOKINGS_KEY, bookings);
  emit(BOOKING_EVENT);

  const usedCreditsRecord = consumeCreditsForBooking(userEmail, booking.id, 1);
  const subscriptionSavings = (pricing.memberDiscount || 0) + (pricing.prioritySlotDiscount || 0);
  if (subscriptionSavings > 0) {
    recordSubscriptionSavings(userEmail, booking.id, subscriptionSavings);
  }

  createNotification(userEmail, {
    title: "Booking confirmed",
    message: `Your ${service.title} booking with ${professional.name} is confirmed for ${new Date(date).toLocaleDateString()} at ${time}.`,
    type: "booking",
    relatedBookingId: booking.id,
    bookingDetails: {
      bookingId: booking.id,
      serviceTitle: service.title,
      professionalName: professional.name,
      date,
      time,
      status: booking.status,
      startOtp: booking.otp?.start || "",
      completeOtp: booking.otp?.end || "",
    },
    actions: [
      { label: "Open chat", type: "open_url", payload: `/applicant-inbox?booking=${booking.id}` },
      { label: "Reschedule", type: "open_url", payload: "/my-bookings" },
    ],
  });

  createNotification(professional.email, {
    title: "New appointment booked",
    message: `${name} booked your ${service.title} service for ${new Date(date).toLocaleDateString()} at ${time}.`,
    type: "appointment_alert",
    actions: [
      { label: "Open career calendar", type: "open_url", payload: "/career/calendar" },
      { label: "Open career alerts", type: "open_url", payload: "/career/alerts" },
    ],
    relatedBookingId: booking.id,
    relatedProfessionalId: professional.id,
    source: "career",
  });

  if (usedCreditsRecord) {
    createNotification(userEmail, {
      title: "Subscription credit used",
      message: `1 credit was used for booking ${booking.id}. Remaining credits: ${usedCreditsRecord.creditWallet?.balance || 0}.`,
      type: "subscription",
      actions: [{ label: "View plans", type: "open_url", payload: "/plans" }],
    });
  }

  trackMetric(EVENT_TYPES.BOOKING_CREATED, { serviceId: service.id, bookingId: booking.id });

  const sessionUser = getCurrentUser();
  const professionalEmail = professional?.email || getProfessionalById(booking.professionalId)?.email || "";
  const professionalName = professional?.name || getProfessionalById(booking.professionalId)?.name || "Professional";
  let sync = { ok: false, source: "local", error: "No authenticated session" };
  if (sessionUser?.id) {
    sync = await persistBookingToSupabase({ booking, userId: sessionUser.id, professionalEmail, professionalName, userEmail });
  }

  return { booking, sync };
};

export const updateBookingStatus = (bookingId, nextStatus, extra = {}) => {
  const bookings = getAllBookings();
  const index = bookings.findIndex((booking) => booking.id === bookingId);
  if (index === -1) {
    throw new Error("Booking not found");
  }

  const now = new Date().toISOString();
  const updated = {
    ...bookings[index],
    ...extra,
    status: nextStatus,
    updatedAt: now,
    timeline: [
      ...(bookings[index].timeline || []),
      { state: nextStatus, at: now, note: extra?.statusNote || "Status updated" },
    ],
    lifecycle: {
      ...bookings[index].lifecycle,
      cancelledAt: nextStatus === "cancelled" ? now : bookings[index].lifecycle?.cancelledAt || null,
      completedAt: nextStatus === "completed" ? now : bookings[index].lifecycle?.completedAt || null,
    },
  };

  bookings[index] = updated;
  writeJson(BOOKINGS_KEY, bookings);
  emit(BOOKING_EVENT);

  const sessionUser = getCurrentUser();
  const professionalEmail = getProfessionalById(updated.professionalId)?.email || "";
  const professionalName = getProfessionalById(updated.professionalId)?.name || "Professional";
  if (sessionUser?.id) {
    void persistBookingToSupabase({ booking: updated, userId: sessionUser.id, professionalEmail, professionalName });
  }

  if (["missed", "closed"].includes(nextStatus)) {
    createNotification(updated.userEmail, {
      title: "Appointment alert",
      message:
        nextStatus === "missed"
          ? `You missed appointment ${updated.id}. Please reschedule or contact support.`
          : `Appointment ${updated.id} is now closed. Open inbox for full details.`,
      type: "appointment_alert",
      actions: [
        { label: "Open inbox", type: "open_url", payload: "/inbox" },
        { label: "Open bookings", type: "open_url", payload: "/my-bookings" },
      ],
    });

    const professional = getProfessionalById(updated.professionalId);
    if (professional?.email) {
      createNotification(professional.email, {
        title: nextStatus === "missed" ? "Appointment missed" : "Appointment closed",
        message:
          nextStatus === "missed"
            ? `Appointment ${updated.id} was missed by the customer.`
            : `Appointment ${updated.id} was closed after completion or admin closure.`,
        type: "appointment_alert",
        actions: [
          { label: "Open career calendar", type: "open_url", payload: "/career/calendar" },
          { label: "Open career alerts", type: "open_url", payload: "/career/alerts" },
        ],
        relatedBookingId: updated.id,
        relatedProfessionalId: updated.professionalId,
        source: "career",
      });
    }
  }

  if (nextStatus === "completed") {
    trackMetric(EVENT_TYPES.BOOKING_COMPLETED, { bookingId });
  }
  if (nextStatus === "cancelled") {
    trackMetric(EVENT_TYPES.BOOKING_CANCELLED, { bookingId });
  }

  return updated;
};

export const rescheduleBooking = (bookingId, nextDate, nextTime) =>
  updateBookingStatus(bookingId, "rescheduled", {
    date: nextDate,
    time: nextTime,
  });

export const cancelBooking = (bookingId, reason = "") =>
  updateBookingStatus(bookingId, "cancelled", {
    cancelReason: reason,
  });

export const verifyBookingOtp = (bookingId, kind, otp) => {
  const bookings = getAllBookings();
  const index = bookings.findIndex((booking) => booking.id === bookingId);
  if (index === -1) {
    throw new Error("Booking not found");
  }

  const booking = bookings[index];
  const expected = booking.otp?.[kind];
  if (!expected || otp !== expected) {
    throw new Error("Invalid OTP");
  }

  if (kind === "start") {
    bookings[index] = {
      ...booking,
      status: "in_progress",
      timeline: [...(booking.timeline || []), { state: "in_progress", at: new Date().toISOString(), note: "Work started" }],
      otp: { ...booking.otp, startVerified: true },
      lifecycle: { ...booking.lifecycle, startedAt: new Date().toISOString() },
      updatedAt: new Date().toISOString(),
    };
  } else {
    bookings[index] = {
      ...booking,
      status: "completed",
      timeline: [...(booking.timeline || []), { state: "completed", at: new Date().toISOString(), note: "Work completed" }],
      paymentStatus: "fully_paid",
      otp: { ...booking.otp, endVerified: true },
      lifecycle: { ...booking.lifecycle, completedAt: new Date().toISOString() },
      updatedAt: new Date().toISOString(),
    };
    const completedRevenue = bookings[index]?.priceBreakdown?.payable || 0;
    trackMetric(EVENT_TYPES.BOOKING_COMPLETED, {
      bookingId,
      completedRevenue,
      serviceId: booking.serviceId,
      professionalId: booking.professionalId,
    });    // Remove related booking notifications when booking is completed
    removeCompletedBookingInboxItems(updated.userEmail, bookingId);  }

  writeJson(BOOKINGS_KEY, bookings);
  emit(BOOKING_EVENT);

  const updated = bookings[index];
  const sessionUser = getCurrentUser();
  const professionalEmail = getProfessionalById(updated.professionalId)?.email || "";
  const professionalName = getProfessionalById(updated.professionalId)?.name || "Professional";
  if (sessionUser?.id) {
    void persistBookingToSupabase({ booking: updated, userId: sessionUser.id, professionalEmail, professionalName });
  }

  return updated;
};

export const raiseBookingDispute = (bookingId, reason) =>
  updateBookingStatus(bookingId, "dispute", {
    dispute: {
      reason,
      raisedAt: new Date().toISOString(),
      status: "open",
    },
  });

export const resolveDispute = (bookingId, resolution = "Resolved by admin") => {
  const booking = updateBookingStatus(bookingId, "completed", {
    dispute: {
      ...(getAllBookings().find((item) => item.id === bookingId)?.dispute || {}),
      status: "resolved",
      resolution,
      resolvedAt: new Date().toISOString(),
    },
  });

  createNotification(booking.userEmail, {
    title: "Dispute resolved",
    message: `Your dispute for booking ${booking.id} has been resolved. ${resolution}`,
    type: "dispute",
  });

  return booking;
};

export const issueRefund = (bookingId, amount = 0, note = "Refund issued") => {
  const booking = updateBookingStatus(bookingId, "refunded", {
    paymentStatus: "refunded",
    refund: {
      amount,
      note,
      issuedAt: new Date().toISOString(),
    },
    dispute: {
      ...(getAllBookings().find((item) => item.id === bookingId)?.dispute || {}),
      status: "closed",
      resolution: note,
      resolvedAt: new Date().toISOString(),
    },
  });

  createNotification(booking.userEmail, {
    title: "Refund processed",
    message: `Refund of ₹${amount} has been issued for booking ${booking.id}.`,
    type: "refund",
  });

  return booking;
};

export const getOpenDisputes = () =>
  getAllBookings().filter((booking) => booking.dispute && booking.dispute.status === "open");

export const getAllReviews = () => readJson(REVIEWS_KEY, []);

export const getReviewsForProfessional = (professionalId) =>
  getAllReviews().filter((review) => review.professionalId === professionalId);

export const getReviewSummaryForProfessional = (professionalId) => {
  const reviews = getReviewsForProfessional(professionalId);
  if (reviews.length === 0) {
    return { count: 0, average: 0 };
  }
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return {
    count: reviews.length,
    average: Number((total / reviews.length).toFixed(1)),
  };
};

export const submitBookingReview = ({ bookingId, professionalId, serviceId, userEmail, rating, tags, comment }) => {
  const reviews = getAllReviews();
  const existing = reviews.find((review) => review.bookingId === bookingId && review.userEmail === userEmail);
  if (existing) {
    throw new Error("Review already submitted for this booking");
  }

  const nextReview = {
    id: crypto.randomUUID(),
    bookingId,
    professionalId,
    serviceId,
    userEmail,
    rating,
    tags,
    comment,
    verified: true,
    createdAt: new Date().toISOString(),
  };

  reviews.unshift(nextReview);

  writeJson(REVIEWS_KEY, reviews);
  emit(REVIEW_EVENT);

  const sessionUser = getCurrentUser();
  if (sessionUser?.id) {
    void persistMarketplaceReviewToSupabase({ review: nextReview, userId: sessionUser.id });
  }

  const bookings = getAllBookings().map((booking) =>
    booking.id === bookingId ? { ...booking, reviewSubmitted: true, updatedAt: new Date().toISOString() } : booking,
  );
  writeJson(BOOKINGS_KEY, bookings);
  emit(BOOKING_EVENT);
};

export const getNotificationsByEmail = (email) =>
  readJson(NOTIFICATIONS_KEY, []).filter((notification) => normalizeEmail(notification.userEmail) === normalizeEmail(email));

export const createNotification = (userEmail, { title, message, type = "general", actions = [], ...rest }) => {
  const notifications = readJson(NOTIFICATIONS_KEY, []);
  const nextNotification = {
    id: crypto.randomUUID(),
    userEmail,
    title,
    message,
    type,
    actions,
    ...rest,
    read: false,
    createdAt: new Date().toISOString(),
  };

  notifications.unshift(nextNotification);
  writeJson(NOTIFICATIONS_KEY, notifications);
  emit(NOTIFICATION_EVENT);

  const sessionUser = getCurrentUser();
  if (sessionUser?.id) {
    void persistMarketplaceNotificationToSupabase({ notification: nextNotification, userId: sessionUser.id });
  }
};

export const markNotificationRead = (email, notificationId) => {
  const targetEmail = normalizeEmail(email);
  const notifications = readJson(NOTIFICATIONS_KEY, []).map((item) =>
    normalizeEmail(item.userEmail) === targetEmail && item.id === notificationId ? { ...item, read: true } : item,
  );
  writeJson(NOTIFICATIONS_KEY, notifications);
  emit(NOTIFICATION_EVENT);

  const sessionUser = getCurrentUser();
  const updated = notifications.find((item) => normalizeEmail(item.userEmail) === targetEmail && item.id === notificationId);
  if (sessionUser?.id && updated) {
    void persistMarketplaceNotificationToSupabase({ notification: updated, userId: sessionUser.id });
  }
};

export const executeNotificationAction = (email, notificationId, actionIndex = 0) => {
  const targetEmail = normalizeEmail(email);
  const notifications = readJson(NOTIFICATIONS_KEY, []);
  const target = notifications.find((item) => normalizeEmail(item.userEmail) === targetEmail && item.id === notificationId);
  if (!target) {
    return null;
  }

  const action = (target.actions || [])[actionIndex];
  if (!action) {
    return null;
  }

  markNotificationRead(email, notificationId);
  return action;
};

export const markAllNotificationsRead = (email) => {
  const targetEmail = normalizeEmail(email);
  const notifications = readJson(NOTIFICATIONS_KEY, []).map((item) =>
    normalizeEmail(item.userEmail) === targetEmail ? { ...item, read: true } : item,
  );
  writeJson(NOTIFICATIONS_KEY, notifications);
  emit(NOTIFICATION_EVENT);

  const sessionUser = getCurrentUser();
  if (sessionUser?.id) {
    notifications
      .filter((item) => normalizeEmail(item.userEmail) === targetEmail)
      .forEach((item) => {
        void persistMarketplaceNotificationToSupabase({ notification: item, userId: sessionUser.id });
      });
  }
};

export const deleteNotification = (email, notificationId) => {
  const targetEmail = normalizeEmail(email);
  const notifications = readJson(NOTIFICATIONS_KEY, []);
  const nextNotifications = notifications.filter(
    (item) => !(normalizeEmail(item.userEmail) === targetEmail && item.id === notificationId),
  );

  if (nextNotifications.length === notifications.length) {
    return false;
  }

  writeJson(NOTIFICATIONS_KEY, nextNotifications);
  emit(NOTIFICATION_EVENT);

  const sessionUser = getCurrentUser();
  if (sessionUser?.id) {
    void deleteMarketplaceNotificationFromSupabase(notificationId);
  }

  return true;
};

export const trackMetric = (type, payload = {}) => {
  const metrics = readJson(METRICS_KEY, []);
  const metric = {
    id: crypto.randomUUID(),
    type,
    payload,
    createdAt: new Date().toISOString(),
  };
  metrics.push(metric);
  writeJson(METRICS_KEY, metrics);

  const sessionUser = getCurrentUser();
  if (sessionUser?.id) {
    void persistMarketplaceMetricToSupabase({ metric, userId: sessionUser.id });
  }
};

export const getAnalyticsSummary = () => {
  const bookings = getAllBookings();
  const metrics = readJson(METRICS_KEY, []);

  const revenue = bookings
    .filter((booking) => booking.status === "completed" || booking.status === "in_progress" || booking.status === "confirmed")
    .reduce((sum, booking) => sum + (booking?.priceBreakdown?.payable || 0), 0);

  const statusCount = bookings.reduce((acc, booking) => {
    const key = booking.status || "confirmed";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const completedRevenue = metrics
    .filter((item) => item.type === EVENT_TYPES.BOOKING_COMPLETED)
    .reduce((sum, item) => sum + (item.payload?.completedRevenue || 0), 0);

  const deletedRevenue = metrics
    .filter((item) => item.type === EVENT_TYPES.BOOKING_DELETED)
    .reduce((sum, item) => sum + (item.payload?.deletedRevenue || 0), 0);

  const funnel = {
    visits: metrics.filter((item) => item.type === EVENT_TYPES.VISIT).length,
    searches: metrics.filter((item) => item.type === EVENT_TYPES.SEARCH).length,
    bookings: metrics.filter((item) => item.type === EVENT_TYPES.BOOKING_CREATED).length,
    completed: metrics.filter((item) => item.type === EVENT_TYPES.BOOKING_COMPLETED).length,
    deleted: metrics.filter((item) => item.type === EVENT_TYPES.BOOKING_DELETED).length,
  };

  return {
    totalBookings: bookings.length,
    activeBookings: bookings.filter((booking) => ["confirmed", "rescheduled", "in_progress"].includes(booking.status)).length,
    completedBookings: bookings.filter((booking) => booking.status === "completed").length,
    cancelledBookings: bookings.filter((booking) => booking.status === "cancelled").length,
    revenue,
    completedRevenue,
    deletedRevenue,
    statusCount,
    funnel,
  };
};

export const getTopMatches = (limit = 6) => {
  const bookings = getAllBookings();
  const scoreMap = new Map();

  bookings.forEach((booking) => {
    const current = scoreMap.get(booking.professionalId) || 0;
    const statusWeight = booking.status === "completed" ? 3 : booking.status === "confirmed" ? 2 : 1;
    scoreMap.set(booking.professionalId, current + statusWeight);
  });

  return Array.from(scoreMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([professionalId, score]) => ({ professionalId, score }));
};

export const getBookingsByProfessionalId = (professionalId) => 
  getAllBookings().filter((booking) => booking.professionalId === professionalId);

export const deleteBookingByUser = (bookingId, userEmail) => {
  const targetEmail = normalizeEmail(userEmail);
  const bookings = getAllBookings();
  const deletedBooking = bookings.find(
    (booking) => booking.id === bookingId && normalizeEmail(booking.userEmail) === targetEmail,
  );
  const nextBookings = bookings.filter(
    (booking) => !(booking.id === bookingId && normalizeEmail(booking.userEmail) === targetEmail),
  );

  if (nextBookings.length === bookings.length) {
    return false;
  }

  writeJson(BOOKINGS_KEY, nextBookings);
  emit(BOOKING_EVENT);

  // Track booking deletion with revenue impact
  if (deletedBooking) {
    const deletedRevenue = deletedBooking?.priceBreakdown?.payable || 0;
    trackMetric(EVENT_TYPES.BOOKING_DELETED, {
      bookingId,
      deletedRevenue,
      status: deletedBooking.status,
    });
  }

  const notifications = readJson(NOTIFICATIONS_KEY, []);
  const removedNotifications = notifications.filter(
    (item) => normalizeEmail(item.userEmail) === targetEmail && item.relatedBookingId === bookingId,
  );
  const keptNotifications = notifications.filter(
    (item) => !(normalizeEmail(item.userEmail) === targetEmail && item.relatedBookingId === bookingId),
  );
  writeJson(NOTIFICATIONS_KEY, keptNotifications);
  emit(NOTIFICATION_EVENT);

  const sessionUser = getCurrentUser();
  if (sessionUser?.id) {
    void deleteRowsByField("bookings", "booking_code", bookingId);
    removedNotifications.forEach((item) => {
      void deleteMarketplaceNotificationFromSupabase(item.id);
    });
  }

  return true;
};

export const getChatMessagesByBooking = (bookingId) =>
  readJson(CHATS_KEY, []).filter((message) => message.bookingId === bookingId);

export const getAllMarketplaceChats = () => readJson(CHATS_KEY, []);

export const deleteMarketplaceChatConversationByBooking = (bookingId) => {
  if (!bookingId) return 0;

  const chats = readJson(CHATS_KEY, []);
  const removed = chats.filter((message) => message.bookingId === bookingId);
  if (!removed.length) return 0;

  const nextChats = chats.filter((message) => message.bookingId !== bookingId);
  writeJson(CHATS_KEY, nextChats);
  emit(CHAT_EVENT);

  const sessionUser = getCurrentUser();
  if (sessionUser?.id) {
    removed.forEach((message) => {
      void deleteRowsByField("chat_messages", "id", message.id);
    });
    // MongoDB deleted chat ids intentionally
  }

  return removed.length;
};

export const sendChatMessage = ({ bookingId, senderEmail, senderName, text }) => {
  if (!text.trim()) {
    return null;
  }
  const messages = readJson(CHATS_KEY, []);
  const next = {
    id: crypto.randomUUID(),
    bookingId,
    senderEmail,
    senderName,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  messages.push(next);
  writeJson(CHATS_KEY, messages);
  emit(CHAT_EVENT);

  const sessionUser = getCurrentUser();
  if (sessionUser?.id) {
    void persistMarketplaceChatToSupabase({ message: next, userId: sessionUser.id });
  }
  return next;
};

export const editMarketplaceChatMessage = ({ messageId, requesterEmail, nextText }) => {
  const targetId = String(messageId || "").trim();
  const body = String(nextText || "").trim();
  if (!targetId || !body) return null;

  const messages = readJson(CHATS_KEY, []);
  const index = messages.findIndex((item) => item.id === targetId);
  if (index === -1) return null;

  const ownerEmail = normalizeEmail(messages[index].senderEmail);
  if (ownerEmail !== normalizeEmail(requesterEmail)) {
    return null;
  }

  const updated = {
    ...messages[index],
    text: body,
    editedAt: new Date().toISOString(),
  };
  messages[index] = updated;
  writeJson(CHATS_KEY, messages);
  emit(CHAT_EVENT);

  const sessionUser = getCurrentUser();
  if (sessionUser?.id) {
    void persistMarketplaceChatToSupabase({ message: updated, userId: sessionUser.id });
  }

  return updated;
};

export const deleteMarketplaceChatMessage = async ({ messageId, requesterEmail }) => {
  const targetId = String(messageId || "").trim();
  if (!targetId) return false;

  const messages = readJson(CHATS_KEY, []);
  const target = messages.find((item) => item.id === targetId);
  if (!target) return false;

  if (normalizeEmail(target.senderEmail) !== normalizeEmail(requesterEmail)) {
    return false;
  }

  // Delete from localStorage
  const nextMessages = messages.filter((item) => item.id !== targetId);
  writeJson(CHATS_KEY, nextMessages);
  emit(CHAT_EVENT);

  // Delete from Supabase
  const sessionUser = getCurrentUser();
  if (sessionUser?.id) {
    const { deleteBookingChatFromSupabase } = await import("@/lib/supabaseSync");
    await deleteBookingChatFromSupabase(messageId);
  }

  return true;
};
