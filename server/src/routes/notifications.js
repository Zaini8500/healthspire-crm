import { Router } from "express";
import mongoose from "mongoose";
import { authenticate } from "../middleware/auth.js";
import Notification from "../models/Notification.js";

const router = Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit || 20);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;
    const unreadOnly = String(req.query.unreadOnly || "").toLowerCase() === "true";

    const filter = { userId: req.user._id };
    if (unreadOnly) filter.readAt = { $exists: false };

    const items = await Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/unread-count", authenticate, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user._id, readAt: { $exists: false } });
    res.json({ count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/mark-read", authenticate, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const now = new Date();

    if (ids.length) {
      const objectIds = ids
        .map((x) => String(x))
        .filter((x) => mongoose.Types.ObjectId.isValid(x))
        .map((x) => new mongoose.Types.ObjectId(x));
      if (objectIds.length) {
        await Notification.updateMany(
          { _id: { $in: objectIds }, userId: req.user._id, readAt: { $exists: false } },
          { $set: { readAt: now } }
        );
      }
    } else {
      await Notification.updateMany(
        { userId: req.user._id, readAt: { $exists: false } },
        { $set: { readAt: now } }
      );
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
