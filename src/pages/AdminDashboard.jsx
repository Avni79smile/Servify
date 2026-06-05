import { useEffect, useState } from "react";
import { BarChart3, IndianRupee, ListChecks, TrendingUp } from "lucide-react";
import {
  getAnalyticsSummary,
  getOpenDisputes,
  issueRefund,
  marketplaceEvents,
  resolveDispute,
} from "@/data/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const metricCard = "neo-panel rounded-2xl p-5";

const AdminDashboard = () => {
  const [summary, setSummary] = useState(getAnalyticsSummary());
  const [openDisputes, setOpenDisputes] = useState(getOpenDisputes());
  const [refundMap, setRefundMap] = useState({});

  useEffect(() => {
    const sync = () => {
      setSummary(getAnalyticsSummary());
      setOpenDisputes(getOpenDisputes());
    };
    window.addEventListener(marketplaceEvents.BOOKING_EVENT, sync);
    return () => window.removeEventListener(marketplaceEvents.BOOKING_EVENT, sync);
  }, []);

  return (
    <div className="container py-10 md:py-12">
      <div className="mb-7 overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 p-6 text-white shadow-[0_18px_42px_hsl(24_85%_40%_/_0.22)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Insights</p>
        <h1 className="mt-2 font-heading text-3xl font-bold md:text-4xl">Marketplace Analytics</h1>
        <p className="mt-2 text-sm text-white/90">Track bookings, conversion funnel, and revenue in one place.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={metricCard}>
          <ListChecks className="h-5 w-5 text-orange-600" />
          <p className="mt-2 text-sm text-slate-500">Total bookings</p>
          <p className="font-heading text-3xl font-bold text-slate-900">{summary.totalBookings}</p>
        </div>
        <div className={metricCard}>
          <TrendingUp className="h-5 w-5 text-orange-600" />
          <p className="mt-2 text-sm text-slate-500">Completed</p>
          <p className="font-heading text-3xl font-bold text-slate-900">{summary.completedBookings}</p>
        </div>
        <div className={metricCard}>
          <IndianRupee className="h-5 w-5 text-orange-600" />
          <p className="mt-2 text-sm text-slate-500">Revenue</p>
          <p className="font-heading text-3xl font-bold text-slate-900">₹{summary.revenue}</p>
        </div>
        <div className={metricCard}>
          <BarChart3 className="h-5 w-5 text-orange-600" />
          <p className="mt-2 text-sm text-slate-500">Active bookings</p>
          <p className="font-heading text-3xl font-bold text-slate-900">{summary.activeBookings}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className={metricCard}>
          <IndianRupee className="h-5 w-5 text-emerald-600" />
          <p className="mt-2 text-sm text-slate-500">Completed revenue</p>
          <p className="font-heading text-2xl font-bold text-emerald-600">₹{summary.completedRevenue}</p>
        </div>
        <div className={metricCard}>
          <ListChecks className="h-5 w-5 text-red-600" />
          <p className="mt-2 text-sm text-slate-500">Deleted bookings</p>
          <p className="font-heading text-2xl font-bold text-red-600">{summary.funnel.deleted}</p>
        </div>
        <div className={metricCard}>
          <IndianRupee className="h-5 w-5 text-red-600" />
          <p className="mt-2 text-sm text-slate-500">Lost revenue (deleted)</p>
          <p className="font-heading text-2xl font-bold text-red-600">₹{summary.deletedRevenue}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="neo-panel rounded-2xl p-5">
          <h3 className="font-heading text-xl font-bold text-slate-900">Funnel</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>Visits: {summary.funnel.visits}</p>
            <p>Searches: {summary.funnel.searches}</p>
            <p>Bookings created: {summary.funnel.bookings}</p>
            <p>Bookings completed: {summary.funnel.completed}</p>
            <p className="text-red-600">Bookings deleted: {summary.funnel.deleted}</p>
          </div>
        </div>

        <div className="neo-panel rounded-2xl p-5">
          <h3 className="font-heading text-xl font-bold text-slate-900">Status breakdown</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            {Object.entries(summary.statusCount).map(([status, value]) => (
              <p key={status} className="capitalize">{status.replace("_", " ")}: {value}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 neo-panel rounded-2xl p-5">
        <h3 className="font-heading text-xl font-bold text-slate-900">Dispute & Refund Controls</h3>
        <p className="mt-1 text-sm text-slate-500">Admin actions for open disputes and customer refunds.</p>

        {openDisputes.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No open disputes.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {openDisputes.map((booking) => (
              <div key={booking.id} className="rounded-xl border border-orange-100 bg-white p-3">
                <p className="font-semibold text-slate-900">Booking #{booking.id}</p>
                <p className="text-sm text-slate-600">Issue: {booking.dispute?.reason || "N/A"}</p>
                <p className="text-xs text-slate-500">User: {booking.userEmail}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    className="border-0 bg-orange-500 text-white hover:bg-orange-600"
                    onClick={() => {
                      resolveDispute(booking.id, "Issue verified and resolved");
                      toast.success("Dispute resolved");
                    }}
                  >
                    Resolve
                  </Button>

                  <Input
                    className="max-w-[160px]"
                    placeholder="Refund amount"
                    value={refundMap[booking.id] || ""}
                    onChange={(event) => setRefundMap((prev) => ({ ...prev, [booking.id]: event.target.value }))}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => {
                      const amount = Number(refundMap[booking.id] || 0);
                      issueRefund(booking.id, amount, "Refund approved by admin");
                      toast.success("Refund issued");
                    }}
                  >
                    Issue Refund
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
