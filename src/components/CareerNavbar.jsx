import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Bot, BriefcaseBusiness, CalendarDays, ChevronDown, Home, LogOut, MessageCircle, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AUTH_CHANGE_EVENT, getCurrentUser, logoutUser } from "@/lib/auth";
import { getAllBookings, getNotificationsByEmail, marketplaceEvents } from "@/data/marketplace";
import { getCareerApplicationsByEmail } from "@/data/careers";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const portalLinks = [
  { to: "/career/portal/apply", label: "Apply" },
  { to: "/career/portal/dashboard", label: "Dashboard" },
  { to: "/career/portal/inbox", label: "Inbox" },
  { to: "/career/portal/chats", label: "Chats" },
];

const CareerNavbar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const initializedAlerts = useRef(false);
  const lastToastAlertId = useRef("");

  const isAdmin = currentUser?.role === "admin";
  const careerLinks = isAdmin
    ? [{ to: "/admin", label: "Dashboard", icon: BriefcaseBusiness }]
    : [
        { to: "/career", label: "Career Home", icon: Home },
        { to: "/career/portal/apply", label: "Career Portal", icon: BriefcaseBusiness },
        { to: "/career/ai", label: "Career AI", icon: Bot },
      ];

  useEffect(() => {
    const sync = () => {
      const user = getCurrentUser();
      setCurrentUser(user);

      if (user?.email && user.role !== "admin") {
        const userApprovedCareerProfileIds = new Set(
          getCareerApplicationsByEmail(user.email)
            .filter((application) => application.status === "approved")
            .map((application) => application.id),
        );
        const userAppointmentAlerts = getNotificationsByEmail(user.email).filter(
          (item) => item.type === "appointment_alert" && userApprovedCareerProfileIds.has(item.relatedProfessionalId),
        );
        setUnreadAlertCount(userAppointmentAlerts.filter((item) => !item.read).length);

        const latestUnreadAlert = userAppointmentAlerts.find((item) => !item.read);
        if (!initializedAlerts.current) {
          initializedAlerts.current = true;
          lastToastAlertId.current = latestUnreadAlert?.id || "";
        } else if (latestUnreadAlert?.id && latestUnreadAlert.id !== lastToastAlertId.current) {
          lastToastAlertId.current = latestUnreadAlert.id;
          toast(latestUnreadAlert.title, { description: latestUnreadAlert.message });
        }
      } else {
        setUnreadAlertCount(0);
      }
    };
    window.addEventListener(AUTH_CHANGE_EVENT, sync);
    window.addEventListener(marketplaceEvents.NOTIFICATION_EVENT, sync);
    sync();
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, sync);
      window.removeEventListener(marketplaceEvents.NOTIFICATION_EVENT, sync);
    };
  }, []);

  const bookingCount = (() => {
    const email = currentUser?.email || "";
    if (!email || currentUser?.role === "admin") {
      return 0;
    }

    const approvedCareerProfileIds = new Set(
      getCareerApplicationsByEmail(email)
        .filter((application) => application.status === "approved")
        .map((application) => application.id),
    );

    return getAllBookings().filter((booking) => approvedCareerProfileIds.has(booking.professionalId)).length;
  })();

  return (
    <nav className="sticky top-0 z-50 border-b border-orange-100/80 bg-white/82 backdrop-blur-2xl">
      <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
        <Link to="/career" className="flex items-center gap-3 font-heading text-[1.55rem] font-extrabold tracking-tight text-orange-700">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-300 text-sm text-white shadow-[0_10px_24px_hsl(24_85%_40%_/_0.26)]">
            C
          </span>
          <span>Servify Careers</span>
        </Link>

        <div className="hidden items-center gap-1 rounded-full border border-orange-100 bg-white/80 p-1.5 shadow-sm md:flex">
          {careerLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${pathname === link.to
                ? "bg-orange-500 text-white shadow-[0_10px_22px_hsl(24_85%_40%_/_0.22)]"
                : "text-slate-700 hover:bg-orange-50 hover:text-orange-700"}`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {currentUser?.name ? (
            <>
              {!isAdmin && (
                <Button
                  variant="ghost"
                  className="relative rounded-full border border-orange-100 bg-orange-50/70 px-2.5 py-2 text-slate-700 hover:bg-orange-100"
                  onClick={() => navigate("/career/alerts")}
                >
                  <Bell className="h-4 w-4" />
                  {unreadAlertCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadAlertCount}
                    </span>
                  )}
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50/70 px-2.5 py-2 text-slate-700 hover:bg-orange-100">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={currentUser?.avatarUrl} alt={currentUser?.name || "User"} />
                      <AvatarFallback className="bg-orange-100 text-orange-700">{(currentUser?.name || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm font-semibold md:inline">{currentUser?.name}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Career Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link to="/services">
                      <Store className="mr-2 h-4 w-4" /> Service Site
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link to="/career/calendar">
                      <CalendarDays className="mr-2 h-4 w-4" /> Calendar
                      {bookingCount > 0 && <span className="ml-auto text-xs text-muted-foreground">{bookingCount} booked</span>}
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link to="/career/alerts">
                      <Bell className="mr-2 h-4 w-4" /> Appointment Alerts
                      {unreadAlertCount > 0 && <span className="ml-auto text-xs text-muted-foreground">{unreadAlertCount} new</span>}
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => {
                      void logoutUser();
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild className="rounded-full border-0 bg-orange-500 text-white hover:bg-orange-600">
              <Link to="/auth?redirect=/career/portal">Login</Link>
            </Button>
          )}
        </div>

        <div className="w-full space-y-2 md:hidden">
          {careerLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${pathname === link.to
                ? "bg-orange-500 text-white"
                : "text-slate-700 hover:bg-orange-50 hover:text-orange-700"}`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </div>

        {pathname.startsWith("/career/portal") && (
          <div className="w-full border-t border-orange-100 pt-3">
            <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-2 px-1 sm:gap-3 sm:px-2">
              {portalLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-all sm:px-5 ${pathname === link.to
                    ? "bg-orange-500 text-white shadow-[0_8px_18px_hsl(24_85%_40%_/_0.2)]"
                    : "border border-orange-200 bg-white text-orange-700 hover:bg-orange-50"}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default CareerNavbar;
