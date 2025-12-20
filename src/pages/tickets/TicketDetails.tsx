import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CheckCircle2, MoreHorizontal, Paperclip, Send, Tags } from "lucide-react";
import { toast } from "sonner";

const API_BASE = "http://localhost:5000";

type TicketMessage = {
  text?: string;
  createdBy?: string;
  createdAt?: string;
};

type TicketDoc = {
  _id: string;
  ticketNo?: number;
  title: string;
  client?: string;
  clientId?: string;
  description?: string;
  requestedBy?: string;
  type?: string;
  labels?: string[];
  assignedTo?: string;
  status?: string;
  lastActivity?: string;
  createdAt?: string;
  messages?: TicketMessage[];
};

export default function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<TicketDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");
  const [labelSaving, setLabelSaving] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const ticketTitle = useMemo(() => {
    if (!ticket) return "Ticket";
    const no = ticket.ticketNo ? `#${ticket.ticketNo}` : "";
    return `Ticket ${no}${ticket.title ? ` - ${ticket.title}` : ""}`.trim();
  }, [ticket]);

  const statusBadge = useMemo(() => {
    const s = (ticket?.status || "open").toLowerCase();
    if (s === "closed") return { label: "Closed", className: "bg-muted text-muted-foreground" };
    return { label: "New", className: "bg-amber-400 text-white" };
  }, [ticket]);

  const loadTicket = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/tickets/${id}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load ticket");
      setTicket(json);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggleClosed = async () => {
    if (!id || !ticket) return;
    try {
      const nextStatus = (ticket.status || "open") === "closed" ? "open" : "closed";
      const res = await fetch(`${API_BASE}/api/tickets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, lastActivity: new Date().toISOString() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to update ticket");
      setTicket(json);
      toast.success(nextStatus === "closed" ? "Marked as closed" : "Re-opened");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update ticket");
    }
  };

  const addLabel = async () => {
    if (!id || !ticket) return;
    const name = labelDraft.trim();
    if (!name) return;
    try {
      setLabelSaving(true);
      const current = Array.isArray(ticket.labels) ? ticket.labels : [];
      const next = current.includes(name) ? current : [...current, name];
      const res = await fetch(`${API_BASE}/api/tickets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labels: next, lastActivity: new Date().toISOString() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to add label");
      setTicket(json);
      setLabelDraft("");
      toast.success("Label added");
    } catch (e: any) {
      toast.error(e?.message || "Failed to add label");
    } finally {
      setLabelSaving(false);
    }
  };

  const sendMessage = async () => {
    if (!id) return;
    const text = msg.trim();
    if (!text) return;
    try {
      setSending(true);
      const res = await fetch(`${API_BASE}/api/tickets/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, createdBy: "" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to send");
      setTicket(json);
      setMsg("");
      toast.success("Sent");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const saveAsNote = async () => {
    if (!ticket) return;
    const text = msg.trim();
    if (!text) {
      toast.error("Write a comment first");
      return;
    }
    try {
      setSavingNote(true);
      const title = `${ticket.ticketNo ? `Ticket #${ticket.ticketNo}` : "Ticket"}${ticket.title ? ` - ${ticket.title}` : ""}`.trim();
      const res = await fetch(`${API_BASE}/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, text, private: true }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to save note");
      toast.success("Saved as note");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save note");
    } finally {
      setSavingNote(false);
    }
  };

  const inCount = (ticket?.messages || []).length;
  const outCount = 0;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            Back
          </Button>
          <h1 className="text-base font-semibold">{ticketTitle}</h1>
        </div>
        <Button onClick={toggleClosed} disabled={!ticket} className="gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {(ticket?.status || "open") === "closed" ? "Mark as Open" : "Mark as Closed"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className={`text-xs px-3 py-1 rounded-full ${statusBadge.className}`}>{statusBadge.label}</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <button type="button" className="hover:underline inline-flex items-center gap-2" onClick={() => {}}>
                <Tags className="w-4 h-4" />
                Add Label
              </button>
              <span className="text-muted-foreground">|</span>
              <span>{ticket?.assignedTo || "-"}</span>
              <span>{ticket?.lastActivity ? `${new Date(ticket.lastActivity).toLocaleString()}` : ""}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Input
              placeholder="Add label..."
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              className="max-w-xs"
              disabled={!ticket}
            />
            <Button variant="outline" size="sm" onClick={addLabel} disabled={!ticket || labelSaving || !labelDraft.trim()}>
              {labelSaving ? "Saving..." : "Add"}
            </Button>
            <div className="flex items-center gap-1 flex-wrap">
              {(ticket?.labels || []).map((l) => (
                <span key={l} className="text-xs px-2 py-0.5 rounded-full border">
                  {l}
                </span>
              ))}
            </div>
          </div>

          <Card>
            <CardContent className="p-4 space-y-3">
              {loading ? (
                <div className="text-muted-foreground">Loading...</div>
              ) : ticket ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-semibold">
                      {(ticket.client || "M").slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{ticket.client || "Mindspire"}</div>
                      <div className="text-xs text-muted-foreground">{ticket.createdAt ? `Today at ${new Date(ticket.createdAt).toLocaleTimeString()}` : ""}</div>
                      <div className="text-sm mt-1 whitespace-pre-wrap">{ticket.description || ""}</div>
                    </div>
                  </div>

                  <div className="border rounded-md overflow-hidden">
                    <Textarea
                      placeholder="Write a comment..."
                      value={msg}
                      onChange={(e) => setMsg(e.target.value)}
                      className="min-h-[180px] border-0 rounded-none"
                    />
                    <div className="flex items-center justify-between p-3 border-t bg-muted/20 flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.message("Upload not implemented yet")}
                          disabled={!ticket}
                        >
                          <Paperclip className="w-4 h-4" />
                          Upload File
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => toast.message("Templates not implemented yet")} disabled={!ticket}>
                          Template
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={saveAsNote} disabled={!ticket || savingNote || !msg.trim()}>
                          {savingNote ? "Saving..." : "Save as note"}
                        </Button>
                        <Button size="sm" className="gap-2" onClick={sendMessage} disabled={sending || !msg.trim()}>
                          <Send className="w-4 h-4" />
                          {sending ? "Sending..." : "Send"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(ticket.messages || []).length ? (
                      (ticket.messages || []).map((m, idx) => (
                        <div key={idx} className="rounded-md border p-3">
                          <div className="text-xs text-muted-foreground">
                            {(m.createdBy || "") || ""}{m.createdAt ? ` • ${new Date(m.createdAt).toLocaleString()}` : ""}
                          </div>
                          <div className="text-sm whitespace-pre-wrap">{m.text || ""}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground text-sm">No messages</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground">Ticket not found</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">Ticket info</div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="more">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => toast.message("Not implemented")}>Action</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="rounded-md border p-2 text-center text-sm">
                {ticket?.type || "general"}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border p-3 text-center">
                  <div className="text-xs text-muted-foreground">In messages</div>
                  <div className="text-lg font-semibold text-red-500">{inCount}</div>
                </div>
                <div className="rounded-md border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Out messages</div>
                  <div className="text-lg font-semibold text-blue-600">{outCount}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {ticket?.createdAt ? `Today at ${new Date(ticket.createdAt).toLocaleTimeString()}` : ""}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium">Assigned</div>
              <div className="text-sm text-muted-foreground mt-1">{ticket?.assignedTo || "-"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Tasks</div>
                <Button variant="ghost" size="icon-sm" aria-label="add task" onClick={() => toast.message("Add task not implemented yet")}>
                  +
                </Button>
              </div>
              <button type="button" className="text-sm text-primary hover:underline" onClick={() => toast.message("Add task not implemented yet")}>
                + Add task
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
