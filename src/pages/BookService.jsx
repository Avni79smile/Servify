import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { CalendarIcon, Lock, MapPin, ShieldCheck, Star, Wallet, LocateFixed } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { getProfessionalById, getProfessionalsByService } from "@/data/professionals";
import { getServiceById, services } from "@/data/services";
import { AUTH_CHANGE_EVENT, getCurrentUser } from "@/lib/auth";
import { calculateDynamicPricing, createBooking, deleteBookingByUser, getBookedSlots, getBookedDates, marketplaceEvents } from "@/data/marketplace";
import { getActiveSubscriptionByEmail, getSubscriptionUsageByEmail, subscriptionPlans } from "@/data/subscriptions";
import { toast } from "sonner";
import { validatePhone, validateName, validateTextField, sanitizePhone } from "@/lib/formValidation";

const BookService = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const [serviceId, setServiceId] = useState(params.get("service") || "");
  const [profileId, setProfileId] = useState(params.get("profile") || "");
  const [date, setDate] = useState();
  const [slot, setSlot] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [coupon, setCoupon] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [upiPaid, setUpiPaid] = useState(false);
  const [addressSearchOpen, setAddressSearchOpen] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState([]);
  const [addressSearching, setAddressSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [formErrors, setFormErrors] = useState({});
  const [bookingUpdateTrigger, setBookingUpdateTrigger] = useState(0);

  const activeSubscription = currentUser ? getActiveSubscriptionByEmail(currentUser.email) : null;
  const subscriptionUsage = currentUser ? getSubscriptionUsageByEmail(currentUser.email) : null;
  const activePlan = activeSubscription ? subscriptionPlans.find((item) => item.id === activeSubscription.planId) : null;
  const selectedService = getServiceById(serviceId);

  const serviceProfessionals = useMemo(() => (serviceId ? getProfessionalsByService(serviceId) : []), [serviceId]);

  const selectedProfessional = useMemo(() => {
    const fromService = serviceProfessionals.find((item) => item.id === profileId);
    return fromService || getProfessionalById(profileId);
  }, [profileId, serviceProfessionals]);

  const bookedForDate = useMemo(() => {
    if (!selectedProfessional || !date) {
      return [];
    }
    return getBookedSlots(selectedProfessional.id, date);
  }, [selectedProfessional, date]);

  const visibleSlots = useMemo(() => {
    const base = selectedProfessional?.availableSlots || [];
    if (!activePlan) {
      return base;
    }

    const priority = ["07:00 AM", "10:00 PM"];
    return Array.from(new Set([...priority, ...base]));
  }, [selectedProfessional, activePlan]);

  const bookedDatesModifiers = useMemo(() => {
    if (!selectedProfessional) {
      return {};
    }
    const bookedDates = getBookedDates(selectedProfessional.id);
    return {
      booked: bookedDates,
    };
  }, [selectedProfessional, bookingUpdateTrigger]);

  const mapPreview = useMemo(() => {
    const match = address.match(/Lat\s*(-?\d+(?:\.\d+)?),\s*Lng\s*(-?\d+(?:\.\d+)?)/i);
    if (!match) {
      return null;
    }
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    const delta = 0.02;
    const bbox = `${(lng - delta).toFixed(5)}%2C${(lat - delta).toFixed(5)}%2C${(lng + delta).toFixed(5)}%2C${(lat + delta).toFixed(5)}`;
    const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(5)}%2C${lng.toFixed(5)}`;
    return { lat, lng, src };
  }, [address]);

  const priceBreakdown = useMemo(() => {
    if (!selectedService || !date || !slot || !currentUser) {
      return null;
    }
    return calculateDynamicPricing({
      service: selectedService,
      selectedDate: date,
      selectedSlot: slot,
      userEmail: currentUser.email,
      couponCode: coupon,
    });
  }, [selectedService, date, slot, currentUser, coupon]);

  const upiUri = useMemo(() => {
    if (!priceBreakdown || !selectedService) {
      return "";
    }

    const upiId = import.meta.env.VITE_UPI_ID || "servify@okaxis";
    const payeeName = import.meta.env.VITE_UPI_NAME || "Servify";
    const note = `${selectedService.title} booking`;
    const amount = Number(priceBreakdown.payable || 0).toFixed(2);

    const params = new URLSearchParams({
      pa: upiId,
      pn: payeeName,
      am: amount,
      cu: "INR",
      tn: note,
    });

    return `upi://pay?${params.toString()}`;
  }, [priceBreakdown, selectedService]);

  useEffect(() => {
    setUpiPaid(false);
  }, [upiUri]);

  useEffect(() => {
    const syncUser = () => setCurrentUser(getCurrentUser());
    syncUser();
    window.addEventListener(AUTH_CHANGE_EVENT, syncUser);
    window.addEventListener("storage", syncUser);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  useEffect(() => {
    const handleBookingChange = () => {
      setBookingUpdateTrigger((prev) => prev + 1);
    };
    window.addEventListener(marketplaceEvents.BOOKING_EVENT, handleBookingChange);
    return () => {
      window.removeEventListener(marketplaceEvents.BOOKING_EVENT, handleBookingChange);
    };
  }, []);

  const searchExactAddress = async (query) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setAddressResults([]);
      return;
    }

    setAddressSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(trimmedQuery)}`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Address search failed");
      }

      const data = await response.json();
      setAddressResults(data);
    } catch (error) {
      console.error("Address search failed:", error);
      toast.error("Could not search addresses right now. Please type the exact address manually.");
      setAddressResults([]);
    } finally {
      setAddressSearching(false);
    }
  };

  const selectExactAddress = (result) => {
    setAddress(result.display_name);
    setAddressSearchOpen(false);
    setAddressQuery("");
    setAddressResults([]);
    toast.success("Exact address selected");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    // Validate form fields
    const errors = {};
    const nameValidation = validateName(name);
    const phoneValidation = validatePhone(phone);
    const addressValidation = validateTextField(address, 5, "Address");

    if (!nameValidation.valid) {
      errors.name = nameValidation.error;
    }
    if (!phoneValidation.valid) {
      errors.phone = phoneValidation.error;
    }
    if (!addressValidation.valid) {
      errors.address = addressValidation.error;
    }

    if (!selectedService) {
      errors.service = "Please select a service";
    }
    if (!selectedProfessional) {
      errors.professional = "Please select a professional";
    }
    if (!date) {
      errors.date = "Please select a date";
    }
    if (!slot) {
      errors.slot = "Please select a time slot";
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
      return;
    }

    const latestCurrentUser = getCurrentUser();

    if (!latestCurrentUser) {
      toast.error("Please login/signup before booking");
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }

    if (bookedForDate.includes(slot)) {
      toast.error("This slot is no longer available. Please choose another one.");
      return;
    }

    if (paymentMethod === "upi" && !upiPaid) {
      toast.error("Please complete UPI payment and click payment done");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createBooking({
        service: selectedService,
        professional: selectedProfessional,
        date: date.toISOString(),
        time: slot,
        name: name.trim(),
        phone: sanitizePhone(phone),
        address: address.trim(),
        notes: notes.trim(),
        userEmail: latestCurrentUser.email,
        paymentMethod,
        couponCode: coupon.trim(),
      });

      if (!result?.sync?.ok) {
        if (result?.booking?.id) {
          deleteBookingByUser(result.booking.id, latestCurrentUser.email);
        }
        const reason = result?.sync?.error || "Supabase sync failed";
        toast.error(`Booking not synced to Supabase: ${reason}`);
        return;
      }

      if (paymentMethod === "upi") {
        toast.success("UPI payment verified. Booking confirmed");
      } else {
        toast.success("Booking confirmed. Pay cash on delivery");
      }
      navigate("/my-bookings");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-4xl py-10 md:py-12">
      <div className="mb-6 overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 p-6 text-white shadow-[0_18px_42px_hsl(24_85%_40%_/_0.22)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Smart Booking</p>
        <h1 className="mt-2 font-heading text-3xl font-bold md:text-4xl">Book a Service</h1>
        <p className="mt-2 text-sm text-white/90 md:text-base">Choose a verified professional, pick an open slot, and confirm instantly.</p>
      </div>

      {!currentUser && (
        <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-800">
          <p className="flex items-center gap-2 font-medium"><Lock className="h-4 w-4" /> You are not logged in.</p>
          <p className="mt-1 text-sm">You can browse schedules, but booking stays locked until login/signup.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_12px_30px_hsl(24_75%_62%_/_0.16)] md:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Service *</Label>
            <Select
              value={serviceId}
              onValueChange={(nextService) => {
                setServiceId(nextService);
                setProfileId("");
                setSlot("");
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>{service.title} - {service.price}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Professional *</Label>
            <Select value={profileId} onValueChange={setProfileId} disabled={!serviceId}>
              <SelectTrigger><SelectValue placeholder="Select professional" /></SelectTrigger>
              <SelectContent>
                {serviceProfessionals.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name} - {profile.experienceYears} yrs
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedProfessional && (
          <div className="rounded-2xl border border-orange-100 bg-orange-50/45 p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-orange-200">
                <AvatarImage src={selectedProfessional.photo} alt={selectedProfessional.name} />
                <AvatarFallback>{selectedProfessional.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-slate-900">{selectedProfessional.name}</p>
                <p className="text-sm text-slate-600">{selectedProfessional.email}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-medium text-slate-700">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Verified
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-medium text-slate-700">
                <Star className="h-3.5 w-3.5 text-amber-500" /> {selectedProfessional.rating} rating
              </span>
              <span className="rounded-full bg-white px-2.5 py-1 font-medium text-slate-700">
                {selectedProfessional.experienceYears} years experience
              </span>
              <span className="rounded-full bg-white px-2.5 py-1 font-medium text-slate-700">
                Responds in ~{selectedProfessional.responseTimeMinutes || 15} mins
              </span>
            </div>
            {!!selectedProfessional.badges?.length && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedProfessional.badges.slice(0, 3).map((badge) => (
                  <span key={badge} className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {badge}
                  </span>
                ))}
              </div>
            )}
            {activePlan && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                {activePlan.name} active • member-only priority slots unlocked • {subscriptionUsage?.creditsRemaining || 0} credits left
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="space-y-2 p-3">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(nextDate) => {
                    setDate(nextDate);
                    setSlot("");
                  }}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  modifiers={selectedProfessional ? { booked: bookedDatesModifiers.booked || [] } : undefined}
                  className="pointer-events-auto"
                />
                <p className="text-xs text-muted-foreground px-3">
                  <span className="inline-block w-3 h-3 bg-orange-200 rounded mr-2"></span>
                  Orange dates have existing bookings
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Available Slots *</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {visibleSlots.length === 0 && <p className="text-sm text-muted-foreground">Select a professional to view slots.</p>}
            {visibleSlots.map((time) => {
              const booked = bookedForDate.includes(time);
              return (
                <button
                  key={time}
                  type="button"
                  disabled={booked}
                  onClick={() => setSlot(time)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${booked
                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through"
                    : slot === time
                      ? "border-orange-500 bg-orange-500 text-white"
                      : "border-orange-100 bg-orange-50/50 text-slate-700 hover:bg-orange-100"}`}
                >
                  {time} {booked ? "(Booked)" : ["07:00 AM", "10:00 PM"].includes(time) ? "(Member Priority)" : "(Free)"}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone Number *</Label>
            <Input placeholder="+91 XXXXX XXXXX" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Address *</Label>
          <Textarea placeholder="Full address with landmark" value={address} onChange={(event) => setAddress(event.target.value)} />
          <Button type="button" variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50" onClick={() => setAddressSearchOpen(true)}>
            <LocateFixed className="mr-2 h-4 w-4" /> Find exact address
          </Button>
          {mapPreview && (
            <div className="overflow-hidden rounded-xl border border-orange-100">
              <iframe
                title="Selected address map preview"
                src={mapPreview.src}
                className="h-56 w-full"
                loading="lazy"
              />
            </div>
          )}
        </div>

        <Dialog open={addressSearchOpen} onOpenChange={setAddressSearchOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Find exact address</DialogTitle>
              <DialogDescription>
                Search your street, building, locality, or landmark, then select the exact result.
              </DialogDescription>
            </DialogHeader>
            <Command className="rounded-xl border">
              <CommandInput
                placeholder="Search exact address"
                value={addressQuery}
                onValueChange={(nextValue) => {
                  setAddressQuery(nextValue);
                  searchExactAddress(nextValue);
                }}
              />
              <CommandList>
                <CommandEmpty>{addressSearching ? "Searching..." : "No address found"}</CommandEmpty>
                <CommandGroup heading="Results">
                  {addressResults.map((result) => (
                    <CommandItem key={result.place_id} value={result.display_name} onSelect={() => selectExactAddress(result)}>
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-medium">{result.display_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {result.lat && result.lon ? `Lat ${Number(result.lat).toFixed(5)}, Lng ${Number(result.lon).toFixed(5)}` : "Exact match"}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </DialogContent>
        </Dialog>

        <div className="space-y-2">
          <Label>Additional Notes</Label>
          <Textarea placeholder="Any special instructions..." value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Coupon Code</Label>
            <Input placeholder="Try WELCOME10" value={coupon} onChange={(event) => setCoupon(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm font-medium text-emerald-700">UPI Payment</div>
          </div>
        </div>

        {paymentMethod === "upi" && priceBreakdown && upiUri && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-sm font-semibold text-emerald-800">Scan QR with Google Pay (or any UPI app)</p>
            <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <div className="rounded-xl border border-emerald-200 bg-white p-3">
                <QRCodeSVG value={upiUri} size={168} includeMargin />
              </div>
              <div className="space-y-2 text-sm text-slate-700">
                <p>Amount: ₹{priceBreakdown.payable}</p>
                <Button
                  type="button"
                  className="border-0 bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => {
                    setUpiPaid(true);
                    toast.success("Payment marked as done");
                  }}
                >
                  Payment Done
                </Button>
                {upiPaid && <p className="text-xs font-semibold text-emerald-700">Payment status: Done</p>}
              </div>
            </div>
          </div>
        )}



        {priceBreakdown && (
          <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4 text-sm text-slate-700">
            <p className="mb-2 inline-flex items-center gap-2 font-semibold text-slate-900"><Wallet className="h-4 w-4 text-orange-600" /> Dynamic Price Summary</p>
            <div className="grid gap-1 sm:grid-cols-2">
              <p>Base fare: ₹{priceBreakdown.baseFare}</p>
              <p>Platform fee: ₹{priceBreakdown.platformFee}</p>
              <p>Weekend surge: ₹{priceBreakdown.weekendSurge}</p>
              <p>Peak surge: ₹{priceBreakdown.peakSurge}</p>
              <p>First booking discount: -₹{priceBreakdown.firstBookingDiscount}</p>
              <p>Coupon discount: -₹{priceBreakdown.couponDiscount}</p>
              <p>Member discount: -₹{priceBreakdown.memberDiscount || 0}</p>
              <p>Priority slot discount: -₹{priceBreakdown.prioritySlotDiscount || 0}</p>
            </div>
            <div className="mt-2 border-t border-orange-200 pt-2 font-semibold text-slate-900">
              {`Total: ₹${priceBreakdown.payable} • Pay now (UPI): ₹${priceBreakdown.payable}`}
            </div>
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={!currentUser || isSubmitting || !upiPaid}
          className="w-full border-0 bg-orange-500 font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
        >
          {currentUser
            ? isSubmitting
              ? "Confirming booking..."
              : !upiPaid
                ? "Complete UPI payment to confirm"
                : "Confirm Booking"
            : "Login to Book"}
        </Button>
      </form>

      {!currentUser && (
        <div className="mt-4 text-center">
          <Button asChild variant="outline" className="border-orange-200 text-orange-800 hover:bg-orange-50">
            <Link to={`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`}>Go to Login / Signup</Link>
          </Button>
        </div>
      )}
    </div>
  );
};
export default BookService;
