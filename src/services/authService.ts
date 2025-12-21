const API_BASE = "http://localhost:5000";

export type AdminLoginResponse = { token: string; user: { id: string; email: string; role: string } };

export type TeamLoginResponse = { token: string; user: { id: string; email: string; role: string; name?: string } };

export type ClientLoginResponse = { token: string; user: { id: string; email: string; role: string; name?: string }; client?: any };

export async function adminLogin(identifier: string, password: string): Promise<AdminLoginResponse> {
  const post = (path: string) =>
    fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

  let res = await post(`/api/auth/admin/login`);
  if (res.status === 404) {
    // Fallback alias for some environments
    res = await post(`/api/auth/admin/login1`);
  }
  if (!res.ok) {
    const e = await res.json().catch(()=>({ error: "Login failed" }));
    throw new Error(e?.error || "Login failed");
  }
  return (await res.json()) as AdminLoginResponse;
}

export async function teamLogin(identifier: string, password: string): Promise<TeamLoginResponse> {
  const res = await fetch(`${API_BASE}/api/auth/team/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: "Login failed" }));
    throw new Error(e?.error || "Login failed");
  }
  return (await res.json()) as TeamLoginResponse;
}

export async function clientLogin(email: string, password: string): Promise<ClientLoginResponse> {
  const res = await fetch(`${API_BASE}/api/auth/client/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: "Login failed" }));
    throw new Error(e?.error || "Login failed");
  }
  return (await res.json()) as ClientLoginResponse;
}

export async function emailAvailable(email: string): Promise<boolean> {
  const url = `${API_BASE}/api/auth/email-available?email=${encodeURIComponent(email)}`;
  const res = await fetch(url);
  if (!res.ok) return false;
  const d = await res.json().catch(()=>({ available: false }));
  return !!d?.available;
}

export async function clientRegister(payload: {
  type?: "org" | "person";
  companyName?: string;
  clientName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  password: string;
  industry?: string;
  autoLogin?: boolean;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/api/auth/client/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const e = await res.json().catch(()=>({ error: "Signup failed" }));
    throw new Error(e?.error || "Signup failed");
  }
  return res.json();
}
