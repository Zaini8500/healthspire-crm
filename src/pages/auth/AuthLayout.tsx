import { useState } from "react";
import TeamLogin from "./TeamLogin";
import ClientLogin from "./ClientLogin";
import ClientSignup from "./ClientSignup";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building } from "lucide-react";

export default function AuthLayout() {
  const logoCandidates = ["/HealthSpire%20logo.png"]; 
  const [logoSrc, setLogoSrc] = useState(logoCandidates[0]);
  const onLogoError = () => { const i = logoCandidates.indexOf(logoSrc); if (i < logoCandidates.length - 1) setLogoSrc(logoCandidates[i+1]); };

  const [clientMode, setClientMode] = useState<"login" | "signup">("login");
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="flex flex-col items-center justify-center mb-8">
          <img src={logoSrc} onError={onLogoError} alt="HealthSpire" className="h-28 w-auto" />
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-center text-gray-900">Welcome Back</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Tabs defaultValue="team" className="w-full">
              <TabsList className="w-full grid grid-cols-2 mb-6">
                <TabsTrigger value="team" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Team Login
                </TabsTrigger>
                <TabsTrigger value="client" className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Client Login
                </TabsTrigger>
              </TabsList>
              <TabsContent value="team" className="mt-0">
                <TeamLogin />
              </TabsContent>
              <TabsContent value="client" className="mt-0">
                {clientMode === "signup" ? (
                  <ClientSignup />
                ) : (
                  <ClientLogin onSignUp={() => setClientMode("signup")} />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
