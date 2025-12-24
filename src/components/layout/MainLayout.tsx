import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { cn } from "@/lib/utils";

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMenuClick = () => {
    const isDesktop = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(min-width: 1024px)").matches;
    if (isDesktop) {
      setSidebarCollapsed((v) => !v);
    } else {
      setMobileOpen(true);
    }
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    if (mobileOpen) {
      const prev = body.style.overflow;
      body.style.overflow = "hidden";
      return () => { body.style.overflow = prev; };
    }
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div
        className={cn(
          "flex flex-col transition-all duration-300",
          sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"
        )}
      >
        <TopNav onMenuClick={handleMenuClick} />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
