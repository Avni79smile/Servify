import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  CheckCircle2,
  Compass,
  Lightbulb,
  ListChecks,
  MessageSquareText,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { employeeServices } from "@/data/services";

const careerAiImages = [
  {
    src: "https://images.pexels.com/photos/5439143/pexels-photo-5439143.jpeg?cs=srgb&dl=pexels-tima-miroshnichenko-5439143.jpg&fm=jpg",
    alt: "Candidate in a formal job interview",
    caption: "Interview readiness",
  },
  {
    src: "https://images.pexels.com/photos/5945799/pexels-photo-5945799.jpeg?cs=srgb&dl=pexels-theo-decker-5945799.jpg&fm=jpg",
    alt: "Professionals collaborating in a meeting room",
    caption: "Team collaboration",
  },
];

const splitKeywords = (text = "") =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 1);

const synonymMap = {
  teaching: ["tutor", "trainer", "coach", "education"],
  design: ["graphic", "logo", "creative", "ui", "ux"],
  coding: ["developer", "software", "app", "web", "tech"],
  writing: ["content", "copy", "seo", "blog"],
  marketing: ["seo", "social", "sales", "brand"],
  fitness: ["trainer", "wellness", "yoga", "health"],
  healthcare: ["caregiver", "nurse", "medical", "patient"],
  driving: ["driver", "delivery", "route", "transport"],
  management: ["manager", "supervisor", "coordinator", "operations"],
  support: ["assistant", "helpdesk", "customer", "service"],
};

const expandKeywords = (keywords) => {
  const expanded = new Set(keywords);
  keywords.forEach((item) => {
    Object.entries(synonymMap).forEach(([key, values]) => {
      if (item === key || values.includes(item)) {
        expanded.add(key);
        values.forEach((value) => expanded.add(value));
      }
    });
  });
  return Array.from(expanded);
};

const roleSkillMap = {
  teaching: ["communication", "lesson planning", "patience", "subject clarity"],
  design: ["visual design", "portfolio", "brand thinking", "client brief handling"],
  coding: ["problem solving", "javascript basics", "debugging", "deployment basics"],
  writing: ["content structure", "grammar", "research", "editing"],
  marketing: ["campaign planning", "analytics", "copywriting", "social media"],
  support: ["active listening", "conflict handling", "crm usage", "response speed"],
  management: ["team coordination", "planning", "stakeholder updates", "reporting"],
  fitness: ["assessment", "program design", "form correction", "consistency coaching"],
  healthcare: ["patient care", "documentation", "safety protocols", "empathy"],
  driving: ["route planning", "time discipline", "safety compliance", "customer etiquette"],
};

const getRoleSkills = (role) => {
  const haystack = `${role.title} ${role.category} ${role.description}`.toLowerCase();
  const matchedBuckets = Object.entries(roleSkillMap)
    .filter(([bucket]) => haystack.includes(bucket))
    .map(([, skills]) => skills)
    .flat();

  if (matchedBuckets.length > 0) {
    return Array.from(new Set(matchedBuckets)).slice(0, 6);
  }

  return ["communication", "client handling", "task execution", "time management"];
};

const buildSkillGapInsights = (results, interests, strengths) => {
  const profileKeywords = new Set(expandKeywords(splitKeywords(`${interests} ${strengths}`)));

  return results.slice(0, 3).map((role) => {
    const requiredSkills = getRoleSkills(role);
    const matched = requiredSkills.filter((skill) => {
      const tokens = splitKeywords(skill);
      return tokens.some((token) => profileKeywords.has(token));
    });
    const missing = requiredSkills.filter((skill) => !matched.includes(skill));
    const readiness = Math.max(20, Math.round((matched.length / requiredSkills.length) * 100));

    return {
      roleId: role.id,
      roleTitle: role.title,
      matched,
      missing,
      readiness,
    };
  });
};

const buildRoadmap = (topRole, experienceLevel, careerGoal, skillGapInsights) => {
  if (!topRole) {
    return [];
  }

  const prioritySkills = skillGapInsights[0]?.missing?.slice(0, 2) || ["client communication", "portfolio quality"];
  const levelPrefix = experienceLevel === "beginner" ? "Foundation" : experienceLevel === "intermediate" ? "Growth" : "Advanced";

  return [
    {
      phase: `${levelPrefix} - Week 1`,
      action: `Focus on ${prioritySkills.join(" and ")} through daily 60-minute practice.`,
      outcome: "Core weaknesses reduced and confidence improved.",
    },
    {
      phase: "Execution - Week 2 to 3",
      action: `Create 2 practical samples for ${topRole.title.toLowerCase()} and improve your profile summary.` ,
      outcome: "Portfolio and profile become application-ready.",
    },
    {
      phase: `Goal Sprint - ${careerGoal}`,
      action: "Apply consistently, request feedback, and iterate profile after each response.",
      outcome: `Faster movement toward your goal: ${careerGoal}.`,
    },
  ];
};

const resolveCareerConfusion = (question, topRole, skillGapInsights, roadmap) => {
  const text = (question || "").toLowerCase();
  const firstGap = skillGapInsights[0]?.missing?.[0] || "profile quality";
  const firstRoadmapStep = roadmap[0]?.action || "Start with one role and improve one key skill daily.";

  if (!text.trim()) {
    return {
      title: "Need clarity? Ask one career confusion",
      answer: "Examples: Which role should I start with? How do I switch fields? Am I ready to apply?",
      actions: ["Be specific about your concern", "Mention your current level and timeline"],
    };
  }

  if (/switch|change|transition|different field/.test(text)) {
    return {
      title: "Career switch strategy",
      answer: `Switch by targeting one bridge role first: ${topRole?.title || "support role"}. Build proof-of-work, then step up gradually.`,
      actions: [
        "Choose one target role for the next 30 days",
        `Work on ${firstGap} before applying broadly`,
      ],
    };
  }

  if (/ready|apply|application|eligible/.test(text)) {
    return {
      title: "Application readiness",
      answer: "You are ready to apply when your profile clearly shows strengths, proof of skill, and role-specific fit.",
      actions: [
        firstRoadmapStep,
        "Apply to 3-5 matching roles and track feedback",
      ],
    };
  }

  if (/salary|money|income|earn/.test(text)) {
    return {
      title: "Income growth path",
      answer: "Income improves fastest when you specialize in one role, improve ratings, and become consistent with delivery.",
      actions: [
        "Pick one niche and build repeatable quality",
        "Request reviews and update profile outcomes weekly",
      ],
    };
  }

  return {
    title: "Practical career guidance",
    answer: `Based on your current profile, start with ${topRole?.title || "a matching role"} and execute a short weekly plan.`,
    actions: [
      firstRoadmapStep,
      `Close your top gap first: ${firstGap}`,
    ],
  };
};

const getCareerRecommendations = (interests, strengths) => {
  const baseKeywords = splitKeywords(`${interests} ${strengths}`);
  const keywords = expandKeywords(baseKeywords);

  if (keywords.length === 0) {
    return [];
  }

  const scored = employeeServices.map((service) => {
    const haystack = [service.title, service.description, service.category, ...(service.tags || [])]
      .join(" ")
      .toLowerCase();

    let score = 0;
    const matched = [];

    keywords.forEach((keyword) => {
      if (haystack.includes(` ${keyword} `) || haystack.startsWith(`${keyword} `) || haystack.endsWith(` ${keyword}`)) {
        score += 3;
        matched.push(keyword);
      } else if (haystack.includes(keyword)) {
        score += 1;
      }
    });

    if (/manager|lead|supervisor|coordinator/.test(service.title.toLowerCase()) && keywords.some((item) => item.includes("manage"))) {
      score += 2;
    }

    return {
      ...service,
      score,
      matched: Array.from(new Set(matched)).slice(0, 4),
    };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
};

const CareerAI = () => {
  const [interests, setInterests] = useState("");
  const [strengths, setStrengths] = useState("");
  const [careerGoal, setCareerGoal] = useState("get first job");
  const [experienceLevel, setExperienceLevel] = useState("beginner");
  const [confusion, setConfusion] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  const results = useMemo(() => getCareerRecommendations(interests, strengths), [interests, strengths]);
  const skillGapInsights = useMemo(() => buildSkillGapInsights(results, interests, strengths), [results, interests, strengths]);
  const topRole = results[0] || null;
  const roadmap = useMemo(() => buildRoadmap(topRole, experienceLevel, careerGoal, skillGapInsights), [topRole, experienceLevel, careerGoal, skillGapInsights]);
  const confusionAnswer = useMemo(() => resolveCareerConfusion(confusion, topRole, skillGapInsights, roadmap), [confusion, topRole, skillGapInsights, roadmap]);
  const avgReadiness = skillGapInsights.length
    ? Math.round(skillGapInsights.reduce((sum, item) => sum + item.readiness, 0) / skillGapInsights.length)
    : 0;

  const sampleInterests = ["teaching kids", "design and creativity", "customer support", "fitness and wellness"];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % careerAiImages.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="container py-10 md:py-12">
      <div className="relative mb-7 overflow-hidden rounded-[2.25rem] border border-orange-100 bg-[radial-gradient(120%_120%_at_0%_0%,hsl(29_100%_98%)_0%,hsl(33_100%_97%)_40%,hsl(31_95%_94%)_100%)] p-6 shadow-[0_24px_60px_hsl(24_75%_62%_/_0.18)] md:p-8">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-orange-300/20 blur-3xl" />
        <p className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-700 shadow-sm">
          <WandSparkles className="h-3.5 w-3.5" /> Career AI
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="relative mt-1 overflow-hidden rounded-[1.65rem] border border-white/80 bg-slate-950 shadow-[0_20px_44px_hsl(24_75%_62%_/_0.18)]">
              <div className="relative">
                <img
                  src={careerAiImages[activeSlide].src}
                  alt={careerAiImages[activeSlide].alt}
                  className="h-[24rem] w-full object-cover transition-opacity duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(7,13,26,0.78)_0%,rgba(7,13,26,0.52)_44%,rgba(7,13,26,0.3)_100%)]" />
                <div className="absolute inset-x-0 top-0 p-6 text-white md:p-8">
                  <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-100 backdrop-blur">
                    <WandSparkles className="h-3.5 w-3.5" /> Career AI
                  </p>
                  <h1 className="mt-4 max-w-2xl font-heading text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_8px_26px_rgba(0,0,0,0.55)] md:text-6xl">
                    Interest Based Role Recommender
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-white/92 md:text-lg">
                    Tell us what you like and what you are good at. Career AI suggests the best Servify roles to apply for and helps you choose where to start.
                  </p>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <p className="mt-1 font-heading text-2xl font-bold drop-shadow-[0_8px_20px_rgba(0,0,0,0.55)]">{careerAiImages[activeSlide].caption}</p>
                </div>
              </div>

            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/80 bg-white/75 p-5 shadow-[0_16px_36px_hsl(24_75%_62%_/_0.12)] backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-orange-500 p-3 text-white shadow-[0_10px_20px_hsl(24_85%_40%_/_0.22)]">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Fast role matching</p>
                <p className="text-sm text-slate-600">Built for careers, applications, and service role discovery.</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-orange-600">Matches</p>
                <p className="mt-1 font-heading text-2xl font-bold text-slate-900">{results.length}</p>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-orange-600">Readiness</p>
                <p className="mt-1 font-heading text-2xl font-bold text-slate-900">{submitted ? `${avgReadiness}%` : "-"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-[0_14px_34px_hsl(24_75%_62%_/_0.12)]">
          <div className="mb-4 flex items-center gap-2 text-orange-700">
            <Bot className="h-4 w-4" />
            <p className="text-sm font-semibold">Describe your interests</p>
          </div>

          <label className="text-sm font-medium text-slate-700">Interests</label>
          <Textarea
            value={interests}
            onChange={(event) => setInterests(event.target.value)}
            placeholder="Example: teaching kids, design, social media, customer support"
            className="mt-2 min-h-[120px] rounded-2xl border-orange-100 bg-orange-50/30"
          />

          <label className="mt-4 block text-sm font-medium text-slate-700">Strengths (optional)</label>
          <Input
            value={strengths}
            onChange={(event) => setStrengths(event.target.value)}
            placeholder="Example: communication, patience, tech, field work"
            className="mt-2 rounded-2xl border-orange-100 bg-white"
          />

          <label className="mt-4 block text-sm font-medium text-slate-700">Career goal</label>
          <select
            value={careerGoal}
            onChange={(event) => setCareerGoal(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-orange-200"
          >
            <option value="get first job">Get first job</option>
            <option value="switch role">Switch role</option>
            <option value="grow income">Grow income</option>
            <option value="become specialist">Become specialist</option>
          </select>

          <label className="mt-4 block text-sm font-medium text-slate-700">Current level</label>
          <select
            value={experienceLevel}
            onChange={(event) => setExperienceLevel(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-orange-200"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          <label className="mt-4 block text-sm font-medium text-slate-700">Career confusion to solve</label>
          <Textarea
            value={confusion}
            onChange={(event) => setConfusion(event.target.value)}
            placeholder="Example: I want to switch to design but I don't know where to start"
            className="mt-2 min-h-[90px] rounded-2xl border-orange-100 bg-white"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {sampleInterests.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setInterests(item)}
                className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 transition-colors hover:bg-orange-100"
              >
                {item}
              </button>
            ))}
          </div>

          <Button
            className="mt-4 border-0 bg-orange-500 text-white shadow-[0_12px_24px_hsl(24_85%_40%_/_0.22)] hover:bg-orange-600"
            onClick={() => setSubmitted(true)}
          >
            <Sparkles className="mr-2 h-4 w-4" /> Get Full Career Guidance
          </Button>
        </div>

        <div className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-[0_14px_34px_hsl(24_75%_62%_/_0.12)]">
          <div className="mb-3 flex items-center gap-2 text-orange-700">
            <Target className="h-4 w-4" />
            <p className="text-sm font-semibold">Recommended roles</p>
          </div>

          {!submitted ? (
            <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 p-5 text-sm text-slate-600">
              <Lightbulb className="mb-2 h-5 w-5 text-orange-600" />
              Enter your interests and click the button to generate role suggestions.
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 p-5 text-sm text-slate-600">
              No strong match yet. Try adding specific interests like teaching, fitness, coding, driving, or healthcare.
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((role) => (
                <div key={role.id} className="rounded-2xl border border-orange-100 bg-gradient-to-br from-white to-orange-50/50 p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{role.title}</p>
                    <Badge className="border-0 bg-emerald-600 text-white shadow-sm">AI Match: {Math.min(99, role.score * 8)}%</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{role.category}</p>
                  <p className="mt-2 text-sm text-slate-600">{role.description}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(role.matched.length ? role.matched : ["career", "role"]).map((token) => (
                      <span key={`${role.id}-${token}`} className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                        {token}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button asChild size="sm" className="border-0 bg-orange-500 text-white shadow-[0_10px_22px_hsl(24_85%_40%_/_0.2)] hover:bg-orange-600">
                      <Link to="/career/portal/apply">
                        <BriefcaseBusiness className="mr-1 h-4 w-4" /> Apply in Career Portal
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {submitted && results.length > 0 && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-[0_14px_34px_hsl(24_75%_62%_/_0.12)]">
            <div className="mb-3 flex items-center gap-2 text-orange-700">
              <BrainCircuit className="h-4 w-4" />
              <p className="text-sm font-semibold">Skill-gap insights</p>
            </div>
            <div className="space-y-3">
              {skillGapInsights.map((item) => (
                <div key={item.roleId} className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{item.roleTitle}</p>
                    <Badge className="border-0 bg-orange-500 text-white">{item.readiness}% ready</Badge>
                  </div>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Strong now</p>
                  <p className="mt-1 text-sm text-slate-700">{item.matched.length ? item.matched.join(", ") : "Build core basics first"}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-red-600">Improve next</p>
                  <p className="mt-1 text-sm text-slate-700">{item.missing.slice(0, 3).join(", ")}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-[0_14px_34px_hsl(24_75%_62%_/_0.12)]">
            <div className="mb-3 flex items-center gap-2 text-orange-700">
              <Compass className="h-4 w-4" />
              <p className="text-sm font-semibold">Next-step roadmap</p>
            </div>
            <div className="space-y-3">
              {roadmap.map((step) => (
                <div key={step.phase} className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">{step.phase}</p>
                  <p className="mt-1 font-semibold text-slate-900">{step.action}</p>
                  <p className="mt-1 text-sm text-slate-600">{step.outcome}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-[0_14px_34px_hsl(24_75%_62%_/_0.12)] lg:col-span-2">
            <div className="mb-3 flex items-center gap-2 text-orange-700">
              <MessageSquareText className="h-4 w-4" />
              <p className="text-sm font-semibold">Career confusion resolver</p>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
              <p className="font-semibold text-slate-900">{confusionAnswer.title}</p>
              <p className="mt-1 text-sm text-slate-700">{confusionAnswer.answer}</p>
              <div className="mt-3 space-y-2">
                {confusionAnswer.actions.map((action) => (
                  <p key={action} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <span>{action}</span>
                  </p>
                ))}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "Am I ready to apply now?",
                "How do I switch roles safely?",
                "How can I increase earnings?",
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setConfusion(prompt)}
                  className="rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-orange-100 bg-white p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ListChecks className="h-4 w-4 text-orange-600" /> Practical next move
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Pick one role, close one major skill gap, and apply consistently for 7 days. Career confusion drops when you execute a focused plan.
              </p>
            </div>
          </div>
        </div>
      )}

      {submitted && results.length === 0 && (
        <div className="mt-4 rounded-[1.5rem] border border-orange-100 bg-white p-5 shadow-[0_12px_28px_hsl(24_75%_62%_/_0.12)]">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <AlertCircle className="h-4 w-4 text-orange-600" /> Need more specific inputs
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Add specific interests and strengths to unlock recommendations, skill-gap analysis, roadmap, and confusion resolution.
          </p>
        </div>
      )}
    </div>
  );
};

export default CareerAI;
