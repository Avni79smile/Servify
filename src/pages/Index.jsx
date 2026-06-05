import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Search, ArrowRight, WandSparkles, Globe2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { searchServices, services } from "@/data/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBookingsByEmail, trackMetric } from "@/data/marketplace";
import { getCurrentUser } from "@/lib/auth";
import { getSubscriptionUsageByEmail } from "@/data/subscriptions";

const cardClass =
  "group rounded-[1.35rem] border border-orange-100/80 bg-white/85 p-5 text-left shadow-[0_10px_24px_hsl(24_75%_62%_/_0.08)] transition-all hover:-translate-y-1 hover:shadow-[0_14px_30px_hsl(24_75%_62%_/_0.14)]";

const heroImages = [
  {
    src: "/hero/hero-1.jpg",
    alt: "Home cleaning service professional",
  },
  {
    src: "/hero/hero-2.jpg",
    alt: "Electrical repair service professional",
  },
  {
    src: "/hero/hero-3.jpg",
    alt: "Salon and beauty service specialist",
  },
  {
    src: "/hero/hero-4.jpg",
    alt: "Home maintenance and appliance service",
  },
  {
    src: "/hero/hero-5.jpg",
    alt: "Plumbing and bathroom fitting service",
  },
  {
    src: "/hero/hero-6.jpg",
    alt: "Carpentry and interior repair service",
  },
];

const Index = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeHeroImage, setActiveHeroImage] = useState(0);
  const [failedHeroImages, setFailedHeroImages] = useState([]);

  const liveMatches = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    return searchServices(query).slice(0, 6);
  }, [query]);

  const currentUser = getCurrentUser();
  const myBookings = useMemo(() => (currentUser?.email ? getBookingsByEmail(currentUser.email) : []), [currentUser]);
  const usage = useMemo(() => (currentUser?.email ? getSubscriptionUsageByEmail(currentUser.email) : null), [currentUser]);
  const recentBooking = myBookings[myBookings.length - 1] || null;

  const themedCollections = useMemo(() => {
    const groups = [
      {
        title: "Home Essentials",
        subtitle: "Repairs, cleaning, and maintenance for everyday comfort.",
        categories: ["Home Repairs", "Cleaning", "Construction & Fabrication"],
      },
      {
        title: "Lifestyle & Personal Care",
        subtitle: "Wellness, learning, beauty, and creative lifestyle services.",
        categories: ["Beauty & Wellness", "Lifestyle & Learning", "Events & Creative"],
      },
      {
        title: "Business & Professional",
        subtitle: "Digital, legal, office, and specialist support for growth.",
        categories: ["Digital Services", "Specialized Experts", "Office Staffing", "Education & Training Staff"],
      },
      {
        title: "Mobility & Field Support",
        subtitle: "Travel, logistics, and on-ground operational help.",
        categories: ["Travel & Logistics", "Public Utility & Field Staff", "Industrial & Manufacturing Staff"],
      },
    ];

    return groups.map((group) => ({
      ...group,
      items: services.filter((service) => group.categories.includes(service.category)).slice(0, 4),
    }));
  }, []);

  useEffect(() => {
    trackMetric("visit", { page: "home" });
  }, []);

  useEffect(() => {
    if (failedHeroImages.length >= heroImages.length) {
      return;
    }

    const imageTimer = window.setInterval(() => {
      setActiveHeroImage((current) => {
        let next = current;
        for (let step = 0; step < heroImages.length; step += 1) {
          next = (next + 1) % heroImages.length;
          if (!failedHeroImages.includes(next)) {
            return next;
          }
        }
        return current;
      });
    }, 6000);

    return () => window.clearInterval(imageTimer);
  }, [failedHeroImages]);

  const handleHeroImageError = () => {
    setFailedHeroImages((previous) => {
      if (previous.includes(activeHeroImage)) {
        return previous;
      }

      const nextFailed = [...previous, activeHeroImage];
      const nextAvailable = heroImages.findIndex((_, index) => !nextFailed.includes(index));
      if (nextAvailable !== -1) {
        setActiveHeroImage(nextAvailable);
      }
      return nextFailed;
    });
  };

  const runHeroSearch = () => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      navigate("/services");
      return;
    }

    // Never block navigation if analytics/localStorage fails.
    try {
      trackMetric("search", { page: "home", query: trimmedQuery });
    } catch (error) {
      console.error("Search metric tracking failed:", error);
    }

    navigate(`/services?q=${encodeURIComponent(trimmedQuery)}`);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    runHeroSearch();
  };

  return (
    <div className="pb-12">
      <section className="neo-panel-strong relative mx-auto mt-5 max-w-[1240px] overflow-hidden rounded-[1.8rem] px-6 py-10 text-white sm:px-10 lg:px-14 lg:py-12">
        <div className="grain-overlay pointer-events-none opacity-30" />
        <div className="hero-grid-overlay pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-4 py-1.5 text-sm font-semibold">
              <Sparkles className="h-4 w-4" /> {services.length}+ SERVICES AVAILABLE
            </span>
            <h1 className="mt-7 max-w-2xl font-heading text-5xl font-extrabold leading-[1.02] tracking-tight lg:text-6xl">
              Premium services,
              <br />
              beautifully organized.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/90">
              A calm, refined marketplace for home services, expert help, and smart booking flows.
            </p>

            <form onSubmit={handleSearch} className="mt-7 flex max-w-xl items-center gap-2 rounded-2xl bg-white p-2 shadow-xl">
              <div className="flex flex-1 items-center gap-2 px-2 text-slate-700">
                <Search className="h-4 w-4" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      runHeroSearch();
                    }
                  }}
                  placeholder="Search any service worldwide"
                  className="h-9 border-0 px-0 text-slate-800 shadow-none focus-visible:ring-0"
                />
              </div>
              <Button type="button" onClick={runHeroSearch} className="h-10 rounded-xl border-0 bg-orange-500 px-5 text-white hover:bg-orange-600">
                Search
              </Button>
            </form>

            {query.trim() && (
              <div className="mt-3 max-w-xl rounded-2xl border border-white/25 bg-white/12 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3 text-sm text-white/90">
                  <p className="font-semibold">{liveMatches.length} matching services found</p>
                  <button type="button" onClick={runHeroSearch} className="font-semibold underline decoration-white/50 underline-offset-4">
                    View all results
                  </button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {liveMatches.map((service) => (
                    <Link
                      key={service.id}
                      to={`/services/${service.id}`}
                      className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/20"
                    >
                      <p className="font-semibold">{service.title}</p>
                      <p className="text-xs text-white/75">{service.category}</p>
                    </Link>
                  ))}
                  {liveMatches.length === 0 && (
                    <p className="text-sm text-white/80">No matches yet. Try another service name or category.</p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2.5 text-xs sm:text-sm">
              {["Verified professionals", "Transparent pricing", "Elegant checkout"].map((tag) => (
                <span key={tag} className="rounded-full border border-white/35 bg-white/15 px-3 py-1.5 font-semibold">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[1.2rem] border border-white/35 bg-white/15 p-3 backdrop-blur-sm">
            <div className="overflow-hidden rounded-[1rem] bg-[#f6f6f6]">
              {failedHeroImages.length >= heroImages.length ? (
                <div className="flex h-[320px] items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100 p-6 text-center text-slate-700">
                  <p className="max-w-xs text-sm font-semibold">Hero service images are temporarily unavailable. Please refresh to retry.</p>
                </div>
              ) : (
                <img
                  src={heroImages[activeHeroImage].src}
                  alt={heroImages[activeHeroImage].alt}
                  className="h-[320px] w-full object-cover transition-opacity duration-500"
                  onError={handleHeroImageError}
                />
              )}
            </div>
            <div className="mt-3 flex justify-center gap-2">
              {heroImages.map((image, index) => (
                <button
                  key={image.src}
                  type="button"
                  onClick={() => setActiveHeroImage(index)}
                  disabled={failedHeroImages.includes(index)}
                  className={`h-2 rounded-full transition-all ${failedHeroImages.includes(index)
                    ? "w-2 bg-white/25"
                    : index === activeHeroImage
                      ? "w-6 bg-white"
                      : "w-2 bg-white/50"}`}
                  aria-label={`Show hero image ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {currentUser && (
        <section className="mx-auto mt-7 max-w-[1240px] rounded-3xl border border-orange-100 bg-white/90 p-6 shadow-[0_12px_30px_hsl(24_75%_62%_/_0.1)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">Personalized Hub</p>
              <h2 className="mt-1 font-heading text-2xl font-bold text-slate-900">Welcome back, {currentUser.name}</h2>
              <p className="text-sm text-slate-600">Quick actions, rebooking, and subscription insights in one place.</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              Savings this month: ₹{usage?.savingsTotal || 0}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button className="h-auto justify-start rounded-2xl border-0 bg-orange-500 px-4 py-3 text-left text-white hover:bg-orange-600" onClick={() => navigate("/services")}>Book a new service</Button>
            <Button className="h-auto justify-start rounded-2xl border border-orange-200 bg-white px-4 py-3 text-left text-orange-700 hover:bg-orange-50" onClick={() => navigate("/my-bookings")}>Track my bookings</Button>
            <Button className="h-auto justify-start rounded-2xl border border-orange-200 bg-white px-4 py-3 text-left text-orange-700 hover:bg-orange-50" onClick={() => navigate("/plans")}>Manage subscription</Button>
            <Button className="h-auto justify-start rounded-2xl border border-orange-200 bg-white px-4 py-3 text-left text-orange-700 hover:bg-orange-50" onClick={() => navigate("/alerts")}>Open alerts center</Button>
          </div>

          {recentBooking && (
            <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50/45 p-4">
              <p className="text-sm font-semibold text-slate-900">Next best action</p>
              <p className="mt-1 text-sm text-slate-600">Rebook your recent service in one click and keep your maintenance streak active.</p>
              <Button className="mt-3 border-0 bg-orange-500 text-white hover:bg-orange-600" onClick={() => navigate(`/book?service=${recentBooking.serviceId}&profile=${recentBooking.professionalId}`)}>
                Rebook recent service
              </Button>
            </div>
          )}
        </section>
      )}

      <section className="mx-auto mt-7 max-w-[1240px] space-y-5">
        {themedCollections.map((collection) => (
          <div key={collection.title} className="rounded-[1.3rem] border border-orange-100/70 bg-white/80 px-5 py-7 shadow-[0_10px_30px_hsl(24_75%_62%_/_0.08)] sm:px-7">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <h2 className="font-heading text-2xl font-bold tracking-tight text-slate-900">{collection.title}</h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-600">{collection.subtitle}</p>
              </div>
              <Button asChild variant="ghost" className="gap-2 rounded-full text-orange-700 hover:bg-orange-50">
                <Link to="/services">
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {collection.items.map((service) => (
                <Link key={service.id} to={`/services/${service.id}`} className={cardClass}>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 transition-transform group-hover:scale-105">
                    <service.icon className="h-7 w-7" />
                  </div>
                  <p className="font-heading text-lg font-semibold text-slate-900">{service.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{service.description}</p>
                  <p className="mt-3 text-sm font-semibold text-orange-700">From {service.price}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-7 max-w-[1240px] overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-r from-orange-100/80 via-amber-50 to-sky-100/65 px-6 py-7 text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
          <Globe2 className="h-3.5 w-3.5 text-orange-600" /> WIDE COVERAGE
        </p>
        <p className="mt-3 font-heading text-2xl font-bold text-slate-900">
          Serving home, health, education, digital, legal, events, travel, logistics, and more.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
          {Array.from(new Set(services.map((service) => service.category))).slice(0, 16).map((category) => (
            <span key={category} className="chip-soft rounded-full px-3 py-1 font-semibold">
              {category}
            </span>
          ))}
        </div>
        <Button asChild className="mt-5 border-0 bg-orange-500 text-white hover:bg-orange-600">
          <Link to="/services">
            Explore full catalog <WandSparkles className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
};

export default Index;
