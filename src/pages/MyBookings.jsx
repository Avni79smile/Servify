import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { CalendarDays, Clock, Mail, MapPin, User, ShieldCheck, AlertTriangle, Star, Repeat2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getProfessionalById } from "@/data/professionals";
import { getServiceById } from "@/data/services";
import { AUTH_CHANGE_EVENT, getCurrentUser } from "@/lib/auth";
import {
  consumeRescheduleAllowance,
  getRescheduleAllowanceStatus,
  subscriptionEvent,
} from "@/data/subscriptions";
import {
  cancelBooking,
  deleteBookingByUser,
  getBookingsByEmail,
  marketplaceEvents,
  raiseBookingDispute,
  rescheduleBooking,
  submitBookingReview,
  verifyBookingOtp,
} from "@/data/marketplace";
import { hydrateBookingsFromSupabase } from "@/lib/supabaseSync";
import { toast } from "sonner";

const journeyStates = ["confirmed", "in_progress", "completed"];

const getProgressIndex = (status) => {
  const idx = journeyStates.indexOf(status);
  return idx === -1 ? 0 : idx;
};

const getSlaCountdown = (createdAt) => {
  const target = new Date(createdAt).getTime() + 90 * 60 * 1000;
  const diff = target - Date.now();
  if (diff <= 0) {
    return "SLA window reached";
  }

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours}h ${remMinutes}m remaining`;
};

const safeDateLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }
  return format(date, "PP");
};

const safeServiceTitle = (serviceId, fallback = "Untitled booking") => {
  if (!serviceId) {
    return fallback;
  }

  try {
    return getServiceById(serviceId)?.title || fallback;
  } catch {
    return fallback;
  }
};

const bookingDisplayTitle = (booking) => booking?.serviceTitle || safeServiceTitle(booking?.serviceId, "Untitled booking");

const bookingDisplayProvider = (booking) => {
  if (booking?.professionalName) {
    return booking.professionalName;
  }

  const professional = getProfessionalById(booking?.professionalId);
  return professional?.name || "Professional";
};

const MyBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [otpMap, setOtpMap] = useState({});
  const [rescheduleMap, setRescheduleMap] = useState({});
  const [disputeMap, setDisputeMap] = useState({});
  const [reviewMap, setReviewMap] = useState({});
  const [rescheduleStatus, setRescheduleStatus] = useState(null);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());

  const syncBookings = () => {
    const latestUser = getCurrentUser();
    setCurrentUser(latestUser);
    if (!latestUser) {
      setBookings([]);
      setRescheduleStatus(null);
      return;
    }
    setBookings(getBookingsByEmail(latestUser.email).reverse());
    setRescheduleStatus(getRescheduleAllowanceStatus(latestUser.email));
  };

  useEffect(() => {
    const syncAndHydrate = () => {
      const latestUser = getCurrentUser();
      if (latestUser?.id && latestUser?.email) {
        void hydrateBookingsFromSupabase({ userId: latestUser.id, userEmail: latestUser.email });
      }
      syncBookings();
    };

    syncAndHydrate();
    window.addEventListener(marketplaceEvents.BOOKING_EVENT, syncAndHydrate);
    window.addEventListener(AUTH_CHANGE_EVENT, syncAndHydrate);
    window.addEventListener(subscriptionEvent, syncAndHydrate);
    window.addEventListener("storage", syncAndHydrate);
    return () => {
      window.removeEventListener(marketplaceEvents.BOOKING_EVENT, syncAndHydrate);
      window.removeEventListener(AUTH_CHANGE_EVENT, syncAndHydrate);
      window.removeEventListener(subscriptionEvent, syncAndHydrate);
      window.removeEventListener("storage", syncAndHydrate);
    };
  }, []);

  const handleCancel = (bookingId) => {
    cancelBooking(bookingId, "Cancelled by customer");
    toast.success("Booking cancelled");
  };

  const handleDelete = (booking) => {
    const ok = window.confirm("Delete this booking card? This action cannot be undone.");
    if (!ok) {
      return;
    }

    const removed = deleteBookingByUser(booking.id, currentUser.email);
    if (removed) {
      toast.success("Booking removed");
    }
  };

  const handleReschedule = (booking) => {
    const rescheduleData = rescheduleMap[booking.id] || { date: "", time: "" };
    const { date, time } = rescheduleData;
    const allowance = getRescheduleAllowanceStatus(currentUser.email);

    if (!allowance.allowed) {
      const planAction = allowance.hasActivePlan ? "renew your plan" : "choose a plan";
      const message = `Free reschedule limit reached (${allowance.limit}). Please ${planAction}. You can reschedule again in ${allowance.daysUntilReset} day(s).`;
      toast.error(message);
      if (window.confirm(`${message}\n\nOpen plans now?`)) {
        navigate("/plans");
      }
      return;
    }

    if (!date || !time) {
      toast.error("Please select both date and time");
      return;
    }

    rescheduleBooking(booking.id, new Date(date).toISOString(), time.trim());
    const consumed = consumeRescheduleAllowance(currentUser.email, 1);
    setRescheduleStatus(consumed);
    toast.success(`Booking rescheduled to ${format(new Date(date), "MMM dd, yyyy")} at ${time}. ${consumed.remaining} free reschedule(s) left.`);
  };

  const handleOtpVerify = (booking, kind) => {
    const otp = otpMap[`${booking.id}-${kind}`] || "";
    try {
      verifyBookingOtp(booking.id, kind, otp.trim());
      toast.success(kind === "start" ? "Service started" : "Service completed");
      setOtpMap((prev) => ({ ...prev, [`${booking.id}-${kind}`]: "" }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "OTP validation failed");
    }
  };

  const handleDispute = (booking) => {
    const reason = disputeMap[booking.id] || "";
    if (!reason.trim()) {
      toast.error("Please mention dispute reason");
      return;
    }
    raiseBookingDispute(booking.id, reason.trim());
    toast.success("Dispute submitted to support");
  };

  const handleReview = (booking) => {
    const data = reviewMap[booking.id] || { rating: "5", tags: "on-time,polite", comment: "Great service" };
    try {
      submitBookingReview({
        bookingId: booking.id,
        professionalId: booking.professionalId,
        serviceId: booking.serviceId,
        userEmail: booking.userEmail,
        rating: Number(data.rating || 5),
        tags: String(data.tags || "").split(",").map((item) => item.trim()).filter(Boolean),
        comment: data.comment || "",
      });
      toast.success("Review submitted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit review");
    }
  };

  if (!currentUser) {
    return (
      <div className="container flex flex-col items-center justify-center py-24 text-center">
        <h1 className="font-heading text-3xl font-bold">Login Required</h1>
        <p className="mt-2 text-muted-foreground">Please login/signup to view your booked services.</p>
        <Button asChild className="mt-5 border-0 bg-orange-500 text-white hover:bg-orange-600">
          <Link to="/auth?redirect=/my-bookings">Login / Signup</Link>
        </Button>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="container flex flex-col items-center justify-center py-24 text-center">
        <CalendarDays className="mb-4 h-16 w-16 text-muted-foreground/40" />
        <h1 className="font-heading text-3xl font-bold">No Bookings Yet</h1>
        <p className="mt-2 text-muted-foreground">Book your first service and it will appear here.</p>
        <Button asChild className="mt-5 border-0 bg-orange-500 text-white hover:bg-orange-600">
          <Link to="/services">Explore Services</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-10 md:py-12">
      <div className="mb-6 overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 p-6 text-white shadow-[0_18px_42px_hsl(24_85%_40%_/_0.22)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Account</p>
        <h1 className="mt-2 font-heading text-3xl font-bold md:text-4xl">My Bookings</h1>
        <p className="mt-2 text-sm text-white/90">Track your confirmed services, provider details, and visit schedule.</p>
      </div>

      {rescheduleStatus && (
        <div className="mb-5 rounded-2xl border border-violet-200 bg-[linear-gradient(120deg,hsl(252_100%_98%)_0%,hsl(24_100%_97%)_100%)] p-4 shadow-[0_10px_22px_hsl(260_45%_65%_/_0.18)]">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-700">
            <Repeat2 className="h-4 w-4" /> Reschedule Tracker
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white">
              Used {rescheduleStatus.used}/{rescheduleStatus.limit}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700 border border-violet-200">
              Left {rescheduleStatus.remaining}
            </span>
            <span className="text-xs text-slate-600">Resets in {rescheduleStatus.daysUntilReset} day(s)</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {bookings.map((booking) => {
          const professional = getProfessionalById(booking.professionalId);

          if (booking.status === "completed") {
            return (
              <div
                key={booking.id}
                className="rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_10px_24px_hsl(24_75%_62%_/_0.14)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-heading text-xl font-bold text-slate-900">{bookingDisplayTitle(booking)}</h3>
                  <Badge className="border-0 bg-emerald-600 text-white">completed</Badge>
                </div>

                <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {safeDateLabel(booking.date)}</p>
                  <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> {booking.time}</p>
                  <p className="flex items-center gap-2"><User className="h-4 w-4" /> Customer: {booking.name}</p>
                  <p className="flex items-center gap-2"><User className="h-4 w-4" /> {bookingDisplayProvider(booking)}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleDelete(booking)}>
                    Delete
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={booking.id}
              className="rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_10px_24px_hsl(24_75%_62%_/_0.14)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-heading text-xl font-bold text-slate-900">{bookingDisplayTitle(booking)}</h3>
                <Badge className="border-0 bg-orange-500 text-white">{booking.status}</Badge>
              </div>

              <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {safeDateLabel(booking.date)}</p>
                <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> {booking.time}</p>
                <p className="flex items-center gap-2"><User className="h-4 w-4" /> Customer: {booking.name}</p>
                <p className="flex items-center gap-2"><User className="h-4 w-4" /> {bookingDisplayProvider(booking)}</p>
              </div>

              <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/40 p-3">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Service Journey</span>
                  <span>SLA: {getSlaCountdown(booking.createdAt)}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {journeyStates.map((state, index) => {
                    const active = getProgressIndex(booking.status) >= index;
                    return (
                      <div
                        key={`${booking.id}-${state}`}
                        className={`rounded-lg border px-2.5 py-2 text-xs font-semibold ${active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-500"}`}
                      >
                        {state.replace("_", " ")}
                      </div>
                    );
                  })}
                </div>
              </div>

              {booking.notes && (
                <p className="mt-3 text-sm text-slate-600"><span className="font-medium text-slate-800">Notes:</span> {booking.notes}</p>
              )}

              {booking.priceBreakdown && (
                <p className="mt-2 text-sm text-slate-600">
                  Paid advance: ₹{booking.priceBreakdown.advancePayable} • Total: ₹{booking.priceBreakdown.payable} • Payment: {booking.paymentStatus || "pending"}
                </p>
              )}

              <div className="mt-4 space-y-3 rounded-xl border border-orange-100 bg-orange-50/40 p-3">
                {rescheduleStatus && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold text-violet-700">
                    <Repeat2 className="h-3.5 w-3.5" /> Reschedules left: {rescheduleStatus.remaining}/{rescheduleStatus.limit}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50">
                    <Link to={`/messages?booking=${booking.id}`}>Open Chat</Link>
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleDelete(booking)}>
                    Delete
                  </Button>
                  {booking.status !== "cancelled" && booking.status !== "completed" && (
                    <Button size="sm" variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50" onClick={() => handleCancel(booking.id)}>
                      Cancel Booking
                    </Button>
                  )}
                </div>

                {booking.status !== "completed" && booking.status !== "cancelled" && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                    <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-700">
                      <Repeat2 className="h-4 w-4" /> Reschedule Service
                    </p>
                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_140px]">
                      <div>
                        <Label className="text-xs font-semibold text-slate-700">New Date</Label>
                        <Input
                          type="date"
                          value={rescheduleMap[booking.id]?.date || ""}
                          onChange={(event) => setRescheduleMap((prev) => ({ ...prev, [booking.id]: { ...prev[booking.id], date: event.target.value } }))}
                          className="mt-1 border-blue-200 focus-visible:ring-blue-400"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-700">New Time</Label>
                        <Input
                          type="time"
                          value={rescheduleMap[booking.id]?.time || ""}
                          onChange={(event) => setRescheduleMap((prev) => ({ ...prev, [booking.id]: { ...prev[booking.id], time: event.target.value } }))}
                          className="mt-1 border-blue-200 focus-visible:ring-blue-400"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button size="sm" className="w-full border-0 bg-blue-600 text-white hover:bg-blue-700" onClick={() => handleReschedule(booking)}>
                          <Repeat2 className="mr-1.5 h-3.5 w-3.5" /> Reschedule
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-blue-600">
                      Current: {format(new Date(booking.date), "MMM dd, yyyy")} at {booking.time}
                    </p>
                  </div>
                )}

                {booking.status !== "cancelled" && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Start OTP</Label>
                      <div className="mt-1 flex gap-2">
                        <Input
                          value={otpMap[`${booking.id}-start`] || ""}
                          onChange={(event) => setOtpMap((prev) => ({ ...prev, [`${booking.id}-start`]: event.target.value }))}
                          placeholder="Enter OTP"
                        />
                        <Button size="sm" onClick={() => handleOtpVerify(booking, "start")}>
                          <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Start
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">End OTP</Label>
                      <div className="mt-1 flex gap-2">
                        <Input
                          value={otpMap[`${booking.id}-end`] || ""}
                          onChange={(event) => setOtpMap((prev) => ({ ...prev, [`${booking.id}-end`]: event.target.value }))}
                          placeholder="Enter OTP"
                        />
                        <Button size="sm" variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50" onClick={() => handleOtpVerify(booking, "end")}>
                          Complete
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs">Raise Dispute (SLA Center)</Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      value={disputeMap[booking.id] || ""}
                      onChange={(event) => setDisputeMap((prev) => ({ ...prev, [booking.id]: event.target.value }))}
                      placeholder="Issue with service quality, delay, payment..."
                    />
                    <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleDispute(booking)}>
                      <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Submit
                    </Button>
                  </div>
                </div>

                {booking.status === "completed" && !booking.reviewSubmitted && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="mb-2 text-sm font-semibold text-emerald-700">Verified Review</p>
                    <div className="grid gap-2 sm:grid-cols-[90px_1fr_1fr]">
                      <Input
                        value={reviewMap[booking.id]?.rating || "5"}
                        onChange={(event) => setReviewMap((prev) => ({ ...prev, [booking.id]: { ...(prev[booking.id] || {}), rating: event.target.value } }))}
                        placeholder="Rating"
                      />
                      <Input
                        value={reviewMap[booking.id]?.tags || "on-time,polite"}
                        onChange={(event) => setReviewMap((prev) => ({ ...prev, [booking.id]: { ...(prev[booking.id] || {}), tags: event.target.value } }))}
                        placeholder="tags: on-time,polite,clean"
                      />
                      <Button size="sm" onClick={() => handleReview(booking)}>
                        <Star className="mr-1 h-3.5 w-3.5" /> Submit Review
                      </Button>
                    </div>
                    <Textarea
                      className="mt-2"
                      value={reviewMap[booking.id]?.comment || ""}
                      onChange={(event) => setReviewMap((prev) => ({ ...prev, [booking.id]: { ...(prev[booking.id] || {}), comment: event.target.value } }))}
                      placeholder="Share your experience"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyBookings;
