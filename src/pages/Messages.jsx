import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { MessageCircle, Send, Check, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/auth";
import { getProfessionalById } from "@/data/professionals";
import { getServiceById } from "@/data/services";
import { AUTH_CHANGE_EVENT } from "@/lib/auth";
import {
  deleteMarketplaceChatMessage,
  editMarketplaceChatMessage,
  getBookingsByEmail,
  getChatMessagesByBooking,
  marketplaceEvents,
  sendChatMessage,
} from "@/data/marketplace";
import {
  careerChatEvent,
  deleteCareerChatMessage,
  editCareerChatMessage,
  getCareerApplications,
  getCareerChatMessagesByApplication,
  sendCareerChatMessage,
} from "@/data/careers";
import { hydrateBookingsFromSupabase, hydrateCareerAuxFromSupabase } from "@/lib/supabaseSync";

const safeServiceTitle = (serviceId, fallback = "Unassigned service") => {
  if (!serviceId) {
    return fallback;
  }

  try {
    return getServiceById(serviceId)?.title || fallback;
  } catch {
    return fallback;
  }
};

const bookingTitle = (booking) => booking?.serviceTitle || safeServiceTitle(booking?.serviceId, "Untitled booking");
const displayProviderName = (booking) => booking?.professionalName || getProfessionalById(booking?.professionalId)?.name || "Provider";
const initialsOf = (value) => String(value || "?").trim().charAt(0).toUpperCase() || "?";

const Messages = () => {
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = currentUser?.role === "admin";
  const [bookings, setBookings] = useState(currentUser ? getBookingsByEmail(currentUser.email) : []);
  const [applications, setApplications] = useState(isAdmin ? getCareerApplications() : []);
  const [input, setInput] = useState("");

  const bookingId = searchParams.get("booking") || bookings[0]?.id || "";
  const applicationId = searchParams.get("application") || applications[0]?.id || "";

  useEffect(() => {
    const syncAuth = () => setCurrentUser(getCurrentUser());
    const syncData = () => {
      const latestUser = getCurrentUser();
      setCurrentUser(latestUser);
      if (!latestUser?.email) {
        setBookings([]);
        setApplications([]);
        return;
      }

      void hydrateBookingsFromSupabase({ userId: latestUser.id, userEmail: latestUser.email });
      void hydrateCareerAuxFromSupabase({ userId: latestUser.id, userEmail: latestUser.email, isAdmin: latestUser.role === "admin" });

      if (latestUser.role === "admin") {
        setBookings(getBookingsByEmail(latestUser.email));
        setApplications(getCareerApplications());
      } else {
        setBookings(getBookingsByEmail(latestUser.email));
        setApplications([]);
      }
    };

    syncData();
    window.addEventListener(AUTH_CHANGE_EVENT, syncAuth);
    window.addEventListener(marketplaceEvents.BOOKING_EVENT, syncData);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, syncAuth);
      window.removeEventListener(marketplaceEvents.BOOKING_EVENT, syncData);
    };
  }, [isAdmin]);

  useEffect(() => {
    const sync = () => {
      if (isAdmin) {
        setApplications(getCareerApplications());
        return;
      }
      setApplications([]);
    };
    sync();
    window.addEventListener(careerChatEvent, sync);
    return () => window.removeEventListener(careerChatEvent, sync);
  }, [isAdmin, currentUser?.email]);

  const selectedBooking = useMemo(() => bookings.find((booking) => booking.id === bookingId) || null, [bookings, bookingId]);

  const messages = useMemo(() => {
    if (isAdmin) {
      if (!applicationId) {
        return [];
      }
      return getCareerChatMessagesByApplication(applicationId);
    }
    if (!selectedBooking) {
      return [];
    }
    return getChatMessagesByBooking(selectedBooking.id);
  }, [selectedBooking, isAdmin, applicationId]);

  const selectedApplication = useMemo(
    () => applications.find((application) => application.id === applicationId) || null,
    [applications, applicationId],
  );
  const pendingApplications = useMemo(
    () => (isAdmin ? applications.filter((application) => application.status === "pending") : []),
    [isAdmin, applications],
  );

  useEffect(() => {
    if (isAdmin) {
      return;
    }
    if (!selectedBooking) {
      return;
    }
    const sync = () => setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("booking", selectedBooking.id);
      return next;
    });
    window.addEventListener(marketplaceEvents.CHAT_EVENT, sync);
    return () => window.removeEventListener(marketplaceEvents.CHAT_EVENT, sync);
  }, [selectedBooking, setSearchParams, isAdmin]);

  useEffect(() => {
    if (!isAdmin || !selectedApplication) {
      return;
    }
    const sync = () => setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("application", selectedApplication.id);
      return next;
    });
    window.addEventListener(careerChatEvent, sync);
    return () => window.removeEventListener(careerChatEvent, sync);
  }, [isAdmin, selectedApplication, setSearchParams]);

  if (!currentUser) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-heading text-4xl font-bold">Login Required</h1>
        <p className="mt-2 text-muted-foreground">Please login to access your applicant inbox.</p>
      </div>
    );
  }

  const handleSend = () => {
    if (!input.trim()) {
      return;
    }

    if (isAdmin) {
      if (!selectedApplication) {
        return;
      }

      sendCareerChatMessage({
        applicationId: selectedApplication.id,
        senderEmail: currentUser.email,
        senderName: currentUser.name,
        text: input,
      });

      setInput("");
      return;
    }

    if (!selectedBooking) {
      return;
    }

    sendChatMessage({
      bookingId: selectedBooking.id,
      senderEmail: currentUser.email,
      senderName: currentUser.name,
      text: input,
    });

    setInput("");
  };

  const handleEditMessage = (message) => {
    if (!message || message.senderEmail !== currentUser?.email) return;
    const nextText = window.prompt("Edit your message", message.text || "");
    if (nextText === null) return;

    if (isAdmin) {
      editCareerChatMessage({ messageId: message.id, requesterEmail: currentUser.email, nextText });
      return;
    }

    editMarketplaceChatMessage({ messageId: message.id, requesterEmail: currentUser.email, nextText });
  };

  const handleDeleteMessage = (message) => {
    if (!message || message.senderEmail !== currentUser?.email) return;
    const ok = window.confirm("Delete this message?");
    if (!ok) return;

    if (isAdmin) {
      deleteCareerChatMessage({ messageId: message.id, requesterEmail: currentUser.email });
      return;
    }

    deleteMarketplaceChatMessage({ messageId: message.id, requesterEmail: currentUser.email });
  };

  return (
    <div className="container py-10 md:py-12">
      <div className="mb-6 overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 p-6 text-white shadow-[0_18px_42px_hsl(24_85%_40%_/_0.22)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Applicant Inbox</p>
        <h1 className="mt-2 font-heading text-3xl font-bold md:text-4xl">
          {isAdmin ? "Applicant Service Chats" : "Customer Booking Messages"}
        </h1>
      </div>

      <div className="grid h-[70vh] gap-4 lg:grid-cols-[320px_1fr]">
        <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-[0_14px_34px_hsl(24_75%_62%_/_0.12)]">
          <div className="border-b border-emerald-800 bg-emerald-700 px-3 py-3 text-white">
            <p className="text-sm font-semibold">
            {isAdmin ? "Applicants" : "Conversations"}
            </p>
          </div>
          {isAdmin && pendingApplications.length > 0 && (
            <div className="mx-2 mt-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-slate-700">
              <p className="font-semibold text-orange-700">New applications: {pendingApplications.length}</p>
              <p className="mt-1 truncate">Latest: {pendingApplications.slice(0, 3).map((item) => item.userName).join(", ")}</p>
            </div>
          )}
          <div className="h-[calc(70vh-58px)] space-y-2 overflow-y-auto p-2">
            {isAdmin
              ? applications.map((application) => {
                  const active = application.id === applicationId;
                  const last = getCareerChatMessagesByApplication(application.id).slice(-1)[0];
                  return (
                    <button
                      key={application.id}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${active ? "border-emerald-300 bg-emerald-50" : "border-orange-100 bg-white hover:bg-orange-50"}`}
                      onClick={() => setSearchParams({ application: application.id })}
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                          {initialsOf(application.userName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900">{application.userName}</p>
                          <p className="truncate text-xs text-slate-500">{safeServiceTitle(application.serviceId, "Applicant profile")}</p>
                          {last && <p className="mt-1 truncate text-[11px] text-slate-500">{last.senderName}: {last.text}</p>}
                        </div>
                      </div>
                    </button>
                  );
                })
              : bookings.map((booking) => {
                  const professionalName = displayProviderName(booking);
                  const active = booking.id === bookingId;
                  const lastMessage = getChatMessagesByBooking(booking.id).slice(-1)[0];
                  return (
                    <button
                      key={booking.id}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${active ? "border-emerald-300 bg-emerald-50" : "border-orange-100 bg-white hover:bg-orange-50"}`}
                      onClick={() => setSearchParams({ booking: booking.id })}
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                          {initialsOf(professionalName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900">{bookingTitle(booking)}</p>
                          <p className="truncate text-xs text-slate-500">{professionalName}</p>
                          {lastMessage && (
                            <p className="mt-1 truncate text-[11px] text-slate-500">
                              {lastMessage.senderEmail === currentUser.email ? "You" : professionalName}: {lastMessage.text}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
          </div>
        </div>

        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-[0_14px_34px_hsl(24_75%_62%_/_0.12)]">
          {(isAdmin && !selectedApplication) || (!isAdmin && !selectedBooking) ? (
            <div className="flex h-[420px] items-center justify-center text-slate-500">
              {isAdmin ? "Choose an applicant conversation." : "Choose a booking conversation."}
            </div>
          ) : (
            <>
              <div className="border-b border-emerald-800 bg-emerald-700 px-4 py-3 text-white">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                    {isAdmin ? initialsOf(selectedApplication?.userName) : initialsOf(displayProviderName(selectedBooking))}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {isAdmin
                        ? `${selectedApplication.userName} • ${safeServiceTitle(selectedApplication.serviceId, "Applicant profile")}`
                        : bookingTitle(selectedBooking)}
                    </p>
                <p className="text-xs text-emerald-50">
                  {isAdmin
                    ? `Application #${selectedApplication.id}`
                    : `Booking #${selectedBooking.id}`}
                </p>
                {!isAdmin && selectedBooking && (
                  <p className="mt-1 text-xs text-emerald-50">
                    You (Customer) and {displayProviderName(selectedBooking)} (Provider)
                  </p>
                )}
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 p-6">
                {messages.length === 0 ? (
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
                  messages.map((message) => {
                    const mine = message.senderEmail === currentUser.email;
                    const chatPeerName = isAdmin
                      ? (selectedApplication?.userName || "Applicant")
                      : displayProviderName(selectedBooking);
                    const senderLabel = isAdmin
                      ? (mine ? "You (Admin)" : `${chatPeerName} (Applicant)`)
                      : (mine ? "You (Customer)" : `${chatPeerName} (Provider)`);
                    
                    return (
                      <motion.div 
                        key={message.id} 
                        initial={{ opacity: 0, y: 12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className={`flex gap-3 ${mine ? "justify-end" : "justify-start"}`}
                      >
                        {!mine && (
                          <div className="mt-0.5 h-9 w-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md">
                            <span className="text-xs font-bold text-white">{initialsOf(chatPeerName)}</span>
                          </div>
                        )}
                        
                        <div className={`max-w-[70%] group ${mine ? "" : ""}`}>
                          <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${mine 
                            ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30" 
                            : "bg-white text-slate-800 border border-slate-200 shadow-md"}`}>
                            <p className="text-[11px] font-semibold opacity-75 mb-1 uppercase tracking-wide">
                              {mine ? `To: ${chatPeerName}` : `From: ${chatPeerName}`}
                            </p>
                            <p className={mine ? "text-white" : "text-slate-800"}>{message.text}</p>
                            <div className="mt-2 flex items-center justify-end gap-2 text-[10px]">
                              <span className={mine ? "text-emerald-100" : "text-slate-500"}>
                                {format(new Date(message.createdAt), "p")}
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
                                onClick={() => handleEditMessage(message)}
                              >
                                Edit
                              </button>
                              <button 
                                className="rounded-full px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors" 
                                onClick={() => handleDeleteMessage(message)}
                              >
                                Delete
                              </button>
                            </motion.div>
                          )}
                        </div>
                        
                        {mine && (
                          <div className="mt-0.5 h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                            <span className="text-xs font-bold text-white">{initialsOf(currentUser.name)}</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 shadow-sm transition-all focus-within:border-emerald-400 focus-within:shadow-lg focus-within:shadow-emerald-400/20 focus-within:ring-0">
                    <Input
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder={isAdmin ? "Message applicant..." : "Message provider..."}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleSend();
                        }
                      }}
                      className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 placeholder:text-slate-400"
                    />
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend} 
                    className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 p-0 text-white hover:shadow-lg hover:shadow-emerald-500/40 transition-all flex items-center justify-center"
                  >
                    <Send className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>

              <p className="px-4 pb-2 pt-2 inline-flex items-center gap-2 text-xs text-slate-500">
                <MessageCircle className="h-3.5 w-3.5" />
                {isAdmin ? "Messages are tied to applicant service applications." : "Messages are masked and tied to booking context."}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
