import { Bell, Search, Menu, Plus, LayoutGrid, Briefcase, Monitor, Globe, Mail, Settings, CheckCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/api/auth";

interface TopNavProps {
  onMenuClick: () => void;
}

const API_BASE = (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname))
  ? "https://healthspire-crm.onrender.com"
  : "http://localhost:5000";

type MeUser = {
  _id?: string;
  id?: string;
  role?: string;
  email?: string;
  name?: string;
  avatar?: string;
  permissions?: string[];
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

type NotificationDoc = {
  _id: string;
  type?: string;
  title?: string;
  message?: string;
  href?: string;
  readAt?: string;
  createdAt?: string;
};

const timeAgo = (iso?: string) => {
  if (!iso) return "";
  try {
    const t = new Date(iso).getTime();
    const diff = Math.max(0, Date.now() - t);
    const min = Math.floor(diff / 60000);
    if (min < 1) return "Just now";
    if (min < 60) return `${min} min ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
    const day = Math.floor(hr / 24);
    return `${day} day${day === 1 ? "" : "s"} ago`;
  } catch {
    return "";
  }
};

export function TopNav({ onMenuClick }: TopNavProps) {
  const logoCandidates = [
    "/HealthSpire%20logo.png",
  ];
  const [logoSrc, setLogoSrc] = useState<string>(logoCandidates[0]);
  const onLogoError = () => {
    const i = logoCandidates.indexOf(logoSrc);
    if (i < logoCandidates.length - 1) setLogoSrc(logoCandidates[i + 1]);
  };
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const shownIdsRef = useRef<Set<string>>(new Set());

  const [me, setMe] = useState<MeUser | null>(() => {
    const stored = getStoredAuthUser();
    return stored ? { ...stored } : null;
  });

  const meInitials = useMemo(() => {
    const src = String(me?.name || me?.email || "").trim();
    if (!src) return "U";
    const out = src
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return out || "U";
  }, [me?.name, me?.email]);

  const loadMe = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/users/me`, { headers });
      const json = await res.json().catch(() => null);
      const u = (json as any)?.user;
      if (!res.ok || !u) return;
      setMe(u);

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
    } catch {
      // ignore
    }
  };

  const loadNotifications = async () => {
    if (typeof document !== "undefined" && (document as any).hidden) return;
    try {
      const headers = getAuthHeaders();
      const [countRes, listRes] = await Promise.all([
        fetch(`${API_BASE}/api/notifications/unread-count`, { headers }),
        fetch(`${API_BASE}/api/notifications?limit=10`, { headers }),
      ]);
      const countJson = await countRes.json().catch(() => null);
      const listJson = await listRes.json().catch(() => []);
      if (countRes.ok) setUnreadCount(Number(countJson?.count || 0) || 0);
      if (listRes.ok) setNotifications(Array.isArray(listJson) ? listJson : []);

      // Toast new unread notifications (best-effort)
      const unread = (Array.isArray(listJson) ? listJson : []).filter((n: any) => !n?.readAt);
      for (const n of unread) {
        const id = String(n?._id || "");
        if (!id || shownIdsRef.current.has(id)) continue;
        shownIdsRef.current.add(id);
        toast(String(n?.title || "Notification"), { description: String(n?.message || "") });
      }
    } catch {
      // ignore
    }
  };

  const markAllRead = async (ids: string[]) => {
    try {
      const headers = getAuthHeaders({ "Content-Type": "application/json" });
      await fetch(`${API_BASE}/api/notifications/mark-read`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ids }),
      });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadNotifications();
    void loadMe();
    const t = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    const unreadIds = notifications.filter((n) => !n.readAt).map((n) => n._id);
    if (!unreadIds.length) return;
    void markAllRead(unreadIds);
    setNotifications((cur) => cur.map((n) => (unreadIds.includes(n._id) ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifOpen]);

  const unreadLabel = useMemo(() => {
    if (unreadCount <= 0) return "";
    if (unreadCount > 99) return "99+";
    return String(unreadCount);
  }, [unreadCount]);
  const handleSignOut = () => {
    try {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_user");
    } catch {}
    navigate("/auth", { replace: true });
  };
  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-border flex items-center justify-between px-4 lg:px-6">
      {/* Left Section: menu + icon row */}
      <div className="flex items-center gap-4 text-muted-foreground">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="hidden lg:flex items-center gap-5">
          <CheckCircle className="w-5 h-5" />
          <LayoutGrid className="w-5 h-5" />
          <Briefcase className="w-5 h-5" />
          <Monitor className="w-5 h-5" />
        </div>
      </div>

      {/* Right Section: icons + avatar + brand */}
      <div className="flex items-center gap-3 text-muted-foreground">
        <Button variant="ghost" size="icon" className="hidden sm:flex"><Search className="w-5 h-5" /></Button>
        <Button variant="ghost" size="icon" className="hidden sm:flex"><Plus className="w-5 h-5" /></Button>
        <Button variant="ghost" size="icon" className="hidden md:flex"><Globe className="w-5 h-5" /></Button>
        <Button variant="ghost" size="icon" className="hidden md:flex"><Settings className="w-5 h-5" /></Button>
        {/* Notifications */}
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadLabel}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-card">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length ? notifications.map((notification) => (
              <DropdownMenuItem
                key={notification._id}
                className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                onSelect={(e) => {
                  e.preventDefault();
                  const href = String(notification.href || "");
                  if (href) navigate(href);
                }}
              >
                <div className="flex items-start gap-2 w-full">
                  {!notification.readAt && (
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-primary flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{notification.title || "Notification"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {notification.message || ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {timeAgo(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            )) : (
              <DropdownMenuItem className="text-sm text-muted-foreground justify-center">
                No notifications
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center text-sm text-primary cursor-pointer justify-center">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" className="hidden sm:flex"><Mail className="w-5 h-5" /></Button>

        {/* User Menu + Brand */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 px-2">
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={(() => {
                    const a = String(me?.avatar || "");
                    if (!a) return "/api/placeholder/64/64";
                    if (a.startsWith("<")) return "/api/placeholder/64/64";
                    if (a.startsWith("http")) return a;
                    const rel = a.startsWith("/") ? a : `/${a}`;
                    return `${API_BASE}${rel}`;
                  })()}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/api/placeholder/64/64"; }}
                />
                <AvatarFallback>{meInitials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-card">
            <DropdownMenuLabel>
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={(() => {
                      const a = String(me?.avatar || "");
                      if (!a) return "/api/placeholder/64/64";
                      if (a.startsWith("<")) return "/api/placeholder/64/64";
                      if (a.startsWith("http")) return a;
                      const rel = a.startsWith("/") ? a : `/${a}`;
                      return `${API_BASE}${rel}`;
                    })()}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/api/placeholder/64/64"; }}
                  />
                  <AvatarFallback>{meInitials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{me?.name || ""}</span>
                  <span className="text-xs text-muted-foreground truncate">{me?.email || ""}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                navigate("/profile");
              }}
            >
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={(e)=>{e.preventDefault(); handleSignOut();}} className="text-destructive">Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
