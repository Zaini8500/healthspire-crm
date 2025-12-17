import { Router } from "express";
import multer from "multer";
import path from "path";
import File from "../models/File.js";

const router = Router();

const uploadDir = path.join(process.cwd(), "uploads");
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const prefix = req.body.leadId ? `leadfile_${req.body.leadId}` : `empfile_${req.body.employeeId || Date.now()}`;
    cb(null, `${prefix}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

router.get("/", async (req, res) => {
  const q = req.query.q?.toString().trim();
  const employeeId = req.query.employeeId?.toString();
  const leadId = req.query.leadId?.toString();
  const filter = {};
  if (employeeId) filter.employeeId = employeeId;
  if (leadId) filter.leadId = leadId;
  if (q) filter.$or = [{ name: { $regex: q, $options: "i" } }];
  const items = await File.find(filter).sort({ createdAt: -1 }).lean();
  res.json(items);
});

router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const doc = await File.create({
      employeeId: req.body.employeeId,
      leadId: req.body.leadId,
      name: req.body.name || req.file.originalname || "file",
      path: `/uploads/${req.file.filename}`,
      size: req.file.size || 0,
      mime: req.file.mimetype || "",
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const r = await File.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
