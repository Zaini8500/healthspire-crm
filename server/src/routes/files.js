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
    const owner = req.body.projectId
      ? `proj_${req.body.projectId}`
      : req.body.leadId
      ? `lead_${req.body.leadId}`
      : req.body.employeeId
      ? `emp_${req.body.employeeId}`
      : "misc";
    cb(null, `file_${owner}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

router.get("/", async (req, res) => {
  const q = req.query.q?.toString().trim();
  const employeeId = req.query.employeeId?.toString();
  const projectId = req.query.projectId?.toString();
  const leadId = req.query.leadId?.toString();
  const clientId = req.query.clientId?.toString();
  const ticketId = req.query.ticketId?.toString();
  const subscriptionId = req.query.subscriptionId?.toString();
  const filter = {};
  if (employeeId) filter.employeeId = employeeId;
  if (projectId) filter.projectId = projectId;
  if (leadId) filter.leadId = leadId;
  if (clientId) filter.clientId = clientId;
  if (ticketId) filter.ticketId = ticketId;
  if (subscriptionId) filter.subscriptionId = subscriptionId;
  if (q) filter.$or = [{ name: { $regex: q, $options: "i" } }];
  const items = await File.find(filter).sort({ createdAt: -1 }).lean();
  res.json(items);
});

router.post("/", upload.single("file"), async (req, res) => {
  try {
    const hasMeta = Boolean(req.body?.url || req.body?.path || req.body?.name);
    if (!req.file && !hasMeta) return res.status(400).json({ error: "No file uploaded" });

    const doc = await File.create({
      employeeId: req.body.employeeId,
      projectId: req.body.projectId,
      leadId: req.body.leadId,
      clientId: req.body.clientId,
      ticketId: req.body.ticketId,
      subscriptionId: req.body.subscriptionId,
      name: req.body.name || req.file?.originalname || "file",
      type: req.body.type || "",
      path: req.file ? `/uploads/${req.file.filename}` : (req.body.path || ""),
      url: req.body.url || "",
      size: req.file ? (req.file.size || 0) : (Number(req.body.size) || 0),
      mime: req.file ? (req.file.mimetype || "") : (req.body.mime || ""),
      uploadedBy: req.body.uploadedBy || "",
      description: req.body.description || "",
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
