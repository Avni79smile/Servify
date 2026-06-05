import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, CheckCircle2, Mail, MapPin, Phone, Users, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { services } from "@/data/services";
import {
  getCareerApplications,
  getPendingCareerApplications,
  reviewCareerApplication,
} from "@/data/careers";
import { getCurrentUser, AUTH_CHANGE_EVENT } from "@/lib/auth";
import { getProfessionalsByService } from "@/data/professionals";
import { format } from "date-fns";

const AdminProviderDashboard = () => {
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [applications, setApplications] = useState(getCareerApplications());

  const syncData = () => {
    setCurrentUser(getCurrentUser());
    setApplications(getCareerApplications());
  };

  useEffect(() => {
    syncData();
    const syncHandler = () => syncData();
    window.addEventListener(AUTH_CHANGE_EVENT, syncHandler);
    window.addEventListener("servify-career-changed", syncHandler);
    window.addEventListener("storage", syncHandler);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, syncHandler);
      window.removeEventListener("servify-career-changed", syncHandler);
      window.removeEventListener("storage", syncHandler);
    };
  }, []);

  const handleReview = async (applicationId, status) => {
    await reviewCareerApplication(applicationId, status);
    syncData(); // Refresh from localStorage immediately
  };

  const serviceName = (id) => services.find((service) => service.id === id)?.title || id;

  const verifiedProfessionals = applications.filter(app => app.status === "approved");
  const pendingApplications = getPendingCareerApplications();

  if (!currentUser) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-heading text-4xl font-bold">Access Denied</h1>
        <p className="mt-2 text-muted-foreground">Please login as admin to access this page.</p>
        <Button asChild className="mt-4">
          <Link to="/auth">Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10 md:py-12">
      <div className="mb-6 overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-300 p-6 text-white shadow-[0_18px_42px_hsl(200_85%_40%_/_0.22)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Admin Dashboard</p>
        <h1 className="mt-2 font-heading text-3xl font-bold md:text-4xl">Manage Service Providers</h1>
        <p className="mt-2 text-sm text-white/90">Welcome back, {currentUser.name}</p>
      </div>

      <Tabs defaultValue="verified" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="verified">Verified Accounts ({verifiedProfessionals.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending Applications ({pendingApplications.length})</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="verified" className="space-y-4">
          <Card className="border-blue-100 shadow-[0_14px_34px_hsl(200_75%_62%_/_0.12)]">
            <CardHeader>
              <CardTitle className="font-heading text-2xl flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                Verified Service Providers
              </CardTitle>
              <CardDescription>Active professionals who have been approved and are providing services.</CardDescription>
            </CardHeader>
            <CardContent>
              {verifiedProfessionals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No verified professionals yet.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {verifiedProfessionals.map((application) => {
                    const service = services.find(s => s.id === application.serviceId);
                    return (
                      <Card key={application.id} className="border-green-100 bg-green-50/50">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          </div>
                          <CardTitle className="text-lg">{application.userName}</CardTitle>
                          <CardDescription>{serviceName(application.serviceId)}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="grid gap-2 text-sm text-muted-foreground">
                            <p className="flex items-center gap-2">
                              <Mail className="h-4 w-4" /> {application.userEmail}
                            </p>
                            <p className="flex items-center gap-2">
                              <Phone className="h-4 w-4" /> {application.phone}
                            </p>
                            <p className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" /> {application.city}
                            </p>
                          </div>
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground">
                              Approved on {format(new Date(application.updatedAt || application.createdAt), "MMM dd, yyyy")}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card className="border-orange-100 shadow-[0_14px_34px_hsl(24_75%_62%_/_0.12)]">
            <CardHeader>
              <CardTitle className="font-heading text-2xl flex items-center gap-2">
                <Users className="h-6 w-6 text-orange-600" />
                Pending Applications
              </CardTitle>
              <CardDescription>Review and approve new service provider applications.</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingApplications.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending applications.</p>
              ) : (
                <div className="space-y-4">
                  {pendingApplications.map((application) => (
                    <div key={application.id} className="rounded-2xl border border-orange-100 bg-white p-6 shadow-[0_8px_18px_hsl(24_75%_62%_/_0.08)]">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{application.userName}</h3>
                          <p className="text-sm text-muted-foreground">{serviceName(application.serviceId)} • {application.city}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="gap-2 border-0 bg-green-500 text-white hover:bg-green-600"
                            onClick={() => handleReview(application.id, "approved")}
                          >
                            <CheckCircle2 className="h-4 w-4" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2 border-red-300 text-red-700 hover:bg-red-50"
                            onClick={() => handleReview(application.id, "rejected")}
                          >
                            <XCircle className="h-4 w-4" /> Reject
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 mb-4">
                        <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> {application.userEmail}</p>
                        <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {application.phone}</p>
                        <p className="flex items-center gap-2"><BadgeCheck className="h-4 w-4" /> {application.experienceYears} years experience</p>
                        <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {application.city}</p>
                      </div>
                      <div className="border-t pt-4">
                        <p className="text-sm font-medium mb-2">Why they want to join:</p>
                        <p className="text-sm text-muted-foreground">{application.whyJoin}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-green-100 bg-green-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Verified
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-700">{verifiedProfessionals.length}</p>
                <p className="text-sm text-muted-foreground">Active service providers</p>
              </CardContent>
            </Card>

            <Card className="border-orange-100 bg-orange-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-600" />
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-orange-700">{pendingApplications.length}</p>
                <p className="text-sm text-muted-foreground">Awaiting approval</p>
              </CardContent>
            </Card>

            <Card className="border-blue-100 bg-blue-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5 text-blue-600" />
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-700">{applications.length}</p>
                <p className="text-sm text-muted-foreground">All applications</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-blue-100 shadow-[0_14px_34px_hsl(200_75%_62%_/_0.12)]">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Service Distribution</CardTitle>
              <CardDescription>Breakdown of verified professionals by service type.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => {
                  const serviceProfessionals = verifiedProfessionals.filter(app => app.serviceId === service.id);
                  return (
                    <div key={service.id} className="rounded-lg border p-4">
                      <h4 className="font-semibold">{service.title}</h4>
                      <p className="text-2xl font-bold text-blue-600 mt-2">{serviceProfessionals.length}</p>
                      <p className="text-sm text-muted-foreground">verified professionals</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminProviderDashboard;