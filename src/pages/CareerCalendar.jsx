import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getCareerApplicationsByEmail } from "@/data/careers";
import { getAllBookings } from "@/data/marketplace";
import { getServiceById } from "@/data/services";
import { getProfessionalById } from "@/data/professionals";

const CareerCalendar = () => {
  const currentUser = getCurrentUser();

  const calendarEntries = useMemo(() => {
    if (!currentUser?.email) {
      return [];
    }

    const approvedApplications = getCareerApplicationsByEmail(currentUser.email)
      .filter((application) => application.status === "approved");

    return getAllBookings()
      .filter((booking) => 
        booking.professionalEmail === currentUser.email &&
        approvedApplications.some((app) => app.serviceId === booking.serviceId) &&
        booking.status !== "cancelled"
      )
      .map((booking) => {
        const professional = getProfessionalById(booking.professionalId);
        const service = getServiceById(booking.serviceId);
        return {
          ...booking,
          professionalName: professional?.name || "Career profile",
          serviceTitle: service?.title || booking.serviceId,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
  }, [currentUser]);

  const markedDates = useMemo(() => {
    return calendarEntries.map((entry) => new Date(entry.date));
  }, [calendarEntries]);

  const upcomingEntries = calendarEntries.filter((entry) => new Date(`${entry.date}T23:59:59`).getTime() >= Date.now());

  if (!currentUser) {
    return (
      <div className="container flex flex-col items-center justify-center py-24 text-center">
        <CalendarDays className="mb-4 h-16 w-16 text-muted-foreground/40" />
        <h1 className="font-heading text-3xl font-bold text-slate-900">Career Calendar</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">Login to view bookings placed on your approved career profiles.</p>
        <Button asChild className="mt-5 border-0 bg-orange-500 text-white hover:bg-orange-600">
          <Link to="/auth?redirect=/career/calendar">Login / Signup</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10 md:py-12">
      <div className="mb-6 overflow-hidden rounded-[2rem] border border-orange-100 bg-[linear-gradient(135deg,hsl(24_96%_55%)_0%,hsl(29_92%_62%)_45%,hsl(36_92%_74%)_100%)] p-6 text-white shadow-[0_20px_48px_hsl(24_85%_40%_/_0.2)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Career Calendar</p>
        <h1 className="mt-2 font-heading text-3xl font-bold md:text-4xl">Only bookings for your approved career profiles</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/90">
          This calendar does not include the bookings you make as a customer in the main service site. It only marks dates when other users booked one of your career services.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-[0_14px_34px_hsl(24_75%_62%_/_0.12)]">
          <div className="mb-4 flex items-center gap-2 text-orange-700">
            <CalendarDays className="h-4 w-4" />
            <p className="text-sm font-semibold">Marked appointment dates</p>
          </div>
          <Calendar
            mode="multiple"
            selected={markedDates}
            modifiers={{ booked: markedDates }}
            modifiersClassNames={{
              booked: "bg-orange-500 text-white hover:bg-orange-500 hover:text-white rounded-full",
            }}
            className="rounded-2xl border border-orange-100 bg-orange-50/30 p-3"
          />
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-orange-100 bg-white p-5 shadow-[0_12px_28px_hsl(24_75%_62%_/_0.12)]">
              <Users className="h-5 w-5 text-orange-600" />
              <p className="mt-2 text-sm font-medium text-slate-500">Booked dates</p>
              <p className="mt-1 font-heading text-3xl font-bold text-slate-900">{calendarEntries.length}</p>
            </div>
            <div className="rounded-[1.5rem] border border-orange-100 bg-white p-5 shadow-[0_12px_28px_hsl(24_75%_62%_/_0.12)]">
              <Clock className="h-5 w-5 text-orange-600" />
              <p className="mt-2 text-sm font-medium text-slate-500">Upcoming</p>
              <p className="mt-1 font-heading text-3xl font-bold text-slate-900">{upcomingEntries.length}</p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-[0_14px_34px_hsl(24_75%_62%_/_0.12)]">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-orange-700">Booked service list</p>
                <p className="text-sm text-slate-500">Customer appointments on your approved career profiles only.</p>
              </div>
              <Badge className="border-0 bg-orange-500 text-white">{calendarEntries.length} total</Badge>
            </div>

            {calendarEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookings have been placed on your career profiles yet.</p>
            ) : (
              <div className="space-y-3">
                {calendarEntries.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{entry.serviceTitle}</p>
                        <p className="text-sm text-slate-500">{entry.professionalName}</p>
                      </div>
                      <Badge className="bg-white text-orange-700">{entry.status}</Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {format(new Date(entry.date), "PP")}</p>
                      <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> {entry.time}</p>
                      <p className="flex items-center gap-2 sm:col-span-2"><MapPin className="h-4 w-4" /> {entry.address}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareerCalendar;