import {
  Baby,
  Bike,
  Bug,
  Briefcase,
  Building2,
  Camera,
  Car,
  ChefHat,
  Clock,
  Cpu,
  Droplets,
  GraduationCap,
  Hammer,
  HeartPulse,
  Home,
  Hotel,
  KeyRound,
  Laptop,
  Lock,
  Music,
  Palette,
  Paintbrush,
  PartyPopper,
  PawPrint,
  Plane,
  Package,
  Ruler,
  Scale,
  Scissors,
  Shield,
  ShowerHead,
  Smartphone,
  SprayCanIcon,
  Snowflake,
  Star,
  Stethoscope,
  Shirt,
  Tv,
  TreePine,
  Truck,
  UserRound,
  Users,
  Utensils,
  Wrench,
  Zap,
} from "lucide-react";

const toSlug = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const serviceIdAliases = {
  "home-cleaning": "house-cleaning",
  "bathroom-cleaning": "kitchen-cleaning",
  electrical: "electrician",
  painting: "interior-design",
  "laundry-ironing": "laundry-ironing",
  "maid-service": "full-time-maid",
  "elder-care": "elder-caregiver",
  "security-guard": "security-guard",
  "driver-on-demand": "driver-on-demand",
  "office-helper": "office-assistant",
  "private-tutor": "home-tutor",
  "home-cook": "live-in-cook",
};

const formatPrice = (amount, unit = "") => `₹${amount}${unit}`;

const pickServiceIcon = (title, fallbackIcon) => {
  const value = title.toLowerCase();

  if (value.includes("plumb") || value.includes("water purifier") || value.includes("ro ") || value.includes("pipe")) return Wrench;
  if (value.includes("electric") || value.includes("wiring") || value.includes("switch")) return Zap;
  if (value.includes("paint") || value.includes("interior")) return Palette;
  if (value.includes("pest")) return Bug;
  if (value.includes("carpent") || value.includes("wood")) return Hammer;
  if (value.includes("laundry") || value.includes("iron") || value.includes("tailor")) return Shirt;
  if (value.includes("ac") || value.includes("air condition") || value.includes("cool")) return Snowflake;
  if (value.includes("cook") || value.includes("chef") || value.includes("cater")) return ChefHat;
  if (value.includes("pack") || value.includes("mover") || value.includes("parcel")) return Package;
  if (value.includes("roof") || value.includes("floor") || value.includes("tile")) return Ruler;
  if (value.includes("lock") || value.includes("security")) return Lock;
  if (value.includes("key")) return KeyRound;
  if (value.includes("bath") || value.includes("kitchen") || value.includes("clean") || value.includes("sanitize")) return SprayCanIcon;
  if (value.includes("garden") || value.includes("lawn") || value.includes("plant")) return TreePine;
  if (value.includes("photo") || value.includes("video")) return Camera;
  if (value.includes("dj") || value.includes("music")) return Music;
  if (value.includes("event") || value.includes("wedding") || value.includes("birthday")) return PartyPopper;
  if (value.includes("app") || value.includes("web") || value.includes("software")) return Laptop;
  if (value.includes("logo") || value.includes("graphic")) return Paintbrush;
  if (value.includes("social media") || value.includes("seo")) return Smartphone;
  if (value.includes("data") || value.includes("entry") || value.includes("assistant")) return Cpu;
  if (value.includes("driver") || value.includes("cab") || value.includes("travel")) return Car;
  if (value.includes("bike")) return Bike;
  if (value.includes("airport") || value.includes("tour") || value.includes("ticket")) return Plane;
  if (value.includes("delivery") || value.includes("logistics")) return Truck;
  if (value.includes("maid") || value.includes("house manager") || value.includes("home staff")) return Home;
  if (value.includes("nanny") || value.includes("baby") || value.includes("babysitter")) return Baby;
  if (value.includes("elder") || value.includes("caregiver") || value.includes("nurse") || value.includes("patient")) return HeartPulse;
  if (value.includes("therap") || value.includes("physio") || value.includes("nutrition")) return Stethoscope;
  if (value.includes("office") || value.includes("reception") || value.includes("store")) return Building2;
  if (value.includes("hr") || value.includes("sales") || value.includes("marketing")) return Briefcase;
  if (value.includes("law") || value.includes("legal") || value.includes("tax") || value.includes("account")) return Scale;
  if (value.includes("architect") || value.includes("real estate") || value.includes("insurance")) return Hotel;
  if (value.includes("invest") || value.includes("cyber")) return Shield;
  if (value.includes("tutor") || value.includes("coach") || value.includes("mentor") || value.includes("language")) return GraduationCap;
  if (value.includes("yoga") || value.includes("fitness") || value.includes("massage")) return UserRound;
  if (value.includes("pet")) return PawPrint;
  if (value.includes("window") || value.includes("pressure washing") || value.includes("pool")) return ShowerHead;
  if (value.includes("refrigerator") || value.includes("microwave") || value.includes("tv") || value.includes("appliance")) return Tv;
  if (value.includes("water")) return Droplets;

  return fallbackIcon;
};

const createServicesFromGroup = ({
  section,
  category,
  icon,
  basePrice,
  step,
  unit,
  items,
}) =>
  items.map((title, index) => ({
    id: toSlug(title),
    title,
    description: `Trusted experts for ${title.toLowerCase()} with verified quality and fast response.`,
    icon: pickServiceIcon(title, icon),
    price: formatPrice(basePrice + index * step, unit),
    category,
    section,
    tags: [
      ...title.toLowerCase().split(/\s+/),
      category.toLowerCase(),
      section,
      "service",
      "booking",
    ],
  }));

const catalogGroups = [
  {
    section: "daily",
    category: "Home Repairs",
    icon: Wrench,
    basePrice: 199,
    step: 25,
    unit: "",
    items: [
      "Plumbing",
      "Electrician",
      "Carpentry",
      "Appliance Repair",
      "AC Service",
      "Refrigerator Repair",
      "Washing Machine Repair",
      "Microwave Repair",
      "RO Water Purifier Service",
      "Geyser Repair",
    ],
  },
  {
    section: "daily",
    category: "Cleaning",
    icon: SprayCanIcon,
    basePrice: 249,
    step: 20,
    unit: "",
    items: [
      "House Cleaning",
      "Bathroom Cleaning",
      "Kitchen Cleaning",
      "Sofa Cleaning",
      "Mattress Cleaning",
      "Carpet Cleaning",
      "Window Cleaning",
      "Deep Sanitization",
      "Office Cleaning",
      "Post Construction Cleaning",
    ],
  },
  {
    section: "daily",
    category: "Outdoor & Auto",
    icon: Car,
    basePrice: 299,
    step: 30,
    unit: "",
    items: [
      "Gardening",
      "Lawn Mowing",
      "Plant Maintenance",
      "Car Wash",
      "Car Detailing",
      "Bike Service",
      "Pressure Washing",
      "Pool Cleaning",
      "Snow Removal",
      "Junk Removal",
    ],
  },
  {
    section: "daily",
    category: "Beauty & Wellness",
    icon: Scissors,
    basePrice: 399,
    step: 35,
    unit: "",
    items: [
      "Haircut at Home",
      "Makeup Artist",
      "Bridal Makeup",
      "Massage Therapy",
      "Nail Art",
      "Skin Care Consultation",
      "Yoga Trainer",
      "Personal Trainer",
      "Meditation Coach",
      "Physiotherapy at Home",
    ],
  },
  {
    section: "daily",
    category: "Events & Creative",
    icon: PartyPopper,
    basePrice: 799,
    step: 80,
    unit: "",
    items: [
      "Photography",
      "Videography",
      "DJ Service",
      "Event Decoration",
      "Wedding Planner",
      "Birthday Planner",
      "Catering",
      "Live Musician",
      "Bartender",
      "Master of Ceremony",
    ],
  },
  {
    section: "daily",
    category: "Digital Services",
    icon: Laptop,
    basePrice: 499,
    step: 55,
    unit: "",
    items: [
      "Web Design",
      "App Development",
      "Graphic Design",
      "Logo Design",
      "SEO Expert",
      "Social Media Manager",
      "Content Writing",
      "Video Editing",
      "Data Entry",
      "Virtual Assistant",
    ],
  },
  {
    section: "daily",
    category: "Lifestyle & Learning",
    icon: GraduationCap,
    basePrice: 149,
    step: 25,
    unit: "",
    items: [
      "Laundry & Ironing",
      "Home Cook",
      "Tailoring",
      "Home Tutor",
      "Language Tutor",
      "Music Tutor",
      "Dance Instructor",
      "Chess Coach",
      "Art & Craft Mentor",
      "Public Speaking Coach",
    ],
  },
  {
    section: "daily",
    category: "Travel & Logistics",
    icon: Plane,
    basePrice: 349,
    step: 40,
    unit: "",
    items: [
      "Driver on Demand",
      "Airport Transfer",
      "Intercity Cab",
      "Bike Courier",
      "Parcel Delivery",
      "Packers and Movers",
      "Storage Helper",
      "Travel Planner",
      "Tour Guide",
      "Ticket Booking Assistance",
    ],
  },
  {
    section: "employee",
    category: "Home Staffing",
    icon: Home,
    basePrice: 699,
    step: 60,
    unit: "/day",
    items: [
      "Full-time Maid",
      "Part-time Maid",
      "Live-in Cook",
      "Babysitter",
      "Nanny",
      "Elder Caregiver",
      "House Manager",
      "Pet Caregiver",
      "Security Guard",
      "Home Driver",
    ],
  },
  {
    section: "employee",
    category: "Office Staffing",
    icon: Building2,
    basePrice: 999,
    step: 80,
    unit: "/day",
    items: [
      "Office Assistant",
      "Receptionist",
      "Data Entry Operator",
      "Account Assistant",
      "Sales Executive",
      "Customer Support Agent",
      "HR Assistant",
      "Marketing Executive",
      "Field Technician",
      "Store Manager",
    ],
  },
  {
    section: "employee",
    category: "Healthcare Roles",
    icon: Stethoscope,
    basePrice: 1199,
    step: 90,
    unit: "/day",
    items: [
      "Home Nurse",
      "Ward Assistant",
      "Medical Care Assistant",
      "Physiotherapist",
      "Occupational Therapist",
      "Speech Therapist",
      "Nutritionist",
      "Medical Attendant",
      "Ambulance Assistant",
      "Patient Care Coordinator",
    ],
  },
  {
    section: "employee",
    category: "Specialized Experts",
    icon: Briefcase,
    basePrice: 1499,
    step: 120,
    unit: "/session",
    items: [
      "Lawyer",
      "Legal Consultant",
      "Chartered Accountant",
      "Tax Consultant",
      "Architect",
      "Interior Designer",
      "Real Estate Agent",
      "Insurance Advisor",
      "Investment Advisor",
      "Cybersecurity Consultant",
    ],
  },
  {
    section: "daily",
    category: "Construction & Fabrication",
    icon: Hammer,
    basePrice: 699,
    step: 60,
    unit: "",
    items: [
      "Masonry Work",
      "Tile Installation",
      "False Ceiling Service",
      "Welding Service",
      "Aluminum Fabrication",
      "Glass Installation",
      "Modular Kitchen Setup",
      "Roof Waterproofing",
      "Floor Polishing",
      "Boundary Wall Repair",
    ],
  },
  {
    section: "daily",
    category: "Agriculture & Farm Support",
    icon: TreePine,
    basePrice: 299,
    step: 28,
    unit: "",
    items: [
      "Farm Labor Assistance",
      "Irrigation Setup",
      "Soil Testing Assistance",
      "Compost Preparation",
      "Nursery Plant Delivery",
      "Drip Line Maintenance",
      "Greenhouse Cleaning",
      "Poultry Shed Cleaning",
      "Dairy Farm Support",
      "Harvesting Crew Booking",
    ],
  },
  {
    section: "daily",
    category: "Hospitality & Guest Services",
    icon: Hotel,
    basePrice: 549,
    step: 45,
    unit: "",
    items: [
      "Home Party Host",
      "Private Butler",
      "Guest House Cleaning",
      "Vacation Home Care",
      "Concierge Assistant",
      "Meal Prep for Guests",
      "Event Usher",
      "Temporary Front Desk Support",
      "Housekeeping on Call",
      "Property Check-in Support",
    ],
  },
  {
    section: "daily",
    category: "Emergency & Security",
    icon: Shield,
    basePrice: 599,
    step: 50,
    unit: "",
    items: [
      "Emergency Electrician Visit",
      "Emergency Plumber Visit",
      "24x7 Locksmith",
      "CCTV Repair",
      "Doorbell Camera Installation",
      "Fire Safety Check",
      "Home Alarm Setup",
      "Night Patrol Booking",
      "Women Safety Escort",
      "Senior Emergency Support",
    ],
  },
  {
    section: "employee",
    category: "Industrial & Manufacturing Staff",
    icon: Building2,
    basePrice: 1199,
    step: 95,
    unit: "/day",
    items: [
      "Machine Operator",
      "Assembly Line Worker",
      "Quality Inspector",
      "Warehouse Picker",
      "Forklift Operator",
      "Packing Line Supervisor",
      "Maintenance Fitter",
      "Inventory Controller",
      "Production Planner",
      "Shift Technician",
    ],
  },
  {
    section: "employee",
    category: "Retail & Hospitality Staff",
    icon: Utensils,
    basePrice: 1099,
    step: 85,
    unit: "/shift",
    items: [
      "Cashier",
      "Store Sales Associate",
      "Restaurant Steward",
      "Kitchen Helper",
      "Barista",
      "Hostess",
      "Hotel Reception Executive",
      "Housekeeping Staff",
      "Banquet Server",
      "Inventory Refill Staff",
    ],
  },
  {
    section: "employee",
    category: "Education & Training Staff",
    icon: GraduationCap,
    basePrice: 1299,
    step: 100,
    unit: "/session",
    items: [
      "Academic Tutor",
      "STEM Instructor",
      "Language Trainer",
      "Coding Mentor",
      "Soft Skills Coach",
      "Corporate Trainer",
      "Exam Prep Specialist",
      "Special Education Tutor",
      "Online Class Moderator",
      "School Lab Assistant",
    ],
  },
  {
    section: "employee",
    category: "Public Utility & Field Staff",
    icon: Truck,
    basePrice: 999,
    step: 78,
    unit: "/day",
    items: [
      "Field Survey Executive",
      "Meter Reading Staff",
      "Delivery Fleet Coordinator",
      "Collection Agent",
      "Utility Maintenance Worker",
      "Site Security Staff",
      "Dispatch Assistant",
      "Route Planner",
      "Community Support Worker",
      "On-site Documentation Staff",
    ],
  },
];

export const services = catalogGroups.flatMap(createServicesFromGroup);

const serviceIdSet = new Set(services.map((service) => service.id));

export const resolveServiceId = (serviceId = "") => {
  const cleaned = serviceId.trim().toLowerCase();
  if (!cleaned) return "";

  if (serviceIdSet.has(cleaned)) {
    return cleaned;
  }

  const alias = serviceIdAliases[cleaned];
  if (alias && serviceIdSet.has(alias)) {
    return alias;
  }

  return cleaned;
};

export const dailyLifeServices = services.filter((service) => service.section === "daily");
export const employeeServices = services.filter((service) => service.section === "employee");

export const serviceCategories = ["All", ...Array.from(new Set(services.map((service) => service.category)))];

export const getServiceById = (serviceId) => {
  const resolvedId = resolveServiceId(serviceId);
  return services.find((service) => service.id === resolvedId);
};

export const searchServices = (query) => {
  const q = query.trim().toLowerCase();
  if (!q) return services;

  return services.filter((service) => {
    const haystack = [service.title, service.description, service.category, ...service.tags]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
};
