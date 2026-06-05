import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, BriefcaseBusiness, CheckCircle2, Sparkles, TrendingUp, Users, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const careerImages = [
  {
    src: "https://images.pexels.com/photos/5945799/pexels-photo-5945799.jpeg?cs=srgb&dl=pexels-theo-decker-5945799.jpg&fm=jpg",
    alt: "Diverse professionals discussing ideas in a modern office meeting",
    label: "Team strategy",
  },
  {
    src: "https://images.pexels.com/photos/5439143/pexels-photo-5439143.jpeg?cs=srgb&dl=pexels-tima-miroshnichenko-5439143.jpg&fm=jpg",
    alt: "Professional job interview in a refined office setting",
    label: "Interview scene",
  },
  {
    src: "https://images.pexels.com/photos/12911201/pexels-photo-12911201.jpeg?cs=srgb&dl=pexels-mizunokozuki-12911201.jpg&fm=jpg",
    alt: "Focused professional working with documents in an office",
    label: "Focused work",
  },
];

const CareerHome = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % careerImages.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="container py-10 md:py-12">
      <div className="relative overflow-hidden rounded-[2.25rem] border border-orange-100 bg-[radial-gradient(120%_120%_at_0%_0%,hsl(29_100%_98%)_0%,hsl(33_100%_97%)_40%,hsl(31_95%_94%)_100%)] p-6 shadow-[0_24px_60px_hsl(24_75%_62%_/_0.18)] md:p-10">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-300/20 blur-3xl" />
        <div className="absolute -bottom-16 left-12 h-40 w-40 rounded-full bg-amber-200/40 blur-3xl" />

        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-700 shadow-sm">
              Career Website
            </span>
            <h1 className="mt-4 max-w-2xl font-heading text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
              Build a better career path with Servify.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Discover the right role, apply with a polished profile, track validation updates, and use Career AI to match your interests with the best opportunities.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="border-0 bg-orange-500 text-white shadow-[0_12px_24px_hsl(24_85%_40%_/_0.24)] hover:bg-orange-600">
                <Link to="/career/portal/apply">
                  <BriefcaseBusiness className="mr-1 h-4 w-4" /> Open Career Portal
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-orange-200 bg-white/80 text-orange-700 hover:bg-orange-50">
                <Link to="/career/ai">
                  <Bot className="mr-1 h-4 w-4" /> Try Career AI
                </Link>
              </Button>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/75 p-4 backdrop-blur">
                <WandSparkles className="h-5 w-5 text-orange-600" />
                <p className="mt-2 text-sm font-semibold text-slate-900">Smart matching</p>
                <p className="mt-1 text-xs text-slate-500">AI suggests roles based on your interests.</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/75 p-4 backdrop-blur">
                <Users className="h-5 w-5 text-orange-600" />
                <p className="mt-2 text-sm font-semibold text-slate-900">Validation flow</p>
                <p className="mt-1 text-xs text-slate-500">Profile review and inbox updates stay organized.</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/75 p-4 backdrop-blur">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                <p className="mt-2 text-sm font-semibold text-slate-900">Career growth</p>
                <p className="mt-1 text-xs text-slate-500">Turn approvals into discoverable service work.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/80 bg-white/80 p-5 shadow-[0_18px_40px_hsl(24_75%_62%_/_0.14)] backdrop-blur">
            <div className="relative overflow-hidden rounded-[1.5rem] border border-orange-100 bg-slate-950">
              <img
                src={careerImages[activeSlide].src}
                alt={careerImages[activeSlide].alt}
                className="h-[24rem] w-full object-cover transition-opacity duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(7,13,26,0.8)_0%,rgba(7,13,26,0.5)_48%,rgba(7,13,26,0.3)_100%)]" />
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <p className="mt-1 font-heading text-2xl font-bold drop-shadow-[0_8px_20px_rgba(0,0,0,0.55)]">{careerImages[activeSlide].label}</p>
                <p className="mt-1 max-w-md text-sm text-white/90">A refined career space feels calm, clear, and credible.</p>
              </div>

            </div>

            <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-3">
              <p className="font-semibold text-slate-900">{careerImages[activeSlide].label}</p>
              <p className="text-xs text-slate-600">Classy, modern, and career focused.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_12px_28px_hsl(24_75%_62%_/_0.12)]">
          <Sparkles className="h-5 w-5 text-orange-600" />
          <h3 className="mt-2 font-heading text-xl font-bold text-slate-900">Career AI Suggestions</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">Share interests and strengths to get role recommendations instantly.</p>
        </div>
        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_12px_28px_hsl(24_75%_62%_/_0.12)]">
          <BriefcaseBusiness className="h-5 w-5 text-orange-600" />
          <h3 className="mt-2 font-heading text-xl font-bold text-slate-900">One-Click Apply</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">Submit your profile in Career Portal and track validation updates in inbox.</p>
        </div>
        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_12px_28px_hsl(24_75%_62%_/_0.12)]">
          <CheckCircle2 className="h-5 w-5 text-orange-600" />
          <h3 className="mt-2 font-heading text-xl font-bold text-slate-900">Verified Profiles</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">Approved applicants become discoverable on corresponding service pages.</p>
        </div>
      </div>
    </div>
  );
};

export default CareerHome;
