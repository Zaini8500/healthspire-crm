import { Router } from "express";
import Client from "../models/Client.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

// simple multer storage for avatar uploads
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, "..", "..");
const uploadDir = path.join(SERVER_ROOT, "uploads");
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `clientavatar_${req.params.id || Date.now()}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// List clients with optional search
router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const filter = q
      ? {
          $or: [
            { company: { $regex: q, $options: "i" } },
            { person: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { phone: { $regex: q, $options: "i" } },
          ],
        }
      : {};
    const items = await Client.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Create client
router.post("/", async (req, res) => {
  try {
    const doc = await Client.create(req.body);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get single client
router.get("/:id", async (req, res) => {
  try {
    const doc = await Client.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update client
router.put("/:id", async (req, res) => {
  try {
    const doc = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Upload & set client avatar
router.post("/:id/avatar", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const avatarPath = `/uploads/${req.file.filename}`;
    const doc = await Client.findByIdAndUpdate(req.params.id, { avatar: avatarPath }, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete client
router.delete("/:id", async (req, res) => {
  try {
    const r = await Client.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
