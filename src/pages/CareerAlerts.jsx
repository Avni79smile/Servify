import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { AlertCircle, Bell, CalendarDays, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getCareerApplicationsByEmail } from "@/data/careers";
import { getAllBookings, getNotificationsByEmail, markNotificationRead } from "@/data/marketplace";
import { getProfessionalById } from "@/data/professionals";
import { toast } from "sonner";

const CareerAlerts = () => {
  const currentUser = getCurrentUser();

  const alerts = useMemo(() => {
    if (!currentUser?.email) {
      return [];
    }

    const approvedProfileIds = new Set(
      getCareerApplicationsByEmail(currentUser.email)
        .filter((application) => application.status === "approved")
        .map((application) => application.id),
    );

    const bookingsById = new Map(getAllBookings().map((booking) => [booking.id, booking]));

    return getNotificationsByEmail(currentUser.email)
      .filter((notification) => notification.type === "appointment_alert" && approvedProfileIds.has(notification.relatedProfessionalId))
      .map((notification) => {
        const booking = bookingsById.get(notification.relatedBookingId);
        const professional = booking ? getProfessionalById(booking.professionalId) : null;

        return {
          ...notification,
          booking,
          serviceName: booking?.serviceTitle || booking?.serviceId || "Career appointment",
          date: booking?.date || notification.createdAt,
          time: booking?.time || "",
          address: booking?.address || "",
          professionalName: professional?.name || currentUser.name,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="container flex flex-col items-center justify-center py-24 text-center">
        <Bell className="mb-4 h-16 w-16 text-muted-foreground/40" />
        <h1 className="font-heading text-3xl font-bold text-slate-900">Career Appointment Alerts</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">Login to see alerts for bookings on your approved career profiles.</p>
        <Button asChild className="mt-5 border-0 bg-orange-500 text-white hover:bg-orange-600">
          <Link to="/auth?redirect=/career/alerts">Login / Signup</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10 md:py-12">
      <div className="mb-6 overflow-hidden rounded-[2rem] border border-orange-100 bg-[linear-gradient(135deg,hsl(24_96%_55%)_0%,hsl(29_92%_62%)_45%,hsl(36_92%_74%)_100%)] p-6 text-white shadow-[0_20px_48px_hsl(24_85%_40%_/_0.2)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Appointment Alerts</p>
        <h1 className="mt-2 font-heading text-3xl font-bold md:text-4xl">Alerts for bookings on your career profiles only</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/90">
          This view ignores your customer-side service bookings and shows only notifications tied to your approved career profiles.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          className="border-orange-200 text-orange-700 hover:bg-orange-50"
          onClick={() => {
            alerts.forEach((alert) => {
              if (!alert.read) {
                markNotificationRead(currentUser.email, alert.id);
              }
            });
            toast.success("All career alerts marked as read");
          }}
        >
          Mark all read
        </Button>
        <Badge className="border-0 bg-orange-500 text-white">{alerts.length} alerts</Badge>
      </div>

      {alerts.length === 0 ? (
        <div className="rounded-[1.75rem] border border-orange-100 bg-white p-8 text-center shadow-[0_14px_34px_hsl(24_75%_62%_/_0.12)]">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h2 className="mt-3 font-heading text-2xl font-bold text-slate-900">No career alerts yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">When someone books your approved career profile, the alert will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div key={alert.id} className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-[0_14px_34px_hsl(24_75%_62%_/_0.12)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-heading text-xl font-bold text-slate-900">{alert.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{alert.message}</p>
                  <p className="mt-2 text-xs text-slate-500">{format(new Date(alert.createdAt), "PPp")}</p>
                </div>
                {!alert.read && <Badge className="bg-orange-500 text-white">New</Badge>}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
                  <CalendarDays className="h-4 w-4 text-orange-600" />
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">Date</p>
                  <p className="mt-1 font-semibold text-slate-900">{format(new Date(alert.date), "PP")}</p>
                </div>
                <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">Time</p>
                  <p className="mt-1 font-semibold text-slate-900">{alert.time || "Pending"}</p>
                </div>
                <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
                  <MapPin className="h-4 w-4 text-orange-600" />
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">Location</p>
                  <p className="mt-1 line-clamp-2 font-semibold text-slate-900">{alert.address || "No location added"}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {!alert.read && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-orange-200 text-orange-700 hover:bg-orange-50"
                    onClick={() => {
                      markNotificationRead(currentUser.email, alert.id);
                      toast.success("Alert marked as read");
                    }}
                  >
                    Mark read
                  </Button>
                )}
                <Button asChild size="sm" className="border-0 bg-orange-500 text-white hover:bg-orange-600">
                  <Link to="/career/calendar">Open calendar</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CareerAlerts;