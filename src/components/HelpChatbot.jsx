import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { services } from "@/data/services";

const quickPrompts = [
    "How do I book a service?",
    "How do I apply for a job?",
    "How do I login or signup?",
    "What if a slot is booked?",
];
const detectServiceFromText = (message) => {
  const lowered = message.toLowerCase();
  return services.find((service) => lowered.includes(service.title.toLowerCase().split(" ")[0])) || null;
};

const getReply = (message) => {
    const text = message.toLowerCase();
  const service = detectServiceFromText(message);

  if (service && (text.includes("book") || text.includes("need") || text.includes("tomorrow"))) {
    return `Great choice. I found ${service.title}. You can book directly here: /book?service=${service.id}`;
  }

    if (text.includes("book") || text.includes("slot")) {
        return "Pick a service, open a professional profile, then choose from the free slots. If you are not logged in, you will need to signup or login before confirming the booking.";
    }
    if (text.includes("job") || text.includes("apply") || text.includes("career") || text.includes("work")) {
        return "Open the Career Portal, choose a service role, upload your photo, and submit your profile. After validation, your profile becomes visible on that service page.";
    }
    if (text.includes("login") || text.includes("signup") || text.includes("sign up")) {
        return "Use the Signup / Login button on the top right. Once signed in, you can book services and apply for career roles.";
    }
    if (text.includes("help") || text.includes("support")) {
        return "I can help with booking, login, career applications, and finding the right service or employee role.";
    }
    if (text.includes("contact") || text.includes("about")) {
        return "The app now uses this chatbot for help, so you can ask your question here anytime.";
    }
    return "I can help with service booking, career applications, login/signup, and slot availability. Try asking me one of the quick questions below.";
};
const HelpChatbot = () => {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([
        {
            id: "welcome",
            role: "assistant",
            text: "Hi, I’m Servify Assistant. Ask me about booking, career applications, login, or slots.",
        },
    ]);
    const unreadCount = useMemo(() => (open ? 0 : 1), [open]);
    useEffect(() => {
        const openHandler = () => setOpen(true);
        window.addEventListener("servify-open-chatbot", openHandler);
        return () => window.removeEventListener("servify-open-chatbot", openHandler);
    }, []);
    const pushAssistantReply = (text) => {
        setMessages((current) => [
            ...current,
            {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                text: getReply(text),
            },
        ]);
    };
    const handleSubmit = (event) => {
        event.preventDefault();
        const trimmed = input.trim();
        if (!trimmed)
            return;
        setMessages((current) => [
            ...current,
            { id: `user-${Date.now()}`, role: "user", text: trimmed },
        ]);
        setInput("");
        window.setTimeout(() => pushAssistantReply(trimmed), 180);
    };
    return (<>
      <div className="fixed bottom-5 right-5 z-50">
        <Button onClick={() => setOpen((prev) => !prev)} className="h-14 w-14 rounded-full border-0 bg-gradient-to-br from-primary to-coral-deep p-0 text-white shadow-[0_18px_45px_hsl(16_85%_40%_/_0.35)] transition-transform hover:scale-105" aria-label="Open help chatbot">
          <MessageCircle className="h-6 w-6"/>
          {unreadCount > 0 && (<span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-primary shadow">
              {unreadCount}
            </span>)}
        </Button>
      </div>

      <AnimatePresence>
        {open && (<motion.div initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.96 }} transition={{ duration: 0.2 }} className="fixed bottom-24 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-[1.75rem] border border-white/60 bg-[linear-gradient(180deg,hsl(33_100%_99%)_0%,hsl(30_80%_96%)_100%)] shadow-[0_30px_90px_hsl(16_85%_40%_/_0.25)]">
            <div className="grain-overlay"/>
            <div className="flex items-center justify-between bg-gradient-to-r from-primary to-coral-deep px-4 py-3 text-primary-foreground">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                  <Bot className="h-5 w-5"/>
                </div>
                <div>
                  <p className="font-heading text-sm font-bold">Servify Assistant</p>
                  <p className="text-xs text-white/80">Help with booking and careers</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-white/10" aria-label="Close help chatbot">
                <X className="h-5 w-5"/>
              </button>
            </div>

            <div className="max-h-[28rem] space-y-4 overflow-y-auto px-4 py-4">
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-coral-deep/5 p-4 text-xs text-slate-700 shadow-sm">
                <Sparkles className="mb-2 h-5 w-5 text-primary"/>
                <p className="font-semibold">Welcome! 👋</p>
                <p className="mt-1">Ask me anything about services, bookings, or the career portal.</p>
              </div>

              {messages.map((message, index) => (<motion.div key={message.id} initial={{ opacity: 0, y: 12, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: index * 0.05, type: "spring", stiffness: 200, damping: 20 }} className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "assistant" && (
                    <div className="mt-0.5 h-7 w-7 rounded-full bg-gradient-to-br from-primary to-coral-deep flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-white"/>
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === "user"
                    ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/30"
                    : "border border-slate-200 bg-white text-slate-800 shadow-md"}`}>
                    {message.text}
                  </div>
                  {message.role === "user" && (
                    <div className="mt-0.5 h-7 w-7 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-white">You</span>
                    </div>
                  )}
                </motion.div>))}

              <div className="flex flex-wrap gap-2 pt-2">
                {quickPrompts.map((prompt) => (<motion.button key={prompt} type="button" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => {
                    setMessages((current) => [
                        ...current,
                        { id: `user-${Date.now()}`, role: "user", text: prompt },
                    ]);
                    window.setTimeout(() => pushAssistantReply(prompt), 120);
                }} className="rounded-full border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-4 py-2 text-xs font-medium text-slate-700 transition-all hover:border-primary hover:text-primary hover:shadow-md hover:shadow-primary/20">
                    {prompt}
                  </motion.button>))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="border-t border-slate-100 bg-gradient-to-br from-white/95 to-slate-50/95 p-4">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all focus-within:border-primary focus-within:shadow-lg focus-within:shadow-primary/20">
                <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask me anything..." className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 placeholder:text-slate-400"/>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} type="submit" className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-coral-deep p-0 text-white transition-all hover:shadow-lg hover:shadow-primary/40">
                  <Send className="h-4 w-4"/>
                </motion.button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Button asChild variant="outline" size="sm">
                  <Link to="/services" onClick={() => setOpen(false)}>Browse services</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/career" onClick={() => setOpen(false)}>Open career portal</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/auth" onClick={() => setOpen(false)}>Login / signup</Link>
                </Button>
              </div>
            </form>
          </motion.div>)}
      </AnimatePresence>
    </>);
};
export default HelpChatbot;
