import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, CalendarDays, CheckCircle2, Clock, ExternalLink, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser, AUTH_CHANGE_EVENT } from "@/lib/auth";
import { getPendingCareerApplications } from "@/data/careers";
import { getServiceById } from "@/data/services";
import {
  deleteNotification,
  executeNotificationAction,
  getNotificationsByEmail,
  markAllNotificationsRead,
  markNotificationRead,
  marketplaceEvents,
} from "@/data/marketplace";
import { hydrateMarketplaceAuxFromSupabase, hydrateCareerAuxFromSupabase } from "@/lib/supabaseSync";
import { toast } from "sonner";

const Notifications = () => {
  const currentUser = getCurrentUser();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const isAdmin = currentUser?.role === "admin";

  const sync = async () => {
    const latestUser = getCurrentUser();
    if (!latestUser?.email) {
      setNotifications([]);
      return;
    }

    // Hydrate from Supabase to ensure latest data
    if (latestUser.id) {
      if (isAdmin) {
        await hydrateCareerAuxFromSupabase({ userId: latestUser.id, userEmail: latestUser.email, isAdmin: true });
      } else {
        await hydrateMarketplaceAuxFromSupabase({ userId: latestUser.id, userEmail: latestUser.email });
      }
    }

    if (isAdmin) {
      const pending = getPendingCareerApplications().map((application) => {
        const service = getServiceById(application.serviceId);
        return {
          id: `APP-${application.id}`,
          title: "New service application pending verification",
          message: `${application.userName} applied for ${service?.title || application.serviceId}. Open dashboard to verify the profile.`,
          type: "application_alert",
          read: false,
          createdAt: application.createdAt,
          applicant: {
            name: application.userName,
            email: application.userEmail,
            phone: application.phone,
            city: application.city,
            serviceName: service?.title || application.serviceId,
          },
          actions: [{ label: "Open Dashboard", type: "open_url", payload: "/admin" }],
        };
      });
      setNotifications(pending);
      return;
    }

    setNotifications(getNotificationsByEmail(latestUser.email));
  };

  useEffect(() => {
    sync();
    window.addEventListener(marketplaceEvents.NOTIFICATION_EVENT, sync);
    window.addEventListener(AUTH_CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener(marketplaceEvents.NOTIFICATION_EVENT, sync);
      window.removeEventListener(AUTH_CHANGE_EVENT, sync);
    };
  }, [currentUser]);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  if (!currentUser) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-heading text-4xl font-bold">Login Required</h1>
        <p className="mt-2 text-muted-foreground">Please login to view your inbox.</p>
      </div>
    );
  }

  return (
    <div className="container py-10 md:py-12">
      <div className="mb-7 overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 p-6 text-white shadow-[0_18px_42px_hsl(24_85%_40%_/_0.22)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Normal Inbox</p>
        <h1 className="mt-2 font-heading text-3xl font-bold md:text-4xl">
          {isAdmin ? "Service Application Alerts" : "Booking & Subscription Updates"}
        </h1>
        <p className="mt-2 text-sm text-white/90">
          {isAdmin
            ? `${notifications.length} pending provider applications waiting for admin verification.`
            : `${unreadCount} unread inbox messages for booking confirmations, plan updates, and support actions.`}
        </p>
      </div>

      {!isAdmin && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="border-orange-200 text-orange-700 hover:bg-orange-50"
            onClick={() => {
              markAllNotificationsRead(currentUser.email);
              toast.success("All inbox messages marked as read");
            }}
          >
            <CheckCircle2 className="mr-1 h-4 w-4" /> Mark all as read
          </Button>
          <Button asChild variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50">
            <Link to="/my-bookings">Open bookings</Link>
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="rounded-2xl border border-orange-100 bg-white p-6 text-center text-slate-500">
            <Bell className="mx-auto mb-2 h-7 w-7 text-orange-400" />
            No inbox messages yet.
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 ${item.read ? "border-slate-200 bg-white" : "border-orange-200 bg-orange-50/45"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>

                  {item.bookingDetails && (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Booking Details</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{item.bookingDetails.serviceTitle}</p>
                      <p className="text-sm text-slate-600">Professional: {item.bookingDetails.professionalName}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {new Date(item.bookingDetails.date).toLocaleDateString()}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {item.bookingDetails.time}</span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm">
                          <p className="text-xs font-semibold text-emerald-700">Start OTP</p>
                          <p className="mt-1 font-mono text-base font-bold tracking-wider text-slate-900">{item.bookingDetails.startOtp || "-"}</p>
                        </div>
                        <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm">
                          <p className="text-xs font-semibold text-emerald-700">Complete OTP</p>
                          <p className="mt-1 font-mono text-base font-bold tracking-wider text-slate-900">{item.bookingDetails.completeOtp || "-"}</p>
                        </div>
                      </div>
                      <p className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> Keep OTP private and share only during service visit.</p>
                    </div>
                  )}
                </div>
              <div className="flex flex-wrap items-center gap-2">
                {!item.read && !isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-orange-200 text-orange-700 hover:bg-orange-50"
                    onClick={() => markNotificationRead(currentUser.email, item.id)}
                  >
                    Mark read
                  </Button>
                )}
                {!isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => {
                      deleteNotification(currentUser.email, item.id);
                      toast.success("Notification deleted");
                    }}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                  </Button>
                )}
              </div>
              </div>

              {isAdmin && item.applicant && (
                <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-slate-700">
                  <p><span className="font-semibold">Name:</span> {item.applicant.name}</p>
                  <p><span className="font-semibold">Email:</span> {item.applicant.email}</p>
                  <p><span className="font-semibold">Phone:</span> {item.applicant.phone}</p>
                  <p><span className="font-semibold">City:</span> {item.applicant.city}</p>
                  <p><span className="font-semibold">Service:</span> {item.applicant.serviceName}</p>
                </div>
              )}

              {!!item.actions?.length && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.actions.map((action, index) => (
                    <Button
                      key={`${item.id}-${action.label}`}
                      size="sm"
                      onClick={() => {
                        const resolved = executeNotificationAction(currentUser.email, item.id, index);
                        if (!resolved) {
                          return;
                        }
                        if (resolved.type === "open_url" && resolved.payload) {
                          navigate(resolved.payload);
                        }
                        toast.success(`${action.label} action completed`);
                      }}
                      className="border-0 bg-orange-500 text-white hover:bg-orange-600"
                    >
                      <ExternalLink className="mr-1 h-3.5 w-3.5" /> {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
