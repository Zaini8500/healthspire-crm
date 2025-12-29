import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "next-themes";

// Runtime rewrite helper: only proxy to Render when NOT on localhost
const RENDER_BASE = "https://healthspire-crm.onrender.com";
const LOCAL_BASE = "http://localhost:5000";
const IS_LOCALHOST = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
if (typeof window !== "undefined" && typeof window.fetch === "function" && !IS_LOCALHOST) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const toStr = (v: any) => (typeof v === "string" ? v : v instanceof URL ? v.toString() : (v?.url ?? ""));
      const url = toStr(input);
      if (url && url.startsWith(LOCAL_BASE)) {
        const rewritten = RENDER_BASE + url.substring(LOCAL_BASE.length);
        if (typeof input === "string" || input instanceof URL) {
          return originalFetch(rewritten, init);
        }
        const req = new Request(rewritten, input as RequestInit);
        return originalFetch(req, init);
      }
    } catch {
      // fall through
    }
    return originalFetch(input as any, init);
  };
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <App />
  </ThemeProvider>
);
