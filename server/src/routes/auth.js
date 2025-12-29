import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Client from "../models/Client.js";
import Employee from "../models/Employee.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const TOKEN_TTL = process.env.JWT_TTL || "7d";

// Admin login
router.post("/admin/login", async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) return res.status(400).json({ error: "Missing credentials" });

    const query = { $or: [{ email: identifier.toLowerCase() }, { username: identifier }] };
    const user = await User.findOne(query).lean();
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (user.role !== "admin") return res.status(403).json({ error: "Unauthorized role" });
    if (user.status !== "active") {
      return res.status(403).json({ error: "Inactive user" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      await User.updateOne({ _id: user._id }, { $inc: { failedLogins: 1 } }).catch(()=>{});
      return res.status(401).json({ error: "Invalid credentials" });
    }

    await User.updateOne({ _id: user._id }, { $set: { failedLogins: 0, lastLoginAt: new Date() } });
    const token = jwt.sign({ uid: user._id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });
    res.json({ token, user: { id: user._id, email: user.email, role: user.role, permissions: user.permissions || [] } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Temporary alias to handle older frontend builds pointing to /admin/login1
router.post("/admin/login1", async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) return res.status(400).json({ error: "Missing credentials" });

    const query = { $or: [{ email: identifier.toLowerCase() }, { username: identifier }] };
    const user = await User.findOne(query).lean(false);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (user.role !== "admin") return res.status(403).json({ error: "Unauthorized role" });
    if (user.status !== "active") {
      return res.status(403).json({ error: "Inactive user" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      user.failedLogins = (user.failedLogins || 0) + 1;
      await user.save().catch(()=>{});
      return res.status(401).json({ error: "Invalid credentials" });
    }

    await User.updateOne({ _id: user._id }, { $set: { failedLogins: 0, lastLoginAt: new Date() } });
    const token = jwt.sign({ uid: user._id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });
    res.json({ token, user: { id: user._id, email: user.email, role: user.role, permissions: user.permissions || [] } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Team login (admin + staff)
router.post("/team/login", async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) return res.status(400).json({ error: "Missing credentials" });

    const identifierLc = String(identifier).toLowerCase().trim();
    const query = { $or: [{ email: identifierLc }, { username: identifier }] };
    let user = await User.findOne(query).lean();

    // If user doesn't exist yet, allow employee login by email and auto-create staff User.
    if (!user) {
      const emp = identifierLc ? await Employee.findOne({ email: identifierLc }).lean() : null;
      if (!emp || emp.disableLogin || emp.markAsInactive) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const ok = String(emp.password || "") === String(password);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });

      user = await User.findOneAndUpdate(
        { email: identifierLc },
        {
          $setOnInsert: {
            email: identifierLc,
            username: identifierLc,
            role: "staff",
            status: "active",
            createdBy: "employee-login",
          },
          $set: {
            name: emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
            avatar: emp.avatar || "",
          },
        },
        { new: true, upsert: true }
      ).lean();
    }

    if (user.role !== "admin" && user.role !== "staff") return res.status(403).json({ error: "Unauthorized role" });
    if (user.status !== "active") return res.status(403).json({ error: "Inactive user" });

    // Admin uses hashed password; staff uses Employee.password
    let ok = false;
    if (user.role === "admin") {
      ok = await bcrypt.compare(password, user.passwordHash);
    } else {
      const email = String(user.email || "").toLowerCase().trim();
      const emp = email ? await Employee.findOne({ email }).lean() : null;
      ok = Boolean(emp && !emp.disableLogin && !emp.markAsInactive && String(emp.password || "") === String(password));
    }

    if (!ok) {
      await User.updateOne({ _id: user._id }, { $inc: { failedLogins: 1 } }).catch(() => {});
      return res.status(401).json({ error: "Invalid credentials" });
    }

    await User.updateOne({ _id: user._id }, { $set: { failedLogins: 0, lastLoginAt: new Date() } });
    const token = jwt.sign({ uid: user._id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });
    res.json({ token, user: { id: user._id, email: user.email, role: user.role, name: user.name || "", permissions: user.permissions || [] } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Client login
router.post("/client/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Missing credentials" });

    const emailLc = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: emailLc, role: "client" }).lean();
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (user.status !== "active") return res.status(403).json({ error: "Inactive user" });
    if (!user.passwordHash) return res.status(401).json({ error: "Account not ready" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      await User.updateOne({ _id: user._id }, { $inc: { failedLogins: 1 } }).catch(() => {});
      return res.status(401).json({ error: "Invalid credentials" });
    }

    await User.updateOne({ _id: user._id }, { $set: { failedLogins: 0, lastLoginAt: new Date() } });
    const token = jwt.sign({ uid: user._id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });

    const client = user.clientId ? await Client.findById(user.clientId).lean() : null;
    res.json({ token, user: { id: user._id, email: user.email, role: user.role, name: user.name || "", permissions: user.permissions || [] }, client });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Email availability
router.get("/email-available", async (req, res) => {
  try {
    const email = String(req.query.email || "").toLowerCase().trim();
    if (!email) return res.json({ available: false });
    const exists = await User.findOne({ email }).lean();
    res.json({ available: !exists });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Client register
router.post("/client/register", async (req, res) => {
  try {
    const { companyName, clientName, firstName, lastName, type, email, phone, password, industry, autoLogin } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const emailLc = String(email).toLowerCase().trim();
    const exists = await User.findOne({ email: emailLc });
    if (exists) return res.status(409).json({ error: "Email already registered" });

    // password rules: 8+ with letters and numbers
    const strong = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
    if (!strong.test(password)) return res.status(400).json({ error: "Weak password" });

    const t = (type === "person" ? "person" : "org");
    const personName = (clientName && String(clientName).trim()) || `${String(firstName||"").trim()} ${String(lastName||"").trim()}`.trim();
    const company = t === "org" ? String(companyName || "").trim() : "";

    if (t === "org" && !company) return res.status(400).json({ error: "Company name required" });
    if (t === "person" && !personName) return res.status(400).json({ error: "Name required" });

    const clientDoc = await Client.create({
      type: t,
      company,
      person: personName,
      email: emailLc,
      phone: phone || "",
      labels: [],
      status: "active",
      createdBy: "self-signup",
    });

    const hash = await bcrypt.hash(password, 10);
    const userDoc = await User.create({
      email: emailLc,
      username: emailLc,
      passwordHash: hash,
      role: "client",
      status: "active",
      clientId: clientDoc._id,
      createdBy: "self-signup",
    });

    // Send welcome message from an admin to the new client (best-effort)
    try {
      const admin = await User.findOne({ role: { $regex: /^admin$/i }, status: { $regex: /^active$/i } })
        .sort({ createdAt: 1 })
        .select("_id")
        .lean();
      if (admin?._id) {
        const participants = [admin._id, userDoc._id];
        let conversation = await Conversation.findOne({
          $and: [
            {
              $or: [
                { projectId: { $exists: false } },
                { projectId: null },
              ],
            },
            { participants: { $all: participants, $size: 2 } },
          ],
        }).lean(false);

        if (!conversation) {
          conversation = await Conversation.create({
            participants,
            isGroup: false,
            createdBy: admin._id,
            admins: [admin._id],
          });
        }

        const displayName = String(personName || company || "").trim() || "there";
        const content = `Welcome to HealthSpire! 👋\n\nHello ${displayName},\n\nThank you for signing up with HealthSpire. We’re excited to have you on board.\n\nOur team is here to support you with your healthcare software needs. Please let us know how we can help you today—whether it’s onboarding, customization, or any questions you may have.\n\nBest regards,\nHealthSpire Admin Team`;

        const created = await Message.create({
          conversationId: conversation._id,
          sender: admin._id,
          content,
          attachments: [],
          readBy: [admin._id],
        });

        await Conversation.updateOne(
          { _id: conversation._id },
          { $set: { lastMessage: created._id }, $currentDate: { updatedAt: true } }
        ).catch(() => {});
      }
    } catch {
      // best-effort
    }

    if (autoLogin) {
      const token = jwt.sign({ uid: userDoc._id, role: userDoc.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });
      return res.status(201).json({ ok: true, token, user: { id: userDoc._id, email: userDoc.email, role: userDoc.role }, client: clientDoc });
    }

    res.status(201).json({ ok: true, client: clientDoc });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: "Email already registered" });
    res.status(500).json({ error: e.message });
  }
});

export default router;
