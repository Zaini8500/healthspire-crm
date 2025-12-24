import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/api/auth";

const API_BASE = "http://localhost:5000";

type MeResponse = {
  user?: {
    _id?: string;
    id?: string;
    role?: string;
    email?: string;
    name?: string;
    avatar?: string;
    permissions?: string[];
  };
};

const getStoredAuthUser = (): any | null => {
  const raw = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const setStoredAuthUser = (next: any) => {
  const raw = JSON.stringify(next);
  if (localStorage.getItem("auth_user")) localStorage.setItem("auth_user", raw);
  if (sessionStorage.getItem("auth_user")) sessionStorage.setItem("auth_user", raw);
};

export default function ProfileSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [avatar, setAvatar] = useState<string>("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const fileRef = useRef<HTMLInputElement | null>(null);

  const initials = useMemo(() => {
    const src = String(name || email || "").trim();
    if (!src) return "U";
    const parts = src.split(" ").filter(Boolean);
    const out = parts.map((p) => p[0]).join("").slice(0, 2).toUpperCase();
    return out || "U";
  }, [name, email]);

  const loadMe = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/users/me`, { headers });
      const json: MeResponse = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error((json as any)?.error || "Failed to load profile");
      const u = json?.user || {};
      setName(String(u?.name || ""));
      setEmail(String(u?.email || ""));
      setRole(String(u?.role || ""));
      setAvatar(String(u?.avatar || ""));

      const stored = getStoredAuthUser() || {};
      const merged = {
        ...stored,
        id: u?.id || u?._id || stored?.id,
        _id: u?._id || stored?._id,
        role: u?.role || stored?.role,
        email: u?.email || stored?.email,
        name: u?.name || stored?.name,
        avatar: u?.avatar || stored?.avatar,
        permissions: u?.permissions || stored?.permissions,
      };
      setStoredAuthUser(merged);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMe();
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const headers = getAuthHeaders({ "Content-Type": "application/json" });
      const body: any = {
        name: name.trim(),
        email: email.trim(),
      };
      if (newPassword.trim()) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }

      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.error || "Failed to update profile");

      toast.success("Profile updated");
      setCurrentPassword("");
      setNewPassword("");
      await loadMe();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const uploadNewAvatar = async (file: File) => {
    setUploading(true);
    try {
      const headers = getAuthHeaders();
      const form = new FormData();
      form.append("avatar", file);
      const res = await fetch(`${API_BASE}/api/users/me/avatar`, {
        method: "POST",
        headers,
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.error || "Failed to upload avatar");
      toast.success("Avatar updated");
      await loadMe();
    } catch (e: any) {
      toast.error(e?.message || "Failed to upload avatar");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading profile…</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border">
              <AvatarImage src={avatar ? `${API_BASE}${avatar}` : "/api/placeholder/64/64"} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="text-sm font-medium">{name || ""}</div>
              <div className="text-xs text-muted-foreground">{email || ""}</div>
              <div className="text-xs text-muted-foreground">{role ? String(role).toUpperCase() : ""}</div>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="max-w-[240px]"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadNewAvatar(f);
                }}
                disabled={uploading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current password</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>New password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <div className="text-xs text-muted-foreground">Minimum 8 characters, include letters and numbers.</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={saveProfile} disabled={saving || uploading}>
              Save changes
            </Button>
            <Button variant="outline" onClick={() => void loadMe()} disabled={saving || uploading}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
