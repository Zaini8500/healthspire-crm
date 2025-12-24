import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/api/auth";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000";

type TaskDoc = {
  _id: string;
  title?: string;
  status?: string;
  priority?: string;
  activity?: Array<{ _id?: string; type?: string; message?: string; authorName?: string; createdAt?: string }>;
};

type ActivityRow = {
  id: string;
  taskId: string;
  taskTitle: string;
  message: string;
  authorName: string;
  createdAt?: string;
};

export default function TeamActivity() {
  const navigate = useNavigate();
  const [items, setItems] = useState<TaskDoc[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/tasks`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        setItems(Array.isArray(d) ? d : []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const rows: ActivityRow[] = useMemo(() => {
    const out: ActivityRow[] = [];
    for (const t of items) {
      const acts = Array.isArray(t.activity) ? t.activity : [];
      for (const a of acts) {
        out.push({
          id: String(a._id || `${t._id}_${a.message || a.type || Math.random()}`),
          taskId: t._id,
          taskTitle: t.title || "Task",
          message: a.message || a.type || "",
          authorName: a.authorName || "",
          createdAt: a.createdAt,
        });
      }
    }
    out.sort((x, y) => {
      const ax = x.createdAt ? new Date(x.createdAt).getTime() : 0;
      const ay = y.createdAt ? new Date(y.createdAt).getTime() : 0;
      return ay - ax;
    });
    return out;
  }, [items]);

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="p-4 pb-2 flex items-center justify-between">
          <CardTitle className="text-lg">Team Task Activity</CardTitle>
          <Button type="button" variant="outline" onClick={() => load()} disabled={loading}>Refresh</Button>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No recent updates</div>
          ) : (
            <div className="divide-y">
              {rows.slice(0, 200).map((r) => (
                <div key={r.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm">
                      <span className="font-medium">{r.authorName || "Member"}</span>
                      <span className="text-muted-foreground"> updated </span>
                      <button type="button" className="text-primary underline" onClick={() => navigate(`/tasks/${r.taskId}`)}>
                        {r.taskTitle}
                      </button>
                    </div>
                    {r.message ? (
                      <div className="text-sm text-muted-foreground mt-0.5">{r.message}</div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="whitespace-nowrap text-xs">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
