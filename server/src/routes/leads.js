import { Router } from "express";
import Lead from "../models/Lead.js";
import Employee from "../models/Employee.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

const getMyEmployeeId = async (req) => {
  const email = req.user?.email;
  if (!email) return null;
  const emp = await Employee.findOne({ email }).select("_id").lean();
  return emp ? String(emp._id) : null;
};

const ensureLeadAccess = async (req, res, lead) => {
  if (!lead) return true;
  if (req.user?.role === "admin") return true;
  if (req.user?.role === "marketer") {
    const myEmployeeId = await getMyEmployeeId(req);
    if (!myEmployeeId) {
      res.status(403).json({ error: "Access denied" });
      return false;
    }
    if (String(lead.ownerId || "") !== myEmployeeId) {
      res.status(403).json({ error: "Access denied" });
      return false;
    }
    return true;
  }
  res.status(403).json({ error: "Access denied" });
  return false;
};

function toStr(v) {
  return v === undefined || v === null ? "" : v.toString();
}

function cleanPayload(body) {
  const p = {};
  if (body?.name !== undefined) p.name = toStr(body.name).trim();
  if (body?.company !== undefined) p.company = toStr(body.company);
  if (body?.email !== undefined) p.email = toStr(body.email);
  if (body?.phone !== undefined) p.phone = toStr(body.phone);
  if (body?.type !== undefined) p.type = toStr(body.type) || "Organization";
  if (body?.ownerId !== undefined) p.ownerId = body.ownerId || undefined;
  if (body?.status !== undefined) p.status = toStr(body.status) || "New";
  if (body?.source !== undefined) p.source = toStr(body.source);
  if (body?.value !== undefined) p.value = toStr(body.value) || "-";
  if (body?.lastContact !== undefined) p.lastContact = body.lastContact ? new Date(body.lastContact) : undefined;
  if (body?.address !== undefined) p.address = toStr(body.address);
  if (body?.city !== undefined) p.city = toStr(body.city);
  if (body?.state !== undefined) p.state = toStr(body.state);
  if (body?.zip !== undefined) p.zip = toStr(body.zip);
  if (body?.country !== undefined) p.country = toStr(body.country);
  if (body?.website !== undefined) p.website = toStr(body.website);
  if (body?.vatNumber !== undefined) p.vatNumber = toStr(body.vatNumber);
  if (body?.gstNumber !== undefined) p.gstNumber = toStr(body.gstNumber);
  if (body?.currency !== undefined) p.currency = toStr(body.currency);
  if (body?.currencySymbol !== undefined) p.currencySymbol = toStr(body.currencySymbol);
  if (body?.labels !== undefined) p.labels = Array.isArray(body.labels) ? body.labels : [];
  return p;
}

router.get("/", authenticate, async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const ownerId = req.query.ownerId?.toString();
    const status = req.query.status?.toString();
    const source = req.query.source?.toString();
    const labelId = req.query.labelId?.toString();
    const createdFrom = req.query.createdFrom?.toString();
    const createdTo = req.query.createdTo?.toString();

    const filter = {};
    if (req.user.role === "marketer") {
      const myEmployeeId = await getMyEmployeeId(req);
      if (!myEmployeeId) return res.json([]);
      filter.ownerId = myEmployeeId;
    } else if (req.user.role === "admin") {
      if (ownerId) filter.ownerId = ownerId;
    } else {
      return res.status(403).json({ error: "Access denied" });
    }
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (labelId) filter.labels = labelId;
    if (createdFrom || createdTo) {
      filter.createdAt = {};
      if (createdFrom) filter.createdAt.$gte = new Date(createdFrom);
      if (createdTo) filter.createdAt.$lte = new Date(createdTo);
    }
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { company: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }

    const items = await Lead.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "marketer") {
      return res.status(403).json({ error: "Access denied" });
    }
    const payload = cleanPayload(req.body);
    if (!payload.name) return res.status(400).json({ error: "name is required" });
    if (req.user.role === "marketer") {
      const myEmployeeId = await getMyEmployeeId(req);
      if (!myEmployeeId) return res.status(403).json({ error: "Access denied" });
      payload.ownerId = myEmployeeId;
    }
    if (!payload.initials && payload.name) {
      payload.initials = payload.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    const doc = await Lead.create(payload);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/bulk", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "marketer") {
      return res.status(403).json({ error: "Access denied" });
    }
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: "No items provided" });
    const cleaned = items
      .map((x) => cleanPayload(x))
      .filter((x) => x.name);
    if (req.user.role === "marketer") {
      const myEmployeeId = await getMyEmployeeId(req);
      if (!myEmployeeId) return res.status(403).json({ error: "Access denied" });
      for (const c of cleaned) c.ownerId = myEmployeeId;
    }
    const inserted = await Lead.insertMany(cleaned, { ordered: false });
    res.status(201).json({ ok: true, inserted: inserted.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/:id", authenticate, async (req, res) => {
  try {
    const doc = await Lead.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    if (!(await ensureLeadAccess(req, res, doc))) return;
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", authenticate, async (req, res) => {
  try {
    const payload = cleanPayload(req.body);
    const existing = await Lead.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!(await ensureLeadAccess(req, res, existing))) return;
    if (req.user.role === "marketer") {
      delete payload.ownerId;
    }
    const doc = await Lead.findByIdAndUpdate(req.params.id, payload, { new: true }).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  try {
    const existing = await Lead.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!(await ensureLeadAccess(req, res, existing))) return;
    const r = await Lead.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
