import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck, Sparkles, Clock4 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { loginUser, signupUser } from "@/lib/auth";
import { toast } from "sonner";

const SHOW_SUBSCRIPTION_POPUP_KEY = "servify_show_subscription_popup";

const normalizeEmail = (value) =>
  String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));

const getErrorMessage = (error, fallback) => {
  const message = error instanceof Error ? error.message : fallback;
  const lower = String(message || "").toLowerCase();

  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Too many auth attempts in a short time. Please wait a bit, then use Login.";
  }
  if (lower.includes("invalid login credentials") || lower.includes("invalid email or password")) {
    return "Invalid email or password.";
  }
  if (lower.includes("invalid email")) {
    return "Please enter a valid email like name@example.com (no spaces).";
  }

  return message || fallback;
};

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("redirect") || "/";
  }, [location.search]);

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPhotoFile, setSignupPhotoFile] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const handleSignup = async (event) => {
    event.preventDefault();
    const normalizedEmail = normalizeEmail(signupEmail);
    const trimmedName = signupName.trim();

    if (!trimmedName || !normalizedEmail || !signupPassword) {
      toast.error("Please fill all signup fields");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSignupLoading(true);
    try {
      // If account already exists, login succeeds and avoids repeated signup emails/rate-limit.
      try {
        await loginUser(normalizedEmail, signupPassword);
        localStorage.setItem(SHOW_SUBSCRIPTION_POPUP_KEY, "1");
        toast.success("Account already exists. Logged in successfully.");
        navigate(redirectPath);
        return;
      } catch {
        // Continue to signup for genuinely new users.
      }

      await signupUser(trimmedName, normalizedEmail, signupPassword, {
        avatarFile: signupPhotoFile,
      });
      localStorage.setItem(SHOW_SUBSCRIPTION_POPUP_KEY, "1");
      toast.success("Account created successfully");
      navigate(redirectPath);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to signup"));
    } finally {
      setSignupLoading(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    const normalizedEmail = normalizeEmail(loginEmail);

    if (!normalizedEmail || !loginPassword) {
      toast.error("Please enter email and password");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoginLoading(true);
    try {
      await loginUser(normalizedEmail, loginPassword);
      localStorage.setItem(SHOW_SUBSCRIPTION_POPUP_KEY, "1");
      toast.success("Login successful");
      navigate(redirectPath);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to login"));
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="container py-10 md:py-14">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="neo-panel-strong relative overflow-hidden rounded-3xl p-6 text-white md:p-7">
          <div className="grain-overlay opacity-35" />
          <p className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-3 py-1 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> WELCOME TO SERVIFY
          </p>
          <h1 className="mt-4 font-heading text-4xl font-bold leading-tight">Your all-in-one service account</h1>
          <p className="mt-3 text-white/90">
            Login once to unlock smart booking, provider tracking, and instant career application status.
          </p>

          <div className="mt-6 space-y-3 text-sm">
            <div className="rounded-2xl border border-white/30 bg-white/15 p-3">
              <p className="inline-flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> Secure account access</p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/15 p-3">
              <p className="inline-flex items-center gap-2 font-semibold"><Clock4 className="h-4 w-4" /> Fast booking confirmations</p>
            </div>
          </div>
        </section>

        <Card className="neo-panel rounded-3xl border-0 shadow-none">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Account Access</CardTitle>
            <CardDescription>Use your account to unlock booking and schedule confirmation.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signup" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-orange-50">
                <TabsTrigger value="signup">Signup</TabsTrigger>
                <TabsTrigger value="login">Login</TabsTrigger>
              </TabsList>

              <TabsContent value="signup" className="mt-5">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input placeholder="Enter your full name" value={signupName} onChange={(event) => setSignupName(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(event) => setSignupEmail(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" placeholder="Create a password" value={signupPassword} onChange={(event) => setSignupPassword(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Profile Photo (optional)</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(event) => setSignupPhotoFile(event.target.files?.[0] || null)}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={signupLoading}
                    className="w-full border-0 bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-70"
                  >
                    {signupLoading ? "Please wait..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="login" className="mt-5">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="you@example.com" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" placeholder="Enter your password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} />
                  </div>
                  <Button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full border-0 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-70"
                  >
                    {loginLoading ? "Please wait..." : "Login"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
export default Auth;
