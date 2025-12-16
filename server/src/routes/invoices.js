import { Router } from "express";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import Invoice from "../models/Invoice.js";

const router = Router();

// Minimal upload handler for invoice attachments
const uploadDir = path.join(process.cwd(), "uploads");
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `invfile_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// Upload invoice attachment
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    res.status(201).json({ name: req.file.originalname || "file", path: `/uploads/${req.file.filename}` });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// List invoices with optional search and client filters
router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const clientId = req.query.clientId?.toString();
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (q) {
      Object.assign(filter, {
        $or: [
          { number: { $regex: q, $options: "i" } },
          { client: { $regex: q, $options: "i" } },
        ],
      });
    }
    const items = await Invoice.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get single invoice by id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let doc = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      doc = await Invoice.findById(id).lean();
    }
    // Fallback: allow lookup by invoice number when not a valid ObjectId
    if (!doc) {
      doc = await Invoice.findOne({ number: id }).lean();
    }
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Create invoice
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const number = body.number || String(Math.floor(Date.now() / 1000));
    const doc = await Invoice.create({ ...body, number });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update invoice
router.put("/:id", async (req, res) => {
  try {
    const doc = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete invoice
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let r = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      r = await Invoice.findByIdAndDelete(id);
    }
    if (!r) {
      r = await Invoice.findOneAndDelete({ number: id });
    }
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
