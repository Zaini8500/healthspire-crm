import { Router } from "express";
import User from "../models/User.js";
import Employee from "../models/Employee.js";
import Client from "../models/Client.js";
import { authenticate, isAdmin } from "../middleware/auth.js";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, "..", "..");
const uploadDir = path.join(SERVER_ROOT, "uploads");
const avatarStorage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `avatar_user_${String(req.user?._id || "user")}_${Date.now()}${ext}`);
  },
});
const uploadAvatar = multer({ storage: avatarStorage });

router.get("/me", authenticate, async (req, res) => {
  try {
    const user = typeof req.user?.toObject === "function" ? req.user.toObject() : req.user;
    const role = String(user?.role || "").toLowerCase();

    let client = null;
    let employee = null;

    if (role === "client" && user?.clientId) {
      client = await Client.findById(user.clientId).lean();
    }

    if (role === "staff") {
      const email = String(user?.email || "").toLowerCase().trim();
      if (email) employee = await Employee.findOne({ email }).lean();
    }

    const displayName =
      String(user?.name || "").trim() ||
      (client ? String(client.company || client.person || "").trim() : "") ||
      (employee ? String(employee.name || "").trim() : "") ||
      String(user?.email || "").trim();

    const avatar =
      String(user?.avatar || "").trim() ||
      (client ? String(client.avatar || "").trim() : "") ||
      (employee ? String(employee.avatar || "").trim() : "");

    res.json({
      user: {
        _id: user?._id,
        id: user?._id,
        role: user?.role,
        email: user?.email,
        name: displayName,
        avatar,
        clientId: user?.clientId,
        permissions: user?.permissions || [],
      },
      client,
      employee,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean(false);
    if (!user) return res.status(404).json({ error: "User not found" });

    const role = String(user.role || "").toLowerCase();
    const { name, email, currentPassword, newPassword } = req.body || {};

    const updateUser = {};
    const emailNext = typeof email === "string" ? email.toLowerCase().trim() : "";
    const emailPrev = String(user.email || "").toLowerCase().trim();

    if (emailNext && emailNext !== emailPrev) {
      const exists = await User.findOne({ email: emailNext, _id: { $ne: user._id } }).lean();
      if (exists) return res.status(409).json({ error: "Email already in use" });
      updateUser.email = emailNext;
      updateUser.username = emailNext;
    }

    if (typeof name === "string" && name.trim()) {
      updateUser.name = name.trim();
    }

    // Password change
    if (newPassword) {
      const np = String(newPassword);
      const strong = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
      if (!strong.test(np)) return res.status(400).json({ error: "Weak password" });

      const cp = String(currentPassword || "");

      if (role === "staff") {
        const emp = emailPrev ? await Employee.findOne({ email: emailPrev }).lean(false) : null;
        if (!emp || emp.disableLogin || emp.markAsInactive) {
          return res.status(403).json({ error: "Employee login is disabled" });
        }
        if (String(emp.password || "") !== cp) {
          return res.status(401).json({ error: "Current password is incorrect" });
        }
        emp.password = np;
        await emp.save();
      } else {
        if (!user.passwordHash) return res.status(400).json({ error: "Password not set" });
        const ok = await bcrypt.compare(cp, user.passwordHash);
        if (!ok) return res.status(401).json({ error: "Current password is incorrect" });
        const hash = await bcrypt.hash(np, 10);
        updateUser.passwordHash = hash;
      }
    }

    if (Object.keys(updateUser).length) {
      Object.assign(user, updateUser);
      await user.save();
    }

    // Sync to role-specific records
    const emailFinal = String(user.email || "").toLowerCase().trim();
    const nameFinal = String(user.name || "").trim();

    if (role === "client" && user.clientId) {
      const client = await Client.findById(user.clientId).lean(false);
      if (client) {
        if (emailFinal && String(client.email || "").toLowerCase().trim() !== emailFinal) client.email = emailFinal;
        if (nameFinal) {
          if (String(client.type || "org") === "person") client.person = nameFinal;
          else client.company = nameFinal;
        }
        await client.save();
      }
    }

    if (role === "staff") {
      const empPrev = emailPrev ? await Employee.findOne({ email: emailPrev }).lean(false) : null;
      if (empPrev) {
        if (emailFinal && String(empPrev.email || "").toLowerCase().trim() !== emailFinal) empPrev.email = emailFinal;
        if (nameFinal) empPrev.name = nameFinal;
        await empPrev.save();
      }
    }

    const refreshed = await User.findById(user._id).select("_id name email role avatar permissions clientId").lean();
    res.json({ user: refreshed });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/me/avatar", authenticate, uploadAvatar.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No avatar uploaded" });
    const rel = `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(req.user._id, { $set: { avatar: rel } }, { new: true })
      .select("_id name email role avatar permissions clientId")
      .lean();

    const role = String(user?.role || "").toLowerCase();
    const email = String(user?.email || "").toLowerCase().trim();

    if (role === "client" && user?.clientId) {
      await Client.updateOne({ _id: user.clientId }, { $set: { avatar: rel } }).catch(() => null);
    }

    if (role === "staff" && email) {
      await Employee.updateOne({ email }, { $set: { avatar: rel } }).catch(() => null);
    }

    res.json({ user, avatar: rel });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/admin/list", authenticate, isAdmin, async (_req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 }).select("name email role status permissions clientId createdAt updatedAt").lean();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/admin/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { role, status, permissions } = req.body || {};
    const update = {};
    if (role) update.role = role;
    if (status) update.status = status;
    if (Array.isArray(permissions)) update.permissions = permissions.map((x) => String(x));
    const doc = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select("name email role status permissions clientId");
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// User lookup for messaging (backed by Employees)
router.get("/", authenticate, async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const limitRaw = Number(req.query.limit || 20);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;

    const role = String(req.user?.role || "").toLowerCase();
    const allowedRoles = (() => {
      if (role === "admin") return new Set(["admin", "staff", "marketer"]);
      if (role === "staff") return new Set(["admin", "staff", "marketer"]);
      if (role === "marketer") return new Set(["admin", "staff", "marketer"]);
      return new Set();
    })();

    if (!allowedRoles.size) {
      return res.status(403).json({ error: "Access denied" });
    }

    const empFilter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { department: { $regex: search, $options: "i" } },
            { role: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const employees = await Employee.find(empFilter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Ensure each employee has a corresponding User record (by email) so conversations use valid User ids.
    const out = [];
    for (const emp of employees) {
      const email = String(emp?.email || "").toLowerCase().trim();
      if (!email) continue;

      // eslint-disable-next-line no-await-in-loop
      const user = await User.findOneAndUpdate(
        { email },
        {
          $setOnInsert: {
            email,
            username: email,
            role: "staff",
            status: "active",
            createdBy: "employee-sync",
          },
          $set: {
            name: emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
            avatar: emp.avatar || "",
          },
        },
        { new: true, upsert: true }
      ).lean();

      const uRole = String(user?.role || "").toLowerCase();
      if (!allowedRoles.has(uRole)) continue;
      out.push({
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      });
    }

    // Also include admins (not necessarily employees)
    const adminSearch = search ? { $or: [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }] } : {};
    if (allowedRoles.has("admin")) {
      const admins = await User.find({ role: "admin", status: "active", ...adminSearch })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("_id name email avatar role")
        .lean();
      for (const a of admins) {
        if (!out.some((x) => String(x._id) === String(a._id))) {
          out.push(a);
        }
      }
    }

    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
