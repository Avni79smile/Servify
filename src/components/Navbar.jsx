import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, BriefcaseBusiness, ChevronDown, Menu, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AUTH_CHANGE_EVENT, getCurrentUser, logoutUser } from "@/lib/auth";
import { getNotificationsByEmail, marketplaceEvents } from "@/data/marketplace";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const links = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/career", label: "Career Portal", icon: BriefcaseBusiness },
];

const moreLinks = [
  { to: "/inbox", label: "Inbox" },
  { to: "/applicant-inbox", label: "Applicant Inbox" },
  { to: "/plans", label: "Plans" },
  { to: "/analytics", label: "Analytics" },
  { to: "/my-bookings", label: "My Bookings" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [userName, setUserName] = useState(getCurrentUser()?.name || "");
  const [userAvatar, setUserAvatar] = useState(getCurrentUser()?.avatarUrl || "");
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const initializedAlerts = useRef(false);
  const lastToastAlertId = useRef("");
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isAdmin = currentUser?.role === "admin";
  const navLinks = isAdmin ? links.filter((link) => link.to === "/career") : links;
  const accountLinks = isAdmin
    ? [
        { to: "/inbox", label: "Inbox" },
        { to: "/applicant-inbox", label: "Chat" },
      ]
    : moreLinks;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (pathname === "/services") {
      setQuery(params.get("q") || "");
    } else if (pathname === "/") {
      setQuery("");
    }
  }, [pathname]);

  useEffect(() => {
    const syncAuth = () => {
      const user = getCurrentUser();
      setCurrentUser(user);
      setUserName(user?.name || "");
      setUserAvatar(user?.avatarUrl || "");
      if (user?.email) {
        const appointmentAlerts = getNotificationsByEmail(user.email).filter(
          (item) => item.type === "appointment_alert",
        );
        setUnreadAlertCount(appointmentAlerts.filter((item) => !item.read).length);

        const latestUnreadAlert = appointmentAlerts.find((item) => !item.read);
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
    window.addEventListener(AUTH_CHANGE_EVENT, syncAuth);
    window.addEventListener(marketplaceEvents.NOTIFICATION_EVENT, syncAuth);
    syncAuth();
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, syncAuth);
      window.removeEventListener(marketplaceEvents.NOTIFICATION_EVENT, syncAuth);
    };
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      navigate("/services");
      setOpen(false);
      return;
    }

    navigate(`/services?q=${encodeURIComponent(trimmedQuery)}`);
    setOpen(false);
  };

  const handleQuickSearch = (event) => {
    const nextQuery = event.target.value;
    setQuery(nextQuery);

    if (pathname === "/services") {
      navigate(`/services?q=${encodeURIComponent(nextQuery.trim())}`, { replace: true });
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/60 bg-white/78 backdrop-blur-2xl">
      <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3 lg:flex-nowrap">
        <Link to="/" className="font-heading text-[1.65rem] font-extrabold tracking-tight text-orange-600 transition-transform hover:scale-[1.02]">
          Servify
        </Link>

        {!isAdmin && (
          <form onSubmit={handleSearch} className="neo-panel order-3 flex w-full items-center gap-2 rounded-2xl px-3 py-2 lg:order-none lg:w-[34%]">
            <Search className="h-4 w-4 shrink-0 text-orange-500" />
            <Input
              value={query}
              onChange={handleQuickSearch}
              placeholder="Search services"
              className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
            <Button type="submit" size="sm" className="rounded-xl border-0 bg-orange-500 px-3 text-white hover:bg-orange-600">
              Search
            </Button>
          </form>
        )}

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${pathname === link.to
                ? "bg-orange-500 text-white shadow-sm"
                : "text-slate-600 hover:bg-orange-50 hover:text-orange-700"}`}
            >
              {link.icon ? <link.icon className="h-4 w-4" /> : null}
              {link.label}
            </Link>
          ))}

          {userName ? (
            <>
              <Button
                variant="ghost"
                className="relative ml-1 rounded-full border border-orange-100 bg-orange-50/70 px-2.5 py-2 text-slate-700 hover:bg-orange-100"
                onClick={() => navigate("/inbox")}
              >
                <Bell className="h-4 w-4" />
                {unreadAlertCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadAlertCount}
                  </span>
                )}
              </Button>

              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="ml-1 flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50/70 px-2.5 py-2 text-slate-700 hover:bg-orange-100">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userAvatar} alt={userName} />
                    <AvatarFallback className="bg-orange-100 text-orange-700">{userName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-semibold md:inline">{userName}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {accountLinks.map((link) => (
                  <DropdownMenuItem key={link.to} asChild>
                    <Link to={link.to}>{link.label}</Link>
                  </DropdownMenuItem>
                ))}
                {!isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/career">Career Portal</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    void logoutUser();
                  }}
                  className="text-red-600 focus:text-red-600"
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild size="sm" className="ml-2 rounded-full border-0 bg-orange-500 px-4 text-white shadow-sm hover:bg-orange-600">
              <Link to={`/auth?redirect=${encodeURIComponent(pathname)}`}>Signup / Login</Link>
            </Button>
          )}
        </div>

        <button className="rounded-full border border-orange-100 bg-white px-3 py-2 md:hidden" onClick={() => setOpen((prev) => !prev)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (<div className="border-t border-orange-100 bg-white/96 backdrop-blur md:hidden">
          <div className="container flex flex-col gap-2 py-4">
            {navLinks.map((link) => (<Link key={link.to} to={link.to} onClick={() => setOpen(false)} className={`rounded-2xl px-3 py-2 text-sm font-semibold transition-colors ${pathname === link.to
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-slate-600 hover:bg-orange-50"}`}>
                <span className="flex items-center gap-2">
                  {link.icon ? <link.icon className="h-4 w-4" /> : null}
                  {link.label}
                </span>
              </Link>))}
            {userName ? (
              <div className="mt-1 flex gap-2">
                {!isAdmin && (
                  <Button asChild variant="outline" className="flex-1 rounded-full border-orange-200 text-orange-700 hover:bg-orange-50">
                    <Link to="/career" onClick={() => setOpen(false)}>Career Portal</Link>
                  </Button>
                )}
                <Button variant="outline" className="flex-1 rounded-full border-orange-200 text-orange-700 hover:bg-orange-50" onClick={() => { void logoutUser(); setOpen(false); }}>
                  Logout
                </Button>
              </div>
            ) : (
              <Button asChild className="mt-1 rounded-full border-0 bg-orange-500 text-white hover:bg-orange-600">
                <Link to={`/auth?redirect=${encodeURIComponent(pathname)}`} onClick={() => setOpen(false)}>
                  Signup / Login
                </Link>
              </Button>
            )}
          </div>
        </div>)}
    </nav>
  );
};

export default Navbar;
