import express from "express";
import Estimate from "../models/Estimate.js";
import Lead from "../models/Lead.js";
import Proposal from "../models/Proposal.js";
import Contract from "../models/Contract.js";
import Project from "../models/Project.js";
import multer from "multer";
import path from "path";

const router = express.Router();

// Minimal upload handler for estimate attachments (PDF share)
const uploadDir = path.join(process.cwd(), "uploads");
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `estfile_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// Upload estimate attachment
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    res.status(201).json({ name: req.file.originalname || "file", path: `/uploads/${req.file.filename}` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List estimates with optional search and status
router.get("/", async (req, res) => {
  try {
    const { q = "", status, leadId } = req.query;
    const cond = {};
    if (q) cond.$or = [
      { number: new RegExp(q, "i") },
      { client: new RegExp(q, "i") },
    ];
    if (status && status !== "-") cond.status = status;
    if (leadId) cond.leadId = leadId;
    const list = await Estimate.find(cond).sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get one estimate
router.get("/:id", async (req, res) => {
  try {
    const row = await Estimate.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create estimate
router.post("/", async (req, res) => {
  try {
    const { client, clientId, leadId, estimateDate, validUntil, tax = 0, tax2 = 0, note = "", advancedAmount = 0, items = [], fileIds = [] } = req.body || {};
    if (!client) return res.status(400).json({ error: "client is required" });
    const number = String(Math.floor(Date.now() / 1000));
    const amount = Array.isArray(items) ? items.reduce((a, it) => a + Number(it.total || 0), 0) : 0;
    const doc = await Estimate.create({ number, client, clientId, leadId, estimateDate, validUntil, tax, tax2, note, advancedAmount, amount, items, fileIds });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update estimate (partial)
router.patch("/:id", async (req, res) => {
  try {
    const update = req.body || {};
    const pre = await Estimate.findById(req.params.id).lean();
    const doc = await Estimate.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });

    // If estimate accepted, perform conversions: lead -> sale, proposal -> contract, create project
    try {
      const becameAccepted = String(update?.status || "").toLowerCase() === "accepted" && String(pre?.status || "").toLowerCase() !== "accepted";
      if (becameAccepted) {
        // 1) Update lead status
        if (doc.leadId) {
          await Lead.findByIdAndUpdate(doc.leadId, { $set: { status: "Sale" } }).catch(() => null);
        }

        // 2) Create contract (prefer from latest proposal if exists)
        let contract = null;
        try {
          let sourceTitle = `Contract for Estimate ${doc.number || doc._id}`;
          let amount = Number(doc.amount || 0);
          let tax1 = Number(doc.tax || 0);
          let tax2 = Number(doc.tax2 || 0);
          const latestProp = doc.leadId ? await Proposal.findOne({ leadId: doc.leadId }).sort({ createdAt: -1 }).lean() : null;
          if (latestProp) {
            sourceTitle = latestProp.title || sourceTitle;
            amount = Number(latestProp.amount || amount);
            tax1 = Number(latestProp.tax1 || tax1);
            tax2 = Number(latestProp.tax2 || tax2);
          }
          contract = await Contract.create({
            clientId: doc.clientId || undefined,
            leadId: doc.leadId || undefined,
            client: doc.client || "",
            projectId: undefined,
            title: sourceTitle,
            amount,
            contractDate: new Date(),
            validUntil: doc.validUntil || undefined,
            status: "Open",
            tax1,
            tax2,
            note: doc.note || "",
          });
        } catch {}

        // 3) Create project
        try {
          const project = await Project.create({
            title: (doc?.note && doc.note.trim()) ? doc.note.trim().slice(0, 80) : `Project from Estimate ${doc.number || doc._id}`,
            clientId: doc.clientId || undefined,
            client: doc.client || "",
            price: Number(doc.amount || 0),
            start: new Date(),
            deadline: doc.validUntil || undefined,
            status: "Open",
          });
          if (contract && project?._id) {
            // back-link contract to project
            await Contract.findByIdAndUpdate(contract._id, { $set: { projectId: project._id } }).catch(() => null);
          }
        } catch {}
      }
    } catch {}
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete estimate
router.delete("/:id", async (req, res) => {
  try {
    await Estimate.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
