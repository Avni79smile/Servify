import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Sparkles } from "lucide-react";
import ServiceCard from "@/components/ServiceCard";
import { searchServices, serviceCategories, services } from "@/data/services";
import { trackMetric } from "@/data/marketplace";

const Services = () => {
  const [params] = useSearchParams();

  const initialSearch = params.get("q") || "";
  const initialCategory = params.get("category") || "All";

  const [query, setQuery] = useState(initialSearch);
  const [category, setCategory] = useState(serviceCategories.includes(initialCategory) ? initialCategory : "All");

  useEffect(() => {
    trackMetric("visit", { page: "services" });
  }, []);

  useEffect(() => {
    setQuery(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    setCategory(serviceCategories.includes(initialCategory) ? initialCategory : "All");
  }, [initialCategory]);

  const filtered = useMemo(() => {
    const byQuery = query.trim() ? searchServices(query) : services;
    return category === "All" ? byQuery : byQuery.filter((service) => service.category === category);
  }, [query, category]);

  return (
    <div className="container py-10 md:py-12">
      <section className="neo-panel-strong relative mb-7 overflow-hidden rounded-[1.6rem] p-6 text-white sm:p-8">
        <div className="grain-overlay opacity-30" />
        <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" /> GLOBAL SERVICE CATALOG
        </span>
        <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight sm:text-5xl">A refined catalog of trusted services</h1>
        <p className="mt-3 max-w-2xl text-white/90">
          Search by service name or browse by category. Clean, quick, and focused on getting you to the right professional fast.
        </p>
      </section>

      <section className="neo-panel mb-6 rounded-[1.2rem] p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex h-11 items-center gap-2 rounded-xl border border-orange-100 bg-white px-3 text-slate-700 lg:min-w-[420px] lg:flex-1">
            <Search className="h-4 w-4 text-orange-500" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                if (event.target.value.length > 2) {
                  trackMetric("search", { page: "services", query: event.target.value });
                }
              }}
              placeholder="Search by service name or category"
              className="h-full w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
            />
          </div>

          <div className="text-sm text-slate-500">
            {filtered.length} services in <span className="font-semibold text-slate-900">{category}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {serviceCategories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                category === item
                  ? "bg-orange-500 text-white"
                  : "border border-orange-100 bg-white text-slate-600 hover:border-orange-200"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="neo-panel rounded-2xl p-10 text-center">
          <p className="font-medium">No services found for your filters.</p>
          <p className="mt-1 text-sm text-muted-foreground">Try another keyword or choose a different section.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((service, index) => (
            <ServiceCard key={service.id} {...service} delay={index * 0.03} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Services;
