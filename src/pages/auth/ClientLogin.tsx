import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { clientLogin } from "@/services/authService";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function ClientLogin({ onSignUp }: { onSignUp: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErrors(null);
    if (!email.trim() || !password) {
      setErrors("Please enter credentials");
      return;
    }
    try {
      setLoading(true);
      const resp = await clientLogin(email.trim(), password);
      const storage: Storage = remember ? localStorage : sessionStorage;
      storage.setItem("auth_token", resp.token);
      storage.setItem("auth_user", JSON.stringify(resp.user));
      toast.success("Welcome back");
      setTimeout(() => {
        window.location.assign("/client");
      }, 150);
    } catch (e: any) {
      const msg = String(e?.message || "Login failed");
      setErrors(msg);
      setAttempts((a) => a + 1);
    } finally {
      setLoading(false);
    }
  };

  const rateLimited = attempts >= 3;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label>Email</Label>
        <Input placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
      </div>
      <div className="space-y-1">
        <Label>Password</Label>
        <div className="relative">
          <Input
            type={showPwd ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={() => setShowPwd((s) => !s)}
            aria-label="Toggle password visibility"
          >
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox checked={remember} onCheckedChange={(v) => setRemember(Boolean(v))} id="remember_client" />
          <Label htmlFor="remember_client">Remember me</Label>
        </div>
        <Button variant="link" type="button" onClick={onSignUp}>
          Sign up
        </Button>
      </div>

      {errors && <div className="text-destructive text-sm">{errors}</div>}
      {rateLimited && <div className="text-xs text-warning">Too many attempts. Please wait a moment before trying again.</div>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
          </span>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
