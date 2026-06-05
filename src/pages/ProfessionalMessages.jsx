import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/auth";
import { getProfessionalByEmail } from "@/data/professionals";
import { getServiceById } from "@/data/services";
import {
  getBookingsByProfessionalId,
  getChatMessagesByBooking,
  marketplaceEvents,
  sendChatMessage,
} from "@/data/marketplace";

const ProfessionalMessages = () => {
  const currentUser = getCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [input, setInput] = useState("");

  // Get professional by email
  const professional = useMemo(() => {
    if (!currentUser?.email) return null;
    return getProfessionalByEmail(currentUser.email);
  }, [currentUser?.email]);

  const bookingId = searchParams.get("booking") || bookings[0]?.id || "";

  useEffect(() => {
    if (!professional) {
      return;
    }

    const sync = () => setBookings(getBookingsByProfessionalId(professional.id));
    sync();
    window.addEventListener(marketplaceEvents.BOOKING_EVENT, sync);
    return () => window.removeEventListener(marketplaceEvents.BOOKING_EVENT, sync);
  }, [professional]);

  const selectedBooking = useMemo(() => bookings.find((booking) => booking.id === bookingId) || null, [bookings, bookingId]);

  const messages = useMemo(() => {
    if (!selectedBooking) {
      return [];
    }
    return getChatMessagesByBooking(selectedBooking.id);
  }, [selectedBooking]);

  const service = useMemo(() => {
    if (!selectedBooking) {
      return null;
    }
    return getServiceById(selectedBooking.serviceId);
  }, [selectedBooking]);

  useEffect(() => {
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
  }, [selectedBooking, setSearchParams]);

  if (!currentUser) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-heading text-4xl font-bold">Login Required</h1>
        <p className="mt-2 text-muted-foreground">Please login to access your professional inbox.</p>
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-heading text-4xl font-bold">Professional Not Found</h1>
        <p className="mt-2 text-muted-foreground">Your email is not registered as a professional. Please contact support.</p>
      </div>
    );
  }

  const handleSend = () => {
    if (!selectedBooking || !input.trim()) {
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

  const professionalService = getServiceById(professional?.serviceId);

  return (
    <div className="container py-10 md:py-12">
      <div className="mb-6 overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 p-6 text-white shadow-[0_18px_42px_hsl(24_85%_40%_/_0.22)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Professional Inbox</p>
        <h1 className="mt-2 font-heading text-3xl font-bold md:text-4xl">Customer Messages</h1>
        <p className="mt-2 text-sm text-white/90">{professional.name} • {professionalService?.title}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="neo-panel rounded-2xl p-3">
          <h2 className="mb-2 px-3 py-2 font-semibold text-muted-foreground">Bookings ({bookings.length})</h2>
          <div className="space-y-1">
            {bookings.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No bookings yet</p>
            ) : (
              bookings.map((booking) => (
                <button
                  key={booking.id}
                  onClick={() =>
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("booking", booking.id);
                      return next;
                    })
                  }
                  className={`w-full text-left rounded-lg px-3 py-2 transition-colors ${
                    bookingId === booking.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <p className="truncate font-medium text-sm">{booking.userName}</p>
                  <p className="truncate text-xs opacity-75">{booking.userPhone}</p>
                  <p className="truncate text-xs opacity-75">{format(new Date(booking.date), "MMM dd, HH:mm")}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {selectedBooking ? (
          <div className="neo-panel rounded-2xl p-6">
            <div className="mb-4 border-b pb-4">
              <h3 className="font-semibold">{selectedBooking.userName}</h3>
              <p className="text-sm text-muted-foreground">{selectedBooking.userPhone}</p>
              <p className="text-sm text-muted-foreground">{selectedBooking.userEmail}</p>
              <p className="mt-2 text-sm">{service?.title}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(selectedBooking.date), "EEEE, MMMM dd, yyyy")} at {selectedBooking.time}
              </p>
              <p className="text-xs text-muted-foreground">📍 {selectedBooking.userAddress}</p>
            </div>

            <div className="mb-4 max-h-96 overflow-y-auto rounded-lg bg-muted/30 p-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No messages yet. Start the conversation!</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderEmail === currentUser.email ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs rounded-lg px-3 py-2 ${
                        msg.senderEmail === currentUser.email
                          ? "bg-primary text-primary-foreground"
                          : "bg-white border border-gray-200"
                      }`}
                    >
                      <p className="text-xs font-medium opacity-75">{msg.senderName}</p>
                      <p className="text-sm">{msg.text}</p>
                      <p className="text-xs opacity-60 mt-1">
                        {format(new Date(msg.createdAt), "HH:mm")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Type your reply..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim()}
                size="icon"
                className="bg-primary hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="neo-panel rounded-2xl p-6 flex items-center justify-center min-h-96">
            <p className="text-center text-muted-foreground">Select a booking to view messages</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfessionalMessages;
