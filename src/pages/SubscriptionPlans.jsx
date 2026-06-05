import { useEffect, useState } from "react";
import { CheckCircle2, Crown, PauseCircle, PlayCircle, Plus, Users, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/auth";
import {
  FREE_RESCHEDULE_LIMIT_NO_PLAN,
  addHouseholdMember,
  addTopupCredits,
  cancelSubscription,
  getActiveSubscriptionByEmail,
  getSubscriptionUsageByEmail,
  pauseSubscription,
  recommendSubscriptionPlan,
  removeHouseholdMember,
  resumeSubscription,
  subscriptionEvent,
  subscriptionPlans,
  subscribePlan,
} from "@/data/subscriptions";
import { persistSubscriptionToSupabase } from "@/lib/supabaseSync";
import { toast } from "sonner";

const SubscriptionPlans = ({ embedded = false, requireSelection = false, onComplete, onSkip }) => {
  const currentUser = getCurrentUser();
  const [active, setActive] = useState(currentUser ? getActiveSubscriptionByEmail(currentUser.email) : null);
  const [usage, setUsage] = useState(currentUser ? getSubscriptionUsageByEmail(currentUser.email) : null);
  const [memberName, setMemberName] = useState("");
  const [estimatedBookings, setEstimatedBookings] = useState("4");
  const [familySize, setFamilySize] = useState("2");
  const [processingPlanId, setProcessingPlanId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [checkoutStep, setCheckoutStep] = useState("idle");

//  useEffect(() => {
//    if (!currentUser) {
//      return;
//    }
//    const sync = () => {
//      setActive(getActiveSubscriptionByEmail(currentUser.email));
//      setUsage(getSubscriptionUsageByEmail(currentUser.email));
//    };
//    window.addEventListener(subscriptionEvent, sync);
//    sync();
//    return () => window.removeEventListener(subscriptionEvent, sync);
//  }, [currentUser]);

useEffect(() => {
  if (!currentUser?.email) return;

  // 1. Define the sync function
  const sync = () => {
    const latestActive = getActiveSubscriptionByEmail(currentUser.email);
    const latestUsage = getSubscriptionUsageByEmail(currentUser.email);
    
    // Only update if data actually changed to prevent render loops
    setActive(prev => JSON.stringify(prev) !== JSON.stringify(latestActive) ? latestActive : prev);
    setUsage(prev => JSON.stringify(prev) !== JSON.stringify(latestUsage) ? latestUsage : prev);
  };

  // 2. Attach the listener
  window.addEventListener(subscriptionEvent, sync);

  // 3. Initial sync
  sync();

  // 4. Cleanup
  return () => window.removeEventListener(subscriptionEvent, sync);
}, [currentUser?.email]); // Use the email string as dependency instead of the user object

  const recommendedPlanId = recommendSubscriptionPlan({
    monthlyBookings: Number(estimatedBookings || 0),
    familyMembers: Number(familySize || 1),
  });
  const showSelectionOnly = embedded && requireSelection;
  const plansToRender = embedded
    ? subscriptionPlans
    : active
      ? subscriptionPlans.filter((plan) => plan.id === active.planId)
      : [];

  const selectedPlan = subscriptionPlans.find((plan) => plan.id === selectedPlanId) || null;

  const startPlanCheckout = (plan) => {
    if (!currentUser?.email || processingPlanId) {
      return;
    }

    setSelectedPlanId(plan.id);
    setCheckoutStep("confirm");
  };

  const confirmPlanCheckout = () => {
    setCheckoutStep("qr");
  };

  const cancelCheckout = () => {
    setCheckoutStep("idle");
    setSelectedPlanId("");
  };

  const completePlanPurchase = async () => {
    const plan = selectedPlan;
    if (!currentUser?.email || !currentUser?.id || processingPlanId) {
      toast.error("Missing user information. Please login again.");
      return;
    }
    if (!plan) {
      toast.error("Please select a plan first");
      return;
    }

    setProcessingPlanId(plan.id);
    try {
      // 1. Subscribe locally
      subscribePlan(currentUser.email, plan.id);
      const latestActive = getActiveSubscriptionByEmail(currentUser.email);
      
      if (!latestActive) {
        toast.error("Failed to create subscription. Please try again.");
        setProcessingPlanId("");
        return;
      }
      
      setActive(latestActive);
      setUsage(getSubscriptionUsageByEmail(currentUser.email));
      
      // 2. Persist subscription to Supabase (critical - must wait for this)
      console.log("DEBUG: Persisting subscription to Supabase", {
        userId: currentUser.id,
        planId: latestActive.planId,
        status: latestActive.status,
      });
      
      try {
        await persistSubscriptionToSupabase({ 
          activeSubscription: latestActive, 
          userId: currentUser.id 
        });
      } catch (persistError) {
        console.error("Persistence error:", persistError?.message);
        toast.error(`Failed to save subscription: ${persistError?.message || "Unknown error"}`);
        setProcessingPlanId("");
        return;
      }
      
      toast.success(`Payment successful. ${plan.name} activated.`);
      if (onComplete) {
        onComplete(latestActive);
      }
      cancelCheckout();
    } catch (err) {
      console.error("Error during subscription purchase:", err);
      toast.error("Failed to process subscription. Please try again.");
    } finally {
      setProcessingPlanId("");
    }
  };

  if (!currentUser) {
    return (
      <div className={embedded ? "p-8 text-center" : "container py-20 text-center"}>
        <h1 className="font-heading text-4xl font-bold">Login Required</h1>
        <p className="mt-2 text-muted-foreground">Please login to manage subscription plans.</p>
      </div>
    );
  }

  return (
    <div className={embedded ? "p-6 md:p-8" : "container py-10 md:py-12"}>
      <div className="relative mb-7 overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 p-6 text-white shadow-[0_18px_42px_hsl(24_85%_40%_/_0.22)] md:p-8">
        {showSelectionOnly && (
          <button
            type="button"
            className="absolute right-8 top-8 rounded-full border border-white/50 bg-white/10 p-1.5 text-white hover:bg-white/20"
            aria-label="Close plan popup"
            onClick={() => onSkip?.()}
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Premium</p>
        <h1 className="mt-2 font-heading text-3xl font-bold md:text-4xl">
          {showSelectionOnly ? "Complete your plan payment" : "Subscription Plans"}
        </h1>
        <p className="mt-2 text-sm text-white/90">
          {showSelectionOnly
            ? `Select a plan and pay to activate benefits right now. Without a plan, only ${FREE_RESCHEDULE_LIMIT_NO_PLAN} reschedules are allowed.`
            : "Get discounts, priority support, and faster booking flow."}
        </p>
      </div>

      {!showSelectionOnly && active && (
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-semibold text-emerald-700">Active Plan: {subscriptionPlans.find((item) => item.id === active.planId)?.name}</p>
            <p className="text-sm text-emerald-700/90">Renews on {new Date(active.renewsAt).toLocaleDateString()}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {active.status === "active" ? (
                <Button
                  variant="outline"
                  className="border-orange-300 text-orange-700"
                  onClick={() => {
                    pauseSubscription(currentUser.email, 30);
                    const paused = getActiveSubscriptionByEmail(currentUser.email);
                    if (paused && currentUser?.id) {
                      void persistSubscriptionToSupabase({ activeSubscription: paused, userId: currentUser.id });
                    }
                    toast.success("Subscription paused for 30 days");
                  }}
                >
                  <PauseCircle className="mr-1 h-4 w-4" /> Pause
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="border-emerald-300 text-emerald-700"
                  onClick={() => {
                    resumeSubscription(currentUser.email);
                    void persistSubscriptionToSupabase({ activeSubscription: getActiveSubscriptionByEmail(currentUser.email), userId: currentUser.id });
                    toast.success("Subscription resumed");
                  }}
                >
                  <PlayCircle className="mr-1 h-4 w-4" /> Resume
                </Button>
              )}
              <Button
                variant="outline"
                onClick={async () => {
                  cancelSubscription(currentUser.email);
                  // Get the cancelled subscription and persist to Supabase
                  const cancelled = getActiveSubscriptionByEmail(currentUser.email);
                  setActive(null);
                  setUsage(getSubscriptionUsageByEmail(currentUser.email));
                  if (currentUser?.id) {
                    void persistSubscriptionToSupabase({ activeSubscription: cancelled, userId: currentUser.id });
                  }
                  toast.success("Subscription cancelled");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-orange-800"><Wallet className="h-4 w-4" /> Credit Wallet</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{usage?.creditsRemaining || 0}</p>
            <p className="text-sm text-slate-600">remaining of {usage?.creditsTotal || 0} credits</p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-orange-300 text-orange-700"
                onClick={() => {
                  addTopupCredits(currentUser.email, 1);
                  toast.success("1 top-up credit added");
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> +1 Credit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-orange-300 text-orange-700"
                onClick={() => {
                  addTopupCredits(currentUser.email, 3);
                  toast.success("3 top-up credits added");
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> +3 Credits
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-700">Free reschedules / month</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{usage?.rescheduleAllowance || 0}</p>
            <p className="text-sm text-slate-500">included in your selected plan</p>
          </div>
        </div>
      )}

      {!showSelectionOnly && Boolean(active) && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-orange-100 bg-white p-5">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><Users className="h-4 w-4" /> Household sharing</p>
            <p className="mt-1 text-sm text-slate-500">Add family members to use the same subscription wallet.</p>
            <div className="mt-3 flex gap-2">
              <Input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="Add member name" />
              <Button
                onClick={() => {
                  try {
                    addHouseholdMember(currentUser.email, memberName);
                    setMemberName("");
                    toast.success("Member added to household");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Could not add member");
                  }
                }}
              >
                Add
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(usage?.householdMembers || []).map((member) => (
                <button
                  key={member}
                  type="button"
                  onClick={() => {
                    removeHouseholdMember(currentUser.email, member);
                    toast.success("Member removed");
                  }}
                  className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700"
                >
                  {member} ×
                </button>
              ))}
              {(usage?.householdMembers || []).length === 0 && <p className="text-sm text-slate-500">No household members yet.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-white p-5">
            <p className="text-sm font-semibold text-slate-700">Plan recommendation simulator</p>
            <p className="mt-1 text-sm text-slate-500">Estimate your monthly usage to get a plan recommendation.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs text-slate-500">Monthly bookings</p>
                <Input value={estimatedBookings} onChange={(event) => setEstimatedBookings(event.target.value)} />
              </div>
              <div>
                <p className="mb-1 text-xs text-slate-500">Family members</p>
                <Input value={familySize} onChange={(event) => setFamilySize(event.target.value)} />
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Recommended plan: {subscriptionPlans.find((plan) => plan.id === recommendedPlanId)?.name}
            </div>
          </div>
        </div>
      )}

      {!embedded && active && (
        <p className="mb-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm text-orange-800">
          Showing your selected offer only.
        </p>
      )}

      {!embedded && !active && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">
          No plan selected yet. You currently have {FREE_RESCHEDULE_LIMIT_NO_PLAN} reschedules only.
        </div>
      )}

      {checkoutStep === "confirm" && selectedPlan && (
        <div className="mb-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm font-semibold text-slate-800">Are you sure you want to choose {selectedPlan.name} for ₹{selectedPlan.priceMonthly}/month?</p>
          <div className="mt-3 flex gap-2">
            <Button type="button" variant="outline" onClick={cancelCheckout}>Cancel</Button>
            <Button type="button" className="border-0 bg-orange-500 text-white hover:bg-orange-600" onClick={confirmPlanCheckout}>Sure</Button>
          </div>
        </div>
      )}

      {checkoutStep === "qr" && selectedPlan && (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-800">Scan QR to pay ₹{selectedPlan.priceMonthly} (dummy)</p>
          <div className="mt-3 grid place-items-center rounded-xl border border-emerald-200 bg-white p-4">
            <div className="grid h-40 w-40 grid-cols-8 gap-1 bg-white p-2">
              {Array.from({ length: 64 }).map((_, idx) => (
                <span
                  key={`qr-${idx}`}
                  className={`${idx % 3 === 0 || idx % 5 === 0 ? "bg-slate-900" : "bg-slate-100"}`}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">Dummy QR for testing flow</p>
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="button" variant="outline" onClick={cancelCheckout}>Back</Button>
            <Button
              type="button"
              className="border-0 bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={processingPlanId === selectedPlan.id}
              onClick={completePlanPurchase}
            >
              {processingPlanId === selectedPlan.id ? "Finishing..." : "Done"}
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {plansToRender.map((plan) => (
          <div key={plan.id} className="neo-panel rounded-2xl p-5">
            <p className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
              <Crown className="h-3.5 w-3.5" /> {plan.name}
            </p>
            {recommendedPlanId === plan.id && (
              <p className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Best for your usage</p>
            )}
            <p className="mt-3 font-heading text-4xl font-bold text-slate-900">₹{plan.priceMonthly}</p>
            <p className="text-sm text-slate-500">per month</p>
            <p className="mt-1 text-xs text-slate-500">Up to {plan.householdLimit} family members • {plan.freeReschedulesMonthly} free reschedules / month</p>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              {plan.benefits.map((benefit) => (
                <p key={benefit} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /> {benefit}</p>
              ))}
            </div>
            <Button
              className="mt-5 w-full border-0 bg-orange-500 text-white hover:bg-orange-600"
              disabled={processingPlanId === plan.id}
              onClick={() => startPlanCheckout(plan)}
            >
              {processingPlanId === plan.id
                ? "Processing payment..."
                : embedded
                  ? `Choose Plan (₹${plan.priceMonthly})`
                  : active
                    ? "Renew Plan"
                    : "Choose Plan"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPlans;
