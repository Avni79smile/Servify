import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BriefcaseBusiness, Mail, Star, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getServiceById } from "@/data/services";
import { getProfessionalsByService } from "@/data/professionals";
import { getReviewSummaryForProfessional } from "@/data/marketplace";

const ServiceProfiles = () => {
  const { serviceId = "" } = useParams();
  const navigate = useNavigate();
  const service = getServiceById(serviceId);
  const professionals = getProfessionalsByService(serviceId);

  if (!service) {
    return (
      <div className="container py-16 text-center">
        <h1 className="font-heading text-3xl font-bold">Service Not Found</h1>
        <p className="mt-2 text-muted-foreground">Please choose a valid service from our catalog.</p>
        <Button asChild className="mt-6">
          <Link to="/services">Go to Services</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10 md:py-12">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3.5 py-1.5 text-sm font-semibold text-orange-800 transition-colors hover:bg-orange-100"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 p-6 shadow-[0_18px_40px_hsl(24_85%_40%_/_0.24)] md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Service Professionals</p>
            <h1 className="mt-2 font-heading text-3xl font-bold text-white md:text-4xl">{service.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/90 md:text-base">{service.description}</p>
          </div>
          <Badge className="border-0 bg-white/95 px-3 py-1 text-orange-800">From {service.price}</Badge>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {professionals.length} verified professional{professionals.length === 1 ? "" : "s"} available
        </p>
        <Button asChild variant="outline" className="border-orange-200 text-orange-800 hover:bg-orange-50">
          <Link to="/services">Explore More Services</Link>
        </Button>
      </div>

      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {professionals.map((profile, index) => (
          <motion.div
            key={profile.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="overflow-hidden rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_10px_25px_hsl(22_70%_60%_/_0.14)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_32px_hsl(22_70%_50%_/_0.2)]"
          >
            <div className="flex items-center gap-3">
              <img
                src={profile.photo}
                alt={profile.name}
                className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/15"
                loading="lazy"
              />
              <div>
                <h3 className="font-heading text-xl font-bold">{profile.name}</h3>
                {profile.origin === "career" && (
                  <Badge className="mt-1 gap-1 bg-emerald-600 text-white">
                    <Sparkles className="h-3.5 w-3.5" /> Validated Hire
                  </Badge>
                )}
                <div className="mt-1 flex items-center gap-1 text-sm text-amber-500">
                  <Star className="h-4 w-4 fill-current" /> {profile.rating}
                </div>
                <p className="text-xs text-slate-500">Responds in ~{profile.responseTimeMinutes || 15} mins</p>
              </div>
            </div>

            {!!profile.badges?.length && (
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.badges.slice(0, 3).map((badge) => (
                  <span key={badge} className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {badge}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4" /> {profile.experienceYears} years experience</p>
              <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> {profile.email}</p>
              <p>{profile.bio}</p>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                {profile.jobsCompleted}+ jobs completed
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {(() => {
                  const summary = getReviewSummaryForProfessional(profile.id);
                  return summary.count > 0 ? `${summary.average}★ (${summary.count} reviews)` : "No reviews yet";
                })()}
              </span>
              <Button asChild className="border-0 bg-orange-500 text-white hover:bg-orange-600">
                <Link to={`/book?service=${service.id}&profile=${profile.id}`}>Book</Link>
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ServiceProfiles;
