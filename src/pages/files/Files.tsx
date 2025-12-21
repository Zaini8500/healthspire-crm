import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Home, Star, Search, FolderPlus, Upload, Info, X } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const API_BASE = "http://localhost:5000";

type FileDoc = {
  _id: string;
  leadId?: string;
  projectId?: string;
  employeeId?: string;
  name?: string;
  type?: string;
  path?: string;
  url?: string;
  size?: number;
  mime?: string;
  createdAt?: string;
};

function formatBytes(n?: number) {
  const v = Number(n || 0);
  if (!v) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(v) / Math.log(1024)));
  const num = v / Math.pow(1024, idx);
  return `${num.toFixed(num >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export default function Files({ leadId, clientId }: { leadId?: string; clientId?: string }) {
  const [selected, setSelected] = useState<string | null>(null);

  const [files, setFiles] = useState<FileDoc[]>([]);
  const [query, setQuery] = useState("");

  const [openAdd, setOpenAdd] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canUpload = Boolean(leadId || clientId);

  const loadFiles = async () => {
    if (!leadId && !clientId) {
      setFiles([]);
      return;
    }
    try {
      const params = new URLSearchParams();
      if (leadId) params.set("leadId", leadId);
      if (clientId) params.set("clientId", clientId);
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`${API_BASE}/api/files?${params.toString()}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load files");
      setFiles(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load files");
    }
  };

  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, clientId]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadFiles();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const pendingTotal = useMemo(() => pendingFiles.reduce((sum, f) => sum + (f.size || 0), 0), [pendingFiles]);

  const addPendingFiles = (list: FileList | File[]) => {
    const arr = Array.isArray(list) ? list : Array.from(list || []);
    if (!arr.length) return;
    setPendingFiles((prev) => {
      const next = [...prev];
      for (const f of arr) {
        const exists = next.some((x) => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified);
        if (!exists) next.push(f);
      }
      return next;
    });
  };

  const uploadOne = async (f: File) => {
    if (!leadId && !clientId) throw new Error("Missing leadId/clientId");
    const fd = new FormData();
    if (leadId) fd.append("leadId", leadId);
    if (clientId) fd.append("clientId", clientId);
    fd.append("name", f.name);
    fd.append("file", f);
    const res = await fetch(`${API_BASE}/api/files`, { method: "POST", body: fd });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || "Upload failed");
    return json as FileDoc;
  };

  const saveUploads = async () => {
    if (!canUpload) {
      toast.error("Open a client or lead first");
      return;
    }
    if (!pendingFiles.length) {
      toast.error("Select files first");
      return;
    }
    try {
      setUploading(true);
      for (const f of pendingFiles) {
        await uploadOne(f);
      }
      toast.success("Files uploaded");
      setPendingFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      setOpenAdd(false);
      await loadFiles();
    } catch (e: any) {
      toast.error(e?.message || "Failed to upload");
    } finally {
      setUploading(false);
    }
  };

  const onBrowse = () => inputRef.current?.click();

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.files?.length) addPendingFiles(e.dataTransfer.files);
  };

  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const removePending = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeUploaded = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/files/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to delete");
      toast.success("File deleted");
      await loadFiles();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left panel */}
        <Card className="md:col-span-2">
          <CardContent className="p-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search folder or file" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <nav className="space-y-1 text-sm">
              <button
                className="w-full flex items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/50 text-left border border-transparent data-[active=true]:bg-muted/60 data-[active=true]:border-muted"
                data-active={selected === "home" || selected === null}
                onClick={() => setSelected("home")}
              >
                <Home className="w-4 h-4 text-muted-foreground" />
                Home
              </button>
              <button
                className="w-full flex items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/50 text-left"
                onClick={() => setSelected("favorites")}
              >
                <Star className="w-4 h-4 text-muted-foreground" />
                Favorites
              </button>
            </nav>
          </CardContent>
        </Card>

        {/* Center panel */}
        <Card className="md:col-span-7">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm">
                <Home className="w-4 h-4 text-muted-foreground" />
                <span>Home</span>
              </div>
              <div className="flex items-center gap-2">
                {/* New folder dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <FolderPlus className="w-4 h-4" /> New folder
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                      <DialogTitle>New folder</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <Label className="md:text-right text-muted-foreground">Title</Label>
                      <Input placeholder="Title" className="md:col-span-4" />
                    </div>
                    <DialogFooter className="gap-2">
                      <Button variant="outline">Close</Button>
                      <Button>Save</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Add files dialog */}
                <Dialog open={openAdd} onOpenChange={setOpenAdd}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Upload className="w-4 h-4" /> Add files
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Add files</DialogTitle>
                    </DialogHeader>
                    <input
                      ref={inputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => addPendingFiles(e.target.files || [])}
                    />

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={onBrowse}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") onBrowse();
                      }}
                      onDrop={onDrop}
                      onDragOver={onDragOver}
                      className="rounded-lg border border-dashed p-6 min-h-[180px] flex flex-col items-center justify-center text-sm text-muted-foreground select-none cursor-pointer"
                    >
                      <div className="text-center">
                        Drag-and-drop documents here
                        <br />
                        (or click to browse...)
                      </div>

                      {!!pendingFiles.length && (
                        <div className="w-full mt-4 space-y-2 text-foreground">
                          <div className="text-xs text-muted-foreground">
                            {pendingFiles.length} file(s) selected • {formatBytes(pendingTotal)}
                          </div>
                          <div className="max-h-[160px] overflow-auto space-y-2">
                            {pendingFiles.map((f, idx) => (
                              <div key={`${f.name}_${f.lastModified}_${f.size}`} className="flex items-center justify-between gap-3 text-sm border rounded-md px-3 py-2">
                                <div className="min-w-0">
                                  <div className="truncate">{f.name}</div>
                                  <div className="text-xs text-muted-foreground">{formatBytes(f.size)}</div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    removePending(idx);
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter className="gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setOpenAdd(false);
                          setPendingFiles([]);
                          if (inputRef.current) inputRef.current.value = "";
                        }}
                        disabled={uploading}
                      >
                        Close
                      </Button>
                      <Button type="button" onClick={saveUploads} disabled={uploading || !pendingFiles.length || !canUpload}>
                        {uploading ? "Uploading..." : "Save"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="icon" aria-label="info">
                  <Info className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="h-[480px] md:h-[560px] border rounded-lg bg-muted/10 overflow-auto">
              {files.length ? (
                <div className="p-3 space-y-2">
                  {files.map((f) => {
                    const href = f.url || (f.path ? `${API_BASE}${f.path}` : "");
                    return (
                      <div key={f._id} className="flex items-center justify-between gap-3 bg-card border rounded-md px-3 py-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{f.name || "file"}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatBytes(f.size)}{f.mime ? ` • ${f.mime}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!href}
                            onClick={() => {
                              if (href) window.open(href, "_blank", "noopener,noreferrer");
                            }}
                          >
                            Open
                          </Button>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeUploaded(f._id)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No files yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right panel */}
        <Card className="md:col-span-3">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium">Details</h2>
              <Button variant="ghost" size="icon" aria-label="close details">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Separator className="my-3" />
            <div className="h-[480px] md:h-[520px] rounded-lg border bg-muted/10 flex items-center justify-center text-center text-sm text-muted-foreground p-4">
              Select a file or folder to view its details
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
