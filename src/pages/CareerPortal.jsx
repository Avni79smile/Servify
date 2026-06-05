import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BadgeCheck, Bell, BriefcaseBusiness, CheckCircle2, Mail, MapPin, MessageCircle, Phone, Send, Trash2, UserX, Users, XCircle, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { services } from "@/data/services";
import {
  careerChatEvent,
  deleteCareerChatMessage,
  deleteCareerApplication,
  deleteCareerNotification,
  editCareerChatMessage,
  getCareerChatMessagesByApplication,
  getCareerApplications,
  getCareerApplicationsByEmail,
  getCareerNotificationsByEmail,
  getPendingCareerApplications,
  markCareerNotificationRead,
  markCareerNotificationsRead,
  reviewCareerApplication,
  sendCareerChatMessage,
  submitCareerApplication,
} from "@/data/careers";
import { getCurrentUser, AUTH_CHANGE_EVENT, deleteCurrentUserAccount, updateCurrentUserProfile } from "@/lib/auth";
import { getProfessionalsByService } from "@/data/professionals";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  deleteMarketplaceChatMessage,
  editMarketplaceChatMessage,
  getAllBookings,
  getChatMessagesByBooking,
  marketplaceEvents,
  sendChatMessage,
} from "@/data/marketplace";
import { getCareerSyncError, hydrateCareerApplicationsFromSupabase, hydrateCareerAuxFromSupabase } from "@/lib/supabaseSync";
const BOOKINGS_KEY = "servify_bookings";
const sectionHeroImages = {
  apply: {
    src: "https://images.pexels.com/photos/5439143/pexels-photo-5439143.jpeg?cs=srgb&dl=pexels-tima-miroshnichenko-5439143.jpg&fm=jpg",
    alt: "Professional candidate attending an interview",
  },
  dashboard: {
    src: "https://images.pexels.com/photos/7688460/pexels-photo-7688460.jpeg?cs=srgb&dl=pexels-mikael-blomkvist-7688460.jpg&fm=jpg",
    alt: "Professional checking reports on a dashboard",
  },
  inbox: {
    src: "https://images.pexels.com/photos/4450312/pexels-photo-4450312.jpeg?cs=srgb&dl=pexels-karolina-grabowska-4450312.jpg&fm=jpg",
    alt: "Person reading inbox messages on laptop",
  },
  chats: {
    src: "https://images.pexels.com/photos/7709285/pexels-photo-7709285.jpeg?cs=srgb&dl=pexels-mart-production-7709285.jpg&fm=jpg",
    alt: "Customer support style chat conversation on phone",
  },
};
const validSections = ["apply", "dashboard", "inbox", "chats"];
const sectionMeta = {
  apply: {
    badge: "Application Studio",
    title: "Build a polished career profile",
    description: "Choose a role, add your details, and submit a profile that feels refined and professional.",
  },
  dashboard: {
    badge: "Career Dashboard",
    title: "Track your progress in one place",
    description: "See applications, bookings, and live profile status in a structured dashboard view.",
  },
  inbox: {
    badge: "Career Inbox",
    title: "Keep validation updates organized",
    description: "Review approved, rejected, and profile update messages in a dedicated inbox.",
  },
  validation: {
    badge: "Review Queue",
    title: "Approve candidates with clarity",
    description: "Validate applications from a clean review screen with clear actions and status cues.",
  },
  chats: {
    badge: "Customer Chats",
    title: "Chat with your customers",
    description: "Respond to customer messages and manage your service bookings in real-time.",
  },
};

const normalizeSearchText = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const getInitials = (value) => normalizeSearchText(value).split(" ").filter(Boolean).map((word) => word[0]).join("");
const normalizeEmailValue = (value) => String(value || "").trim().toLowerCase();
const ADMIN_DISPLAY_NAME = "Admin";

const isBookingForApplicant = (booking, approvedApps, applicantEmail) => {
  const approvedIds = new Set((approvedApps || []).map((app) => app.id));
  const approvedEmails = new Set((approvedApps || []).map((app) => normalizeEmailValue(app.userEmail)).filter(Boolean));
  const applicant = normalizeEmailValue(applicantEmail);

  const bookingProfessionalId = String(booking?.professionalId || "").trim();
  const bookingProfessionalIdEmail = normalizeEmailValue(bookingProfessionalId);
  const bookingProfessionalEmail = normalizeEmailValue(booking?.professionalEmail);

  if (approvedIds.has(bookingProfessionalId)) return true;
  if (bookingProfessionalEmail && approvedEmails.has(bookingProfessionalEmail)) return true;
  if (bookingProfessionalIdEmail && approvedEmails.has(bookingProfessionalIdEmail)) return true;
  if (applicant && bookingProfessionalEmail === applicant) return true;
  if (applicant && bookingProfessionalIdEmail === applicant) return true;

  return false;
};

const CareerPortal = () => {
    const navigate = useNavigate();
  const { section } = useParams();
  const activeSection = validSections.includes(section || "") ? section : "apply";
  const meta = sectionMeta[activeSection];
  const heroImage = sectionHeroImages[activeSection] || sectionHeroImages.apply;

  // Redirect admin users to admin dashboard
  useEffect(() => {
    const user = getCurrentUser();
    if (user && user.role === "admin") {
      navigate("/admin", { replace: true });
    }
  }, [navigate]);

    const [currentUser, setCurrentUser] = useState(getCurrentUser());
    const [applications, setApplications] = useState(getCareerApplications());
    const [notifications, setNotifications] = useState([]);
    const [serviceId, setServiceId] = useState(services[0]?.id || "");
    const [serviceQuery, setServiceQuery] = useState(services[0]?.title || "");
    const [phone, setPhone] = useState("");
    const [city, setCity] = useState("");
    const [gender, setGender] = useState("");
    const [experienceYears, setExperienceYears] = useState(2);
    const [profilePhoto, setProfilePhoto] = useState("");
    const [profilePhotoFile, setProfilePhotoFile] = useState(null);
    const [profilePhotoName, setProfilePhotoName] = useState("");
    const [whyJoin, setWhyJoin] = useState("");
    const [bookings, setBookings] = useState([]);
    const [selectedBookingId, setSelectedBookingId] = useState("");
    const [chatInput, setChatInput] = useState("");
    const [selectedApplicationChatId, setSelectedApplicationChatId] = useState("");
    const [applicationChatInput, setApplicationChatInput] = useState("");
    const [chatView, setChatView] = useState("admin");
    
    // Dialog states for confirmations
    const [deleteProfileDialogOpen, setDeleteProfileDialogOpen] = useState(false);
    const [deleteProfileId, setDeleteProfileId] = useState(null);
    const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
    const [deleteAdminMessageDialogOpen, setDeleteAdminMessageDialogOpen] = useState(false);
    const [deleteAdminMessageId, setDeleteAdminMessageId] = useState(null);
    const [deleteCustomerMessageDialogOpen, setDeleteCustomerMessageDialogOpen] = useState(false);
    const [deleteCustomerMessageId, setDeleteCustomerMessageId] = useState(null);
    
    const syncTimeoutRef = useRef(null);  // Debounce synchronization to prevent infinite loops
    
    const syncData = async () => {
      const latestUser = getCurrentUser();
      setCurrentUser(latestUser);

      if (!latestUser?.email) {
        setApplications([]);
        setNotifications([]);
        setBookings([]);
        return;
      }

      if (latestUser?.id) {
        await hydrateCareerApplicationsFromSupabase({ userId: latestUser.id, isAdmin: latestUser.role === "admin" });
        await hydrateCareerAuxFromSupabase({ userId: latestUser.id, userEmail: latestUser.email, isAdmin: latestUser.role === "admin" });
      }

      setApplications(getCareerApplications());
      const inbox = getCareerNotificationsByEmail(latestUser.email);
      setNotifications(inbox.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));

      const approvedApps = getCareerApplicationsByEmail(latestUser.email).filter((app) => app.status === "approved");
      const userBookings = getAllBookings().filter((booking) =>
        isBookingForApplicant(booking, approvedApps, latestUser.email),
      );
      setBookings(userBookings);
    };
    useEffect(() => {
        void syncData();
        const syncHandler = () => {
          // Debounce: cancel previous timeout and set new one
          // This prevents the infinite loop: storage event → syncData → setItem → storage event → ...
          if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
          }
          syncTimeoutRef.current = setTimeout(() => {
            void syncData();
            syncTimeoutRef.current = null;
          }, 300);  // Wait 300ms before syncing again
        };
        window.addEventListener(AUTH_CHANGE_EVENT, syncHandler);
        window.addEventListener("servify-career-changed", syncHandler);
        window.addEventListener(careerChatEvent, syncHandler);
        window.addEventListener("storage", syncHandler);
        window.addEventListener(marketplaceEvents.CHAT_EVENT, syncHandler);
        return () => {
            if (syncTimeoutRef.current) {
              clearTimeout(syncTimeoutRef.current);
            }
            window.removeEventListener(AUTH_CHANGE_EVENT, syncHandler);
            window.removeEventListener("servify-career-changed", syncHandler);
          window.removeEventListener(careerChatEvent, syncHandler);
            window.removeEventListener("storage", syncHandler);
            window.removeEventListener(marketplaceEvents.CHAT_EVENT, syncHandler);
        };
    }, []);
    useEffect(() => {
      if (!section || !validSections.includes(section)) {
        navigate("/career/portal/apply", { replace: true });
      }
    }, [section, navigate]);
    const myApplications = useMemo(() => {
        if (!currentUser)
            return [];
        return getCareerApplicationsByEmail(currentUser.email).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }, [currentUser, applications]);
    const approvedApplications = myApplications.filter((application) => application.status === "approved");
    const pendingApplications = myApplications.filter((application) => application.status === "pending");
    const rejectedApplications = myApplications.filter((application) => application.status === "rejected");
    const selectedService = useMemo(() => services.find((item) => item.id === serviceId) || null, [serviceId]);
    const serviceSuggestions = useMemo(() => {
      const query = normalizeSearchText(serviceQuery);
      if (!query) {
        return services.slice(0, 12);
      }

      return services
        .filter((service) => {
          const title = normalizeSearchText(service.title);
          const category = normalizeSearchText(service.category);
          const combined = `${title} ${category}`.trim();
          const initials = getInitials(`${service.title} ${service.category}`);
          return combined.includes(query) || initials.includes(query) || initials.startsWith(query);
        })
        .slice(0, 12);
    }, [serviceQuery]);
    const myBookings = useMemo(() => {
        const allBookings = getAllBookings();
        return allBookings.filter((booking) =>
          isBookingForApplicant(booking, approvedApplications, currentUser?.email),
        );
    }, [approvedApplications, currentUser?.email, bookings]);
    const handleApply = async (event) => {
        event.preventDefault();
        if (!currentUser) {
            toast.error("Please login/signup before applying");
          navigate("/auth?redirect=/career/portal/apply");
            return;
        }
      if (!serviceId || !phone || !city || !gender || !whyJoin) {
            toast.error("Please complete all required fields");
            return;
        }
      let finalPhoto = profilePhoto || currentUser.avatarUrl || "";
      if (profilePhotoFile) {
        try {
          const updated = await updateCurrentUserProfile({ avatarFile: profilePhotoFile });
          finalPhoto = updated.avatarUrl || finalPhoto;
        } catch {
          toast.error("Photo upload failed, but application will be submitted without new photo.");
        }
      }

      const createdApplication = await submitCareerApplication({
        userId: currentUser.id,
            userName: currentUser.name,
            userEmail: currentUser.email,
            phone,
            city,
            gender,
            serviceId,
        serviceSlug: serviceId,
        serviceTitle: selectedService?.title || serviceId,
            experienceYears,
        profilePhoto: finalPhoto,
            whyJoin,
        });
        if (createdApplication?.syncSuccess === false) {
          const details = getCareerSyncError();
          toast.error(details ? `Application saved locally, DB sync failed: ${details}` : "Application saved locally but database sync failed. Please check Supabase policies.");
        } else {
          toast.success("Application submitted. Validation message sent to your inbox.");
        }
        setPhone("");
        setCity("");
        setGender("");
        setWhyJoin("");
        setProfilePhoto("");
      setProfilePhotoFile(null);
        setProfilePhotoName("");
        await syncData();
    };
    const handlePhotoUpload = (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            setProfilePhoto("");
            setProfilePhotoName("");
            return;
        }
        if (!file.type.startsWith("image/")) {
            toast.error("Please upload an image file");
            event.target.value = "";
            return;
        }
        setProfilePhotoFile(file);
        setProfilePhoto(URL.createObjectURL(file));
        setProfilePhotoName(file.name);
    };
    const handleReview = async (applicationId, status) => {
        const updated = await reviewCareerApplication(applicationId, status);
        if (updated?.syncSuccess === false) {
          const details = getCareerSyncError();
          toast.error(details ? `Status updated locally, DB sync failed: ${details}` : "Status updated locally but database sync failed. Please check Supabase policies.");
        } else {
          toast.success(status === "approved" ? "Application approved" : "Application rejected");
        }
        await syncData();
    };

    const handleDeleteProfile = (applicationId) => {
      setDeleteProfileId(applicationId);
      setDeleteProfileDialogOpen(true);
    };

    const confirmDeleteProfile = () => {
      if (!currentUser || !deleteProfileId) {
        return;
      }
      deleteCareerApplication(deleteProfileId, currentUser.email);
      toast.success("Career profile deleted");
      setDeleteProfileDialogOpen(false);
      setDeleteProfileId(null);
      syncData();
    };

    const handleDeleteAccount = async () => {
      setDeleteAccountDialogOpen(true);
    };

    const confirmDeleteAccount = async () => {
      try {
        await deleteCurrentUserAccount();
        toast.success("Your account and associated data were deleted");
        navigate("/");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete account");
      }
    };
    const serviceName = (id) => services.find((service) => service.id === id)?.title || id;
    
    const handleSendMessage = () => {
        if (!selectedBookingId || !chatInput.trim()) return;
        
        const selectedBooking = bookings.find(b => b.id === selectedBookingId);
        if (!selectedBooking) return;
        
        sendChatMessage({
            bookingId: selectedBookingId,
            senderEmail: currentUser.email,
            senderName: currentUser.name,
            text: chatInput,
        });
        
        setChatInput("");
    };
    
    const selectedBooking = useMemo(() => 
        bookings.find(booking => booking.id === selectedBookingId) || null, 
        [bookings, selectedBookingId]
    );
    
    const chatMessages = useMemo(() => {
        if (!selectedBooking) return [];
        return getChatMessagesByBooking(selectedBooking.id);
    }, [selectedBooking]);

    useEffect(() => {
      if (!myApplications.length) {
        setSelectedApplicationChatId("");
        return;
      }
      if (!selectedApplicationChatId || !myApplications.some((application) => application.id === selectedApplicationChatId)) {
        setSelectedApplicationChatId(myApplications[0].id);
      }
    }, [myApplications, selectedApplicationChatId]);

    const selectedApplicationForChat = useMemo(
      () => myApplications.find((application) => application.id === selectedApplicationChatId) || null,
      [myApplications, selectedApplicationChatId],
    );

    const applicationChatMessages = useMemo(() => {
      if (!selectedApplicationForChat) {
        return [];
      }
      return getCareerChatMessagesByApplication(selectedApplicationForChat.id);
    }, [selectedApplicationForChat, applications, notifications]);

    useEffect(() => {
      if (chatView === "admin" && myApplications.length === 0 && bookings.length > 0) {
        setChatView("customer");
        return;
      }
      if (chatView === "customer" && bookings.length === 0 && myApplications.length > 0) {
        setChatView("admin");
      }
    }, [chatView, myApplications.length, bookings.length]);

    const handleSendApplicationMessage = () => {
      if (!selectedApplicationForChat || !currentUser || !applicationChatInput.trim()) {
        return;
      }

      sendCareerChatMessage({
        applicationId: selectedApplicationForChat.id,
        senderEmail: currentUser.email,
        senderName: currentUser.name,
        text: applicationChatInput,
      });

      setApplicationChatInput("");
      syncData();
    };

    const handleEditAdminMessage = (message) => {
      if (!message || message.senderEmail !== currentUser?.email) return;
      const nextText = window.prompt("Edit your message", message.text || "");
      if (nextText === null) return;
      editCareerChatMessage({ messageId: message.id, requesterEmail: currentUser.email, nextText });
      void syncData();
    };

    const handleDeleteAdminMessage = (message) => {
      if (!message || message.senderEmail !== currentUser?.email) return;
      setDeleteAdminMessageId(message.id);
      setDeleteAdminMessageDialogOpen(true);
    };

    const confirmDeleteAdminMessage = () => {
      if (!deleteAdminMessageId) return;
      deleteCareerChatMessage({ messageId: deleteAdminMessageId, requesterEmail: currentUser.email });
      setDeleteAdminMessageDialogOpen(false);
      setDeleteAdminMessageId(null);
      void syncData();
    };

    const handleDeleteCustomerMessage = (message) => {
      if (!message || message.senderEmail !== currentUser?.email) return;
      setDeleteCustomerMessageId(message.id);
      setDeleteCustomerMessageDialogOpen(true);
    };

    const confirmDeleteCustomerMessage = () => {
      if (!deleteCustomerMessageId) return;
      deleteMarketplaceChatMessage({ messageId: deleteCustomerMessageId, requesterEmail: currentUser.email });
      setDeleteCustomerMessageDialogOpen(false);
      setDeleteCustomerMessageId(null);
      void syncData();
    };
    return (<div className="container py-10 md:py-12">
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-orange-100 bg-[radial-gradient(140%_120%_at_10%_-10%,hsl(33_100%_98%)_0%,hsl(31_100%_96%)_45%,hsl(29_92%_94%)_100%)] p-6 shadow-[0_18px_44px_hsl(24_75%_62%_/_0.18)] lg:p-10">
        <div className="space-y-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-700 shadow-[0_8px_18px_hsl(24_85%_40%_/_0.08)]">
              {currentUser?.role === "admin" ? "Dashboard" : "Career Portal"}
            </span>
          </div>

          <div className="overflow-hidden rounded-[1.85rem] border border-white/80 bg-white/80 shadow-[0_16px_36px_hsl(24_75%_62%_/_0.12)] backdrop-blur">
            <div className="relative overflow-hidden">
              <img
                src={heroImage.src}
                alt={heroImage.alt}
                className="h-[26rem] w-full object-cover sm:h-[30rem]"
                loading="eager"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,15,23,0)_22%,rgba(10,15,23,0.72)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-100">{meta.badge}</p>
                <h2 className="mt-2 font-heading text-2xl font-bold">{meta.title}</h2>
                <p className="mt-2 max-w-xl text-sm text-white/85">{meta.description}</p>
              </div>
            </div>

            <div className="grid gap-3 p-5">
              <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
                <Users className="h-5 w-5 text-orange-600"/>
                <p className="mt-2 font-heading text-2xl font-bold text-slate-900">{currentUser ? myApplications.length : applications.length}</p>
                <p className="text-sm text-slate-500">Total applications</p>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
                <CheckCircle2 className="h-5 w-5 text-orange-600"/>
                <p className="mt-2 font-heading text-2xl font-bold text-slate-900">{currentUser ? approvedApplications.length : applications.filter((application) => application.status === "approved").length}</p>
                <p className="text-sm text-slate-500">Approved profiles</p>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
                <Bell className="h-5 w-5 text-orange-600"/>
                <p className="mt-2 font-heading text-2xl font-bold text-slate-900">{notifications.length}</p>
                <p className="text-sm text-slate-500">Inbox messages</p>
              </div>
            </div>
          </div>
        </div>

        <Tabs
          value={activeSection}
          onValueChange={(value) => navigate(`/career/portal/${value}`)}
          className="mt-8"
        >

          <TabsContent value="apply" className="mt-6">
            {!currentUser ? (<Card className="border-orange-100 shadow-[0_12px_28px_hsl(24_75%_62%_/_0.12)]">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl">Login Required</CardTitle>
                  <CardDescription>You can apply after creating an account or signing in.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="border-0 bg-orange-500 text-white shadow-[0_12px_24px_hsl(24_85%_40%_/_0.22)] hover:bg-orange-600">
                    <Link to="/auth?redirect=/career/portal/apply">Signup / Login</Link>
                  </Button>
                </CardContent>
              </Card>) : (<div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <Card className="border-orange-100 shadow-[0_14px_34px_hsl(24_75%_62%_/_0.12)]">
                  <CardHeader>
                    <CardTitle className="font-heading text-2xl">Apply for a Service Role</CardTitle>
                    <CardDescription>Choose a service and submit your profile for validation.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleApply} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={currentUser.name} disabled/>
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={currentUser.email} disabled/>
                      </div>
                      <div className="space-y-2">
                        <Label>Service *</Label>
                        <Input
                          value={serviceQuery}
                          onChange={(event) => setServiceQuery(event.target.value)}
                          placeholder="Type service name or initials (e.g. AC, PC, HC)"
                        />
                        {selectedService && (
                          <p className="text-xs text-emerald-700">Selected: {selectedService.title} ({selectedService.category})</p>
                        )}
                        <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-orange-100 bg-orange-50/40 p-2">
                          {serviceSuggestions.length === 0 ? (
                            <p className="px-2 py-1 text-xs text-slate-500">No matching service found. Try another keyword.</p>
                          ) : (
                            serviceSuggestions.map((service) => (
                              <button
                                key={service.id}
                                type="button"
                                onClick={() => {
                                  setServiceId(service.id);
                                  setServiceQuery(service.title);
                                }}
                                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                                  serviceId === service.id
                                    ? "border-orange-300 bg-orange-100 text-orange-800"
                                    : "border-orange-100 bg-white text-slate-700 hover:border-orange-200"
                                }`}
                              >
                                <span className="font-semibold">{service.title}</span>
                                <span className="ml-2 text-xs text-slate-500">{service.category}</span>
                              </button>
                            ))
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">Recommendations are shown only from services available in this website.</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Phone *</Label>
                          <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 XXXXX XXXXX"/>
                        </div>
                        <div className="space-y-2">
                          <Label>City *</Label>
                          <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Mumbai"/>
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Experience (years)</Label>
                          <Input type="number" min={0} max={40} value={experienceYears} onChange={(event) => setExperienceYears(Number(event.target.value))}/>
                        </div>
                        <div className="space-y-2">
                          <Label>Gender *</Label>
                          <Select value={gender} onValueChange={setGender}>
                            <SelectTrigger><SelectValue placeholder="Select gender"/></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Profile Photo *</Label>
                          <Input type="file" accept="image/*" onChange={handlePhotoUpload}/>
                          <p className="text-xs text-muted-foreground">Upload a clear profile photo. Applications without a photo cannot be submitted.</p>
                        </div>
                      </div>
                      {profilePhoto && (<div className="flex items-center gap-4 rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
                          <img src={profilePhoto} alt="Applicant preview" className="h-16 w-16 rounded-2xl object-cover ring-4 ring-white"/>
                          <div>
                            <p className="font-medium text-slate-900">Photo uploaded</p>
                            <p className="text-sm text-slate-500">{profilePhotoName || "Selected image"}</p>
                          </div>
                        </div>)}
                      <div className="space-y-2">
                        <Label>Why should we approve you? *</Label>
                        <Textarea rows={5} value={whyJoin} onChange={(event) => setWhyJoin(event.target.value)} placeholder="Tell us about your skills, service quality, and work experience."/>
                      </div>
                          <Button type="submit" className="border-0 bg-orange-500 text-white shadow-[0_12px_24px_hsl(24_85%_40%_/_0.22)] hover:bg-orange-600">
                        Submit Application
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-orange-100 shadow-[0_14px_34px_hsl(24_75%_62%_/_0.12)]">
                  <CardHeader>
                    <CardTitle className="font-heading text-2xl">Application Checklist</CardTitle>
                    <CardDescription>Use this quick guide before submitting your profile.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-[0_10px_20px_hsl(24_85%_40%_/_0.22)]">
                          <BriefcaseBusiness className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Application ready</p>
                          <p className="text-sm text-slate-600">A clean portal for applying without extra visual clutter.</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-3">
                      {[
                        "Choose the service that fits your skillset.",
                        "Add a clear photo and complete your contact details.",
                        "Write a short, confident approval note for validation.",
                      ].map((item) => (
                        <div key={item} className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4 text-sm text-slate-700">
                          {item}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>)}
          </TabsContent>

          <TabsContent value="inbox" className="mt-6">
            {!currentUser ? (
              <Card className="border-orange-100 shadow-[0_12px_28px_hsl(24_75%_62%_/_0.12)]">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl">Login Required</CardTitle>
                  <CardDescription>Sign in to access your career inbox.</CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <Card className="border-orange-100 shadow-[0_14px_34px_hsl(24_75%_62%_/_0.12)]">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl">Applicant Inbox</CardTitle>
                  <CardDescription>All application updates (approved/rejected/profile updates) are stored here.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-200 text-orange-700 hover:bg-orange-50"
                      onClick={() => {
                        markCareerNotificationsRead(currentUser.email);
                        toast.success("Inbox marked as read");
                        syncData();
                      }}
                    >
                      Mark all read
                    </Button>
                  </div>

                  {notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No inbox messages yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <div key={notification.id} className="rounded-2xl border border-orange-100 bg-white p-4 shadow-[0_8px_18px_hsl(24_75%_62%_/_0.08)]">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium">{notification.title}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                              <p className="mt-2 text-xs text-muted-foreground">{format(new Date(notification.createdAt), "PPp")}</p>
                            </div>
                            {!notification.read && <Badge className="bg-orange-500 text-white">New</Badge>}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {!notification.read && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-orange-200 text-orange-700 hover:bg-orange-50"
                                onClick={() => {
                                  markCareerNotificationRead(currentUser.email, notification.id);
                                  syncData();
                                }}
                              >
                                Mark read
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => {
                                deleteCareerNotification(currentUser.email, notification.id);
                                toast.success("Message deleted");
                                syncData();
                              }}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="dashboard" className="mt-6 space-y-6">
            {!currentUser ? (<Card className="border-orange-100 shadow-[0_12px_28px_hsl(24_75%_62%_/_0.12)]">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl">Login Required</CardTitle>
                  <CardDescription>Sign in to see your applications and bookings.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="border-0 bg-orange-500 text-white shadow-[0_12px_24px_hsl(24_85%_40%_/_0.22)] hover:bg-orange-600">
                    <Link to="/auth?redirect=/career/portal/dashboard">Signup / Login</Link>
                  </Button>
                </CardContent>
              </Card>) : (<>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="border-orange-100 bg-gradient-to-br from-amber-50 to-white shadow-[0_12px_28px_hsl(24_75%_62%_/_0.12)]">
                    <CardContent className="p-6">
                      <p className="text-sm font-medium text-slate-500">Pending</p>
                      <p className="mt-2 font-heading text-3xl font-bold text-slate-900">{pendingApplications.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-orange-100 bg-gradient-to-br from-emerald-50 to-white shadow-[0_12px_28px_hsl(24_75%_62%_/_0.12)]">
                    <CardContent className="p-6">
                      <p className="text-sm font-medium text-slate-500">Approved</p>
                      <p className="mt-2 font-heading text-3xl font-bold text-slate-900">{approvedApplications.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-orange-100 bg-gradient-to-br from-orange-50 to-white shadow-[0_12px_28px_hsl(24_75%_62%_/_0.12)]">
                    <CardContent className="p-6">
                      <p className="text-sm font-medium text-slate-500">Bookings for you</p>
                      <p className="mt-2 font-heading text-3xl font-bold text-slate-900">{myBookings.length}</p>
                    </CardContent>
                  </Card>
                </div>

                {myApplications.length === 0 ? (<Card className="border-orange-100 shadow-[0_12px_28px_hsl(24_75%_62%_/_0.12)]">
                    <CardContent className="p-6 text-center text-muted-foreground">You have not applied yet.</CardContent>
                  </Card>) : (myApplications.map((application) => {
                const relatedProfessionals = getProfessionalsByService(application.serviceId);
                const profile = relatedProfessionals.find((professional) => professional.id === application.id);
                const relatedBookings = myBookings.filter((booking) => booking.professionalId === application.id);
                return (<Card key={application.id} className="overflow-hidden border-orange-100 shadow-[0_14px_34px_hsl(24_75%_62%_/_0.12)]">
                        <CardHeader className="flex flex-row items-start justify-between gap-4">
                          <div>
                            <CardTitle className="font-heading text-2xl">{serviceName(application.serviceId)}</CardTitle>
                            <CardDescription>
                              Applied on {format(new Date(application.createdAt), "PPp")}
                            </CardDescription>
                          </div>
                          <Badge className={application.status === "approved"
                        ? "bg-green-600 text-white"
                        : application.status === "rejected"
                            ? "bg-red-600 text-white"
                            : "bg-amber-500 text-white"}>
                            {application.status}
                          </Badge>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="rounded-2xl border border-orange-100 bg-white p-4">
                              <p className="text-sm text-muted-foreground">Phone</p>
                              <p className="mt-1 font-medium">{application.phone}</p>
                            </div>
                            <div className="rounded-2xl border border-orange-100 bg-white p-4">
                              <p className="text-sm text-muted-foreground">City</p>
                              <p className="mt-1 font-medium">{application.city}</p>
                            </div>
                            <div className="rounded-2xl border border-orange-100 bg-white p-4">
                              <p className="text-sm text-muted-foreground">Experience</p>
                              <p className="mt-1 font-medium">{application.experienceYears} years</p>
                            </div>
                          </div>

                          {application.status === "approved" && profile && (<div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="font-medium text-green-900">Your profile is live</p>
                                  <p className="text-sm text-green-800">Visible on the service page and available for bookings.</p>
                                </div>
                                <Button asChild variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50">
                                  <Link to={`/services/${application.serviceId}`}>View Service</Link>
                                </Button>
                              </div>
                            </div>)}

                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteProfile(application.id)}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete Profile
                            </Button>
                          </div>

                          <div>
                            <h4 className="font-heading text-lg font-bold">Bookings for this profile</h4>
                            {relatedBookings.length === 0 ? (<p className="mt-2 text-sm text-muted-foreground">No customer bookings yet.</p>) : (<div className="mt-3 space-y-3">
                                {relatedBookings.map((booking) => (<div key={booking.id} className="rounded-2xl border border-orange-100 bg-white p-4 shadow-[0_8px_18px_hsl(24_75%_62%_/_0.08)]">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="font-medium">{booking.name}</p>
                                      <Badge className="bg-orange-500 text-white">{booking.status}</Badge>
                                    </div>
                                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                                      <p className="flex items-center gap-2"><Phone className="h-4 w-4"/> {booking.phone}</p>
                                      <p className="flex items-center gap-2"><MapPin className="h-4 w-4"/> {booking.address}</p>
                                      <p className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4"/> {format(new Date(booking.date), "PP")}</p>
                                      <p className="flex items-center gap-2"><Mail className="h-4 w-4"/> {booking.time}</p>
                                    </div>
                                  </div>))}
                              </div>)}
                          </div>
                        </CardContent>
                      </Card>);
            }))}
              </>)}
          </TabsContent>



          <TabsContent value="chats" className="mt-6">
            {!currentUser ? (
              <Card className="border-orange-100 shadow-[0_12px_28px_hsl(24_75%_62%_/_0.12)]">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl">Login Required</CardTitle>
                  <CardDescription>You need to be logged in to access customer chats.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="border-0 bg-orange-500 text-white shadow-[0_12px_24px_hsl(24_85%_40%_/_0.22)] hover:bg-orange-600">
                    <Link to="/auth?redirect=/career/portal/chats">Signup / Login</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4 min-h-[74vh]">
                <div className="inline-flex rounded-2xl border border-orange-200 bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${chatView === "admin" ? "bg-emerald-500 text-white" : "text-slate-600 hover:bg-orange-50"}`}
                    onClick={() => setChatView("admin")}
                  >
                    Admin Chat
                  </button>
                  <button
                    type="button"
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${chatView === "customer" ? "bg-emerald-500 text-white" : "text-slate-600 hover:bg-orange-50"}`}
                    onClick={() => setChatView("customer")}
                  >
                    Customer Chat
                  </button>
                </div>

                {chatView === "admin" && (
                <Card className="border-orange-100 shadow-[0_12px_28px_hsl(24_75%_62%_/_0.12)] overflow-hidden">
                  <CardHeader className="border-b border-emerald-800 bg-emerald-700 py-3 text-white">
                    <CardTitle className="font-heading text-xl">Application Support Chat</CardTitle>
                    <CardDescription className="text-emerald-50">WhatsApp-style chat with admin for approval updates and quick support.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3">
                    {myApplications.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Apply for a service first to start chatting with admin.</p>
                    ) : (
                      <div className="grid h-[68vh] gap-4 lg:grid-cols-[280px_1fr]">
                        <div className="rounded-2xl border border-orange-100 bg-gradient-to-b from-white to-orange-50/40 p-3">
                          <p className="px-2 text-sm font-semibold text-slate-700">Admin Threads</p>
                          <div className="mt-2 h-[calc(68vh-72px)] space-y-2 overflow-y-auto pr-1">
                            {myApplications.map((application) => (
                              <button
                                key={application.id}
                                type="button"
                                onClick={() => setSelectedApplicationChatId(application.id)}
                                className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${selectedApplicationChatId === application.id ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-orange-100 bg-white text-slate-700 hover:bg-orange-50"}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-semibold truncate">{serviceName(application.serviceId)}</p>
                                  <span className={`h-2.5 w-2.5 rounded-full ${application.status === "approved" ? "bg-emerald-500" : application.status === "rejected" ? "bg-red-500" : "bg-amber-500"}`} />
                                </div>
                                <p className="text-xs text-slate-500">Application #{application.id.slice(0, 8)}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-orange-100 bg-white">
                          {!selectedApplicationForChat ? (
                            <div className="flex flex-col items-center justify-center flex-1 text-center p-4">
                              <MessageCircle className="h-12 w-12 text-orange-300 mb-3" />
                              <p className="text-sm font-medium text-slate-700">Select an application to start chatting</p>
                              <p className="text-xs text-muted-foreground mt-1">Choose from your applications on the left</p>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between border-b border-emerald-800 bg-emerald-700 px-4 py-3 text-white">
                                <div className="flex items-center gap-2">
                                  <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">A</div>
                                  <div>
                                  <p className="font-semibold text-white">{ADMIN_DISPLAY_NAME}</p>
                                  <p className="text-xs text-emerald-50">{serviceName(selectedApplicationForChat.serviceId)} • #{selectedApplicationForChat.id.slice(0, 8)}</p>
                                  </div>
                                </div>
                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-medium text-emerald-700">online</span>
                              </div>

                              <div className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 p-6">
                                {applicationChatMessages.length === 0 ? (
                                  <div className="flex h-full items-center justify-center">
                                    <div className="text-center">
                                      <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                                        <MessageCircle className="h-8 w-8 text-slate-500"/>
                                      </div>
                                      <p className="text-lg font-semibold text-slate-700">No messages yet</p>
                                      <p className="mt-1 text-sm text-slate-500">Start the conversation with admin</p>
                                    </div>
                                  </div>
                                ) : (
                                  applicationChatMessages.map((message) => {
                                    const mine = (message.senderId || message.sender_id) === currentUser?.id;
                                    const senderDisplayName = mine ? "You" : (message.senderName || message.sender_name || "Admin");
                                    return (
                                      <motion.div 
                                        key={message.id} 
                                        initial={{ opacity: 0, y: 12, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                        className={`flex gap-3 ${mine ? "justify-end" : "justify-start"}`}
                                      >
                                        {!mine && (
                                          <div className="mt-0.5 h-9 w-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-md">
                                            <span className="text-xs font-bold text-white">A</span>
                                          </div>
                                        )}
                                        
                                        <div className={`max-w-[70%] group`}>
                                          <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${mine 
                                            ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30" 
                                            : "bg-white text-slate-800 border border-slate-200 shadow-md"}`}>
                                            <p className="text-[11px] font-semibold opacity-75 mb-1 uppercase tracking-wide">
                                              {mine ? "To: Admin" : `From: ${senderDisplayName}`}
                                            </p>
                                            <p className={mine ? "text-white" : "text-slate-800"}>{message.text || message.message_text}</p>
                                            <div className="mt-2 flex items-center justify-end gap-2 text-[10px]">
                                              <span className={mine ? "text-emerald-100" : "text-slate-500"}>
                                                {format(new Date(message.createdAt || message.created_at), "p")}
                                              </span>
                                              {mine && <CheckCheck className="h-3.5 w-3.5 text-emerald-100"/>}
                                            </div>
                                          </div>
                                          
                                          {mine && (
                                            <motion.div 
                                              initial={{ opacity: 0 }}
                                              whileHover={{ opacity: 1 }}
                                              className="mt-1 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                              <button 
                                                className="rounded-full px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors" 
                                                onClick={() => handleEditAdminMessage(message)}
                                              >
                                                Edit
                                              </button>
                                              <button 
                                                className="rounded-full px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors" 
                                                onClick={() => handleDeleteAdminMessage(message)}
                                              >
                                                Delete
                                              </button>
                                            </motion.div>
                                          )}
                                        </div>
                                        
                                        {mine && (
                                          <div className="mt-0.5 h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                                            <span className="text-xs font-bold text-white">{currentUser?.name?.charAt(0).toUpperCase()}</span>
                                          </div>
                                        )}
                                      </motion.div>
                                    );
                                  })
                                )}
                              </div>
                            </>
                          )}

                          <div className="border-t border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 shadow-sm transition-all focus-within:border-emerald-400 focus-within:shadow-lg focus-within:shadow-emerald-400/20">
                                <Input
                                  value={applicationChatInput}
                                  onChange={(event) => setApplicationChatInput(event.target.value)}
                                  placeholder={selectedApplicationForChat ? "Message admin..." : "Select an application first"}
                                  disabled={!selectedApplicationForChat}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" && selectedApplicationForChat) {
                                      event.preventDefault();
                                      handleSendApplicationMessage();
                                    }
                                  }}
                                  className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 placeholder:text-slate-400 disabled:bg-transparent disabled:text-slate-400"
                                />
                              </div>
                              <motion.button 
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleSendApplicationMessage}
                                disabled={!selectedApplicationForChat}
                                className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 p-0 text-white hover:shadow-lg hover:shadow-emerald-500/40 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Send className="h-5 w-5" />
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                )}

                {chatView === "customer" && (
                <div className="grid h-[70vh] gap-4 lg:grid-cols-[320px_1fr]">
                {/* Customer List */}
                <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-[0_14px_34px_hsl(24_75%_62%_/_0.12)]">
                  <div className="border-b border-emerald-800 bg-emerald-700 px-3 py-3 text-white">
                    <p className="text-sm font-semibold">
                      Conversations ({bookings.length})
                    </p>
                  </div>
                  {bookings.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">
                      No customer bookings yet. Once users book your approved service profile, their messages will appear here.
                    </div>
                  ) : (
                    <div className="h-[calc(70vh-58px)] space-y-2 overflow-y-auto p-2">
                      {bookings.map((booking) => {
                        const service = services.find(s => s.id === booking.serviceId);
                        const messages = getChatMessagesByBooking(booking.id);
                        const lastMessage = messages[messages.length - 1];
                        const active = booking.id === selectedBookingId;
                        
                        return (
                          <button
                            key={booking.id}
                            onClick={() => setSelectedBookingId(booking.id)}
                            className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${active ? "border-emerald-300 bg-emerald-50" : "border-orange-100 bg-white hover:bg-orange-50"}`}
                          >
                            <div className="flex items-start gap-2">
                              <div className="mt-0.5 h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                                {booking.name?.charAt(0).toUpperCase() || "C"}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-slate-900">{booking.name}</p>
                                <p className="truncate text-xs text-slate-500">{service?.title || 'Service'}</p>
                                {lastMessage && (
                                  <p className="mt-1 truncate text-[11px] text-slate-500">
                                    {lastMessage.senderEmail === currentUser.email ? 'You: ' : `${booking.name}: `}
                                    {lastMessage.text}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Chat Interface */}
                {bookings.length === 0 ? (
                  <div className="flex items-center justify-center rounded-2xl border border-orange-100 bg-white shadow-[0_14p_34px_hsl(24_75%_62%_/_0.12)]">
                    <div className="text-center text-muted-foreground p-10">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Customer chat section is ready</p>
                      <p className="text-sm">It will activate when a customer books your approved service.</p>
                    </div>
                  </div>
                ) : selectedBooking ? (
                  <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-[0_14px_34px_hsl(24_75%_62%_/_0.12)]">
                    <div className="border-b border-emerald-800 bg-emerald-700 px-4 py-3 text-white">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                          {selectedBooking.name?.charAt(0).toUpperCase() || "C"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">
                            {selectedBooking.name}
                          </p>
                          <p className="text-xs text-emerald-50">
                            {services.find(s => s.id === selectedBooking.serviceId)?.title || 'Service'} • {format(new Date(selectedBooking.date), "MMM dd, yyyy")} at {selectedBooking.time}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
                      {chatMessages.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                          <div className="text-center">
                            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                              <MessageCircle className="h-8 w-8 text-slate-500"/>
                            </div>
                            <p className="text-lg font-semibold text-slate-700">No messages yet</p>
                            <p className="mt-1 text-sm text-slate-500">Start the conversation below</p>
                          </div>
                        </div>
                      ) : (
                        chatMessages.map((message) => {
                          const isFromMe = (message.senderId || message.sender_id) === currentUser?.id;
                          const senderDisplayName = isFromMe ? "You" : (message.senderName || message.sender_name || "Unknown");
                          
                          return (
                            <motion.div
                              key={message.id}
                              initial={{ opacity: 0, y: 12, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ type: "spring", stiffness: 200, damping: 20 }}
                              className={`flex gap-3 ${isFromMe ? 'justify-end' : 'justify-start'}`}
                            >
                              {!isFromMe && (
                                <div className="mt-0.5 h-9 w-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-md">
                                  <span className="text-xs font-bold text-white">{selectedBooking?.name?.charAt(0).toUpperCase()}</span>
                                </div>
                              )}
                              
                              <div className={`max-w-[70%] group`}>
                                <div
                                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                    isFromMe
                                      ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                                      : "bg-white text-slate-800 border border-slate-200 shadow-md"
                                  }`}
                                >
                                  <p className="text-[11px] font-semibold opacity-75 mb-1 uppercase tracking-wide">
                                    {isFromMe ? `To: ${selectedBooking?.name}` : `From: ${senderDisplayName}`}
                                  </p>
                                  <p className={isFromMe ? "text-white" : "text-slate-800"}>{message.text || message.message_text}</p>
                                  <div className="mt-2 flex items-center justify-end gap-2 text-[10px]">
                                    <span className={isFromMe ? "text-emerald-100" : "text-slate-500"}>
                                      {format(new Date(message.createdAt || message.created_at), "p")}
                                    </span>
                                    {isFromMe && <CheckCheck className="h-3.5 w-3.5 text-emerald-100"/>}
                                  </div>
                                </div>
                                
                                {isFromMe && (
                                  <motion.div 
                                    initial={{ opacity: 0 }}
                                    whileHover={{ opacity: 1 }}
                                    className="mt-1 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <button 
                                      className="rounded-full px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors" 
                                      onClick={() => handleEditCustomerMessage(message)}
                                    >
                                      Edit
                                    </button>
                                    <button 
                                      className="rounded-full px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors" 
                                      onClick={() => handleDeleteCustomerMessage(message)}
                                    >
                                      Delete
                                    </button>
                                  </motion.div>
                                )}
                              </div>
                              
                              {isFromMe && (
                                <div className="mt-0.5 h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                                  <span className="text-xs font-bold text-white">{currentUser?.name?.charAt(0).toUpperCase()}</span>
                                </div>
                              )}
                            </motion.div>
                          );
                        })
                      )}
                    </div>

                    {/* Message Input */}
                    <div className="border-t border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 shadow-sm transition-all focus-within:border-emerald-400 focus-within:shadow-lg focus-within:shadow-emerald-400/20">
                          <Input
                            placeholder="Message customer..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 placeholder:text-slate-400"
                          />
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSendMessage}
                          disabled={!chatInput.trim()}
                          className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 p-0 text-white hover:shadow-lg hover:shadow-emerald-500/40 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="h-5 w-5" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-2xl border border-orange-100 bg-white shadow-[0_14px_34px_hsl(24_75%_62%_/_0.12)]">
                    <div className="text-center text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Select a customer to start chatting</p>
                      <p className="text-sm">Choose from the list on the left</p>
                    </div>
                  </div>
                )}
                </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Delete Profile Confirmation Dialog */}
        <AlertDialog open={deleteProfileDialogOpen} onOpenChange={setDeleteProfileDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Career Profile?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove your profile from service listings. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-3">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteProfile}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Profile
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Account Confirmation Dialog */}
        <AlertDialog open={deleteAccountDialogOpen} onOpenChange={setDeleteAccountDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Your Account?</AlertDialogTitle>
              <AlertDialogDescription>
                Delete your Servify account permanently? This cannot be undone. All your data will be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-3">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteAccount}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Account
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Admin Message Confirmation Dialog */}
        <AlertDialog open={deleteAdminMessageDialogOpen} onOpenChange={setDeleteAdminMessageDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Message?</AlertDialogTitle>
              <AlertDialogDescription>
                This message will be permanently deleted. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-3">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteAdminMessage}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Message
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Customer Message Confirmation Dialog */}
        <AlertDialog open={deleteCustomerMessageDialogOpen} onOpenChange={setDeleteCustomerMessageDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Message?</AlertDialogTitle>
              <AlertDialogDescription>
                This message will be permanently deleted. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-3">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteCustomerMessage}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Message
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>);
};
export default CareerPortal;
