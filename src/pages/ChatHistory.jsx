import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import {
  getAllMarketplaceChats,
  getAllBookings,
  getBookingsByEmail,
  getBookingsByProfessionalId,
  deleteMarketplaceChatConversationByBooking,
  marketplaceEvents,
} from "@/data/marketplace";
import {
  getCareerApplications,
  getCareerApplicationsByEmail,
  getAllCareerChats,
  deleteCareerChatConversationByApplication,
  careerChatEvent,
} from "@/data/careers";
import { getProfessionalByEmail } from "@/data/professionals";
import { getServiceById } from "@/data/services";
import { AUTH_CHANGE_EVENT } from "@/lib/auth";
import { hydrateBookingsFromSupabase, hydrateCareerAuxFromSupabase } from "@/lib/supabaseSync";

const CHAT_EVENT = marketplaceEvents.CHAT_EVENT;
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const buildMarketplaceHistory = ({ currentUser }) => {
  if (!currentUser?.email) return [];

  const professional = getProfessionalByEmail(currentUser.email);
  const email = normalizeEmail(currentUser.email);
  const byCustomer = getBookingsByEmail(currentUser.email);
  const byProfessionalId = professional ? getBookingsByProfessionalId(professional.id) : [];
  const byProfessionalIdentity = getAllBookings().filter((booking) => {
    const providerEmail = normalizeEmail(booking.professionalEmail);
    const providerIdAsEmail = normalizeEmail(booking.professionalId);
    return providerEmail === email || providerIdAsEmail === email;
  });
  const mergedBookings = [...byCustomer, ...byProfessionalId, ...byProfessionalIdentity];
  const uniqueBookings = Array.from(new Map(mergedBookings.map((item) => [item.id, item])).values());

  const bookingMap = new Map(uniqueBookings.map((booking) => [booking.id, booking]));
  const chatRows = getAllMarketplaceChats().filter((message) =>
    bookingMap.has(message.bookingId) || normalizeEmail(message.senderEmail) === email,
  );

  const grouped = new Map();
  chatRows.forEach((message) => {
    const key = message.bookingId;
    const bucket = grouped.get(key) || [];
    bucket.push(message);
    grouped.set(key, bucket);
  });

  return Array.from(grouped.entries()).map(([bookingId, messages]) => {
    const booking = bookingMap.get(bookingId);
    const lastMessage = messages[messages.length - 1];
    const service = booking?.serviceTitle ? { title: booking.serviceTitle } : booking ? getServiceById(booking.serviceId) : null;

    return {
      id: `marketplace-${bookingId}`,
      kind: "marketplace",
      conversationId: bookingId,
      title: service?.title || `Booking ${bookingId}`,
      subtitle: booking ? `${booking.date} ${booking.time}` : "Marketplace conversation",
      messages,
      updatedAt: lastMessage?.createdAt || booking?.updatedAt || new Date().toISOString(),
    };
  });
};

const buildCareerHistory = ({ currentUser }) => {
  if (!currentUser?.email) return [];

  const isAdmin = currentUser.role === "admin";
  const email = normalizeEmail(currentUser.email);
  const applications = isAdmin
    ? getCareerApplications()
    : getCareerApplicationsByEmail(currentUser.email);
  const allApps = getCareerApplications();

  const appMap = new Map(applications.map((application) => [application.id, application]));
  const chatRows = getAllCareerChats().filter((message) =>
    appMap.has(message.applicationId) || normalizeEmail(message.senderEmail) === email,
  );

  chatRows.forEach((message) => {
    if (!appMap.has(message.applicationId)) {
      const linked = allApps.find((application) => application.id === message.applicationId);
      if (linked) {
        appMap.set(linked.id, linked);
      }
    }
  });

  const grouped = new Map();
  chatRows.forEach((message) => {
    const key = message.applicationId;
    const bucket = grouped.get(key) || [];
    bucket.push(message);
    grouped.set(key, bucket);
  });

  return Array.from(grouped.entries()).map(([applicationId, messages]) => {
    const application = appMap.get(applicationId);
    const lastMessage = messages[messages.length - 1];
    const service = application?.serviceTitle ? { title: application.serviceTitle } : application ? getServiceById(application.serviceId) : null;

    return {
      id: `career-${applicationId}`,
      kind: "career",
      conversationId: applicationId,
      title: application?.userName || "Career chat",
      subtitle: service?.title || "Career application",
      messages,
      updatedAt: lastMessage?.createdAt || application?.createdAt || new Date().toISOString(),
    };
  });
};

const ChatHistory = () => {
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [activeId, setActiveId] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const sync = () => {
      const latestUser = getCurrentUser();
      setCurrentUser(latestUser);
      if (latestUser?.id && latestUser?.email) {
        void hydrateBookingsFromSupabase({ userId: latestUser.id, userEmail: latestUser.email });
        void hydrateCareerAuxFromSupabase({ userId: latestUser.id, userEmail: latestUser.email, isAdmin: latestUser.role === "admin" });
      }
      setVersion((prev) => prev + 1);
    };
    sync();
    window.addEventListener(AUTH_CHANGE_EVENT, sync);
    window.addEventListener(CHAT_EVENT, sync);
    window.addEventListener(careerChatEvent, sync);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, sync);
      window.removeEventListener(CHAT_EVENT, sync);
      window.removeEventListener(careerChatEvent, sync);
    };
  }, []);

  const conversations = useMemo(() => {
    void version;
    if (!currentUser) return [];
    const merged = currentUser.role === "admin"
      ? buildCareerHistory({ currentUser })
      : [
        ...buildMarketplaceHistory({ currentUser }),
        ...buildCareerHistory({ currentUser }),
      ];
    return merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [currentUser, version]);

  const selectedConversation = useMemo(() => {
    if (!conversations.length) return null;
    if (!activeId) return conversations[0];
    return conversations.find((item) => item.id === activeId) || conversations[0];
  }, [conversations, activeId]);

  useEffect(() => {
    if (!selectedConversation) {
      setActiveId("");
      return;
    }
    setActiveId(selectedConversation.id);
  }, [selectedConversation?.id]);

  if (!currentUser) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-heading text-4xl font-bold">Login Required</h1>
        <p className="mt-2 text-muted-foreground">Please login to access chat history.</p>
      </div>
    );
  }

  const handleDeleteConversation = (conversation) => {
    if (!conversation) return;

    const ok = window.confirm("Delete this chat history permanently?");
    if (!ok) return;

    if (conversation.kind === "career") {
      deleteCareerChatConversationByApplication(conversation.conversationId);
    } else {
      deleteMarketplaceChatConversationByBooking(conversation.conversationId);
    }

    setVersion((prev) => prev + 1);
  };

  return (
    <div className="container py-10 md:py-12">
      <div className="mb-6 overflow-hidden rounded-3xl border border-emerald-800 bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-600 p-6 text-white shadow-[0_18px_42px_hsl(165_85%_24%_/_0.28)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Conversations</p>
        <h1 className="mt-2 font-heading text-3xl font-bold md:text-4xl">Classic Chat Archive</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-[0_14px_34px_hsl(24_75%_62%_/_0.12)]">
          <div className="border-b border-emerald-800 bg-emerald-700 px-3 py-3 text-white">
          <p className="px-2 text-sm font-semibold text-slate-700">History ({conversations.length})</p>
          </div>
          <div className="max-h-[70vh] space-y-2 overflow-y-auto p-3">
            {conversations.length === 0 ? (
              <p className="rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-500">No chat history yet.</p>
            ) : (
              conversations.map((conversation) => {
                const active = conversation.id === selectedConversation?.id;
                const last = conversation.messages[conversation.messages.length - 1];
                return (
                  <div key={conversation.id} className={`rounded-xl border px-3 py-2 ${active ? "border-emerald-300 bg-emerald-50" : "border-orange-100 bg-white"}`}>
                    <button
                      className="w-full text-left"
                      onClick={() => setActiveId(conversation.id)}
                    >
                      <p className="truncate font-semibold text-slate-900">{conversation.title}</p>
                      <p className="truncate text-xs text-slate-500">{conversation.subtitle}</p>
                      <p className="mt-1 truncate text-xs text-slate-600">{last?.text || "No messages"}</p>
                    </button>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>{format(new Date(conversation.updatedAt), "PP p")}</span>
                      <button
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteConversation(conversation)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex h-[70vh] flex-col overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-[0_14px_34px_hsl(24_75%_62%_/_0.12)]">
          {!selectedConversation ? (
            <div className="flex h-[420px] items-center justify-center text-slate-500">Select a conversation.</div>
          ) : (
            <>
              <div className="border-b border-emerald-800 bg-emerald-700 px-4 py-3 text-white">
                <p className="font-semibold text-white">{selectedConversation.title}</p>
                <p className="text-xs text-emerald-50">{selectedConversation.subtitle}</p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-[linear-gradient(180deg,rgba(247,250,252,0.95),rgba(239,249,255,0.88))] p-3">
                {selectedConversation.messages.map((message) => {
                  const mine = message.senderEmail === currentUser.email;
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? "bg-emerald-200 text-slate-900" : "border border-slate-200 bg-white text-slate-800"}`}>
                        <p>{message.text}</p>
                        <p className="mt-1 text-right text-[10px] text-slate-500">
                          {message.senderName} • {format(new Date(message.createdAt), "p")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-orange-100 bg-white p-3 flex justify-end">
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => handleDeleteConversation(selectedConversation)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete This Chat
                </Button>
              </div>

              <p className="px-3 pb-3 inline-flex items-center gap-1 text-xs text-slate-500">
                <MessageCircle className="h-3.5 w-3.5" />
                Deleting chat removes the full conversation from local data and synced stores.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHistory;
