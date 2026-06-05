import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Index from "@/pages/Index";
import Services from "@/pages/Services";
import BookService from "@/pages/BookService";
import MyBookings from "@/pages/MyBookings";
import NotFound from "@/pages/NotFound";
import ServiceProfiles from "@/pages/ServiceProfiles";
import Auth from "@/pages/Auth";
import CareerPortal from "@/pages/CareerPortal";
import CareerAI from "@/pages/CareerAI";
import CareerHome from "@/pages/CareerHome";
import CareerCalendar from "@/pages/CareerCalendar";
import CareerAlerts from "@/pages/CareerAlerts";
import HelpChatbot from "@/components/HelpChatbot";
import SubscriptionPlans from "@/pages/SubscriptionPlans";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminProviderDashboard from "@/pages/AdminProviderDashboard";
import Messages from "@/pages/Messages";
import ProfessionalMessages from "@/pages/ProfessionalMessages";
import Notifications from "@/pages/Notifications";
import SupabaseTodos from "@/pages/SupabaseTodos";
import CareerNavbar from "@/components/CareerNavbar";
import { getCurrentUser, initializeAuthSync } from "@/lib/auth";
import { supabase } from "@/utils/supabase";

// Health check to verify Supabase connectivity
const checkSupabaseHealth = async () => {
  try {
    console.log("[Servify Health Check] Testing Supabase connectivity...");
    const { data, error } = await supabase
      .from("career_applications")
      .select("id")
      .limit(1);
    
    if (error) {
      console.error("[Servify Health Check] ❌ Supabase error:", error.message, error.code);
      return false;
    }
    
    console.log("[Servify Health Check] ✅ Supabase is reachable!");
    return true;
  } catch (err) {
    console.error("[Servify Health Check] ❌ Network error:", err.message);
    return false;
  }
};

const queryClient = new QueryClient();
const SHOW_SUBSCRIPTION_POPUP_KEY = "servify_show_subscription_popup";

const MainSiteLayout = () => {
  const location = useLocation();
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return;
    }
    if (currentUser.role === "admin") {
      setShowSubscriptionPopup(false);
      return;
    }

    const shouldShow = localStorage.getItem(SHOW_SUBSCRIPTION_POPUP_KEY) === "1";
    if (shouldShow && location.pathname !== "/auth") {
      setShowSubscriptionPopup(true);
    }
  }, [location.pathname]);

  const closeSubscriptionPopup = () => {
    localStorage.removeItem(SHOW_SUBSCRIPTION_POPUP_KEY);
    setShowSubscriptionPopup(false);
  };

  return (
    <div className="app-shell flex min-h-screen flex-col bg-white">
      <Dialog open={showSubscriptionPopup}>
        <DialogContent
          className="h-[90vh] overflow-y-auto p-0 sm:max-w-[1100px] [&>button]:hidden"
          onPointerDownOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <SubscriptionPlans
            embedded
            requireSelection
            onComplete={closeSubscriptionPopup}
            onSkip={closeSubscriptionPopup}
          />
        </DialogContent>
      </Dialog>

      <div className="spark-bg" />
      <div className="sticky top-0 z-40">
        <Navbar />
      </div>
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <HelpChatbot />
    </div>
  );
};

const CareerSiteLayout = () => (
  <div className="app-shell flex min-h-screen flex-col bg-[linear-gradient(180deg,hsl(36_90%_98%)_0%,hsl(26_85%_95%)_100%)]">
    <div className="sticky top-0 z-40">
      <CareerNavbar />
    </div>
    <main className="flex-1">
      <Outlet />
    </main>
  </div>
);

const App = () => {
  useEffect(() => {
    // Run health check first, then initialize auth
    checkSupabaseHealth().then((isHealthy) => {
      if (isHealthy) {
        initializeAuthSync();
      } else {
        console.warn("[Servify] Supabase is not reachable. The app may not function properly.");
      }
    });
  }, []);

  useEffect(() => {
    // Remove heart emoji from document title if present
    const cleanTitle = () => {
      document.title = document.title.replace(/❤\s*/g, '').trim();
    };
    
    // Clean on mount
    cleanTitle();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/career" element={<CareerSiteLayout />}>
              <Route index element={<CareerHome />} />
              <Route path="portal" element={<Navigate to="/career/portal/apply" replace />} />
              <Route path="portal/:section" element={<CareerPortal />} />
              <Route path="calendar" element={<CareerCalendar />} />
              <Route path="alerts" element={<CareerAlerts />} />
              <Route path="ai" element={<CareerAI />} />
              <Route path="*" element={<Navigate to="/career" replace />} />
            </Route>

            <Route element={<MainSiteLayout />}>
              <Route path="/" element={<Index />}/>
              <Route path="/services" element={<Services />}/>
              <Route path="/services/:serviceId" element={<ServiceProfiles />}/>
              <Route path="/book" element={<BookService />}/>
              <Route path="/my-bookings" element={<MyBookings />}/>
              <Route path="/auth" element={<Auth />}/>
              <Route path="/plans" element={<SubscriptionPlans />}/>
              <Route path="/analytics" element={<AdminDashboard />}/>
              <Route path="/admin" element={<AdminProviderDashboard />}/>
              <Route path="/applicant-inbox" element={<Messages />}/>
              <Route path="/professional-messages" element={<ProfessionalMessages />}/>
              <Route path="/inbox" element={<Notifications />}/>
              <Route path="/messages" element={<Navigate to="/applicant-inbox" replace />}/>
              <Route path="/alerts" element={<Navigate to="/inbox" replace />}/>
              <Route path="/career-ai" element={<Navigate to="/career/ai" replace />}/>
              <Route path="/supabase-test" element={<SupabaseTodos />}/>
              <Route path="*" element={<NotFound />}/>
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};
export default App;
