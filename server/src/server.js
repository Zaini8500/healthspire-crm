import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import http from "node:http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import contactsRouter from "./routes/contacts.js";
import companiesRouter from "./routes/companies.js";
import employeesRouter from "./routes/employees.js";
import attendanceRouter from "./routes/attendance.js";
import leavesRouter from "./routes/leaves.js";
import payrollRouter from "./routes/payroll.js";
import departmentsRouter from "./routes/departments.js";
import filesRouter from "./routes/files.js";
import notesRouter from "./routes/notes.js";
import noteCategoriesRouter from "./routes/noteCategories.js";
import noteLabelsRouter from "./routes/noteLabels.js";
import projectsRouter from "./routes/projects.js";
import expensesRouter from "./routes/expenses.js";
import jobsRouter from "./routes/jobs.js";
import candidatesRouter from "./routes/candidates.js";
import interviewsRouter from "./routes/interviews.js";
import tasksRouter from "./routes/tasks.js";
import clientsRouter from "./routes/clients.js";
import estimatesRouter from "./routes/estimates.js";
import invoicesRouter from "./routes/invoices.js";
import paymentsRouter from "./routes/payments.js";
import ordersRouter from "./routes/orders.js";
import contractsRouter from "./routes/contracts.js";
import proposalsRouter from "./routes/proposals.js";
import ticketsRouter from "./routes/tickets.js";
import ticketLabelsRouter from "./routes/ticketLabels.js";
import ticketTemplatesRouter from "./routes/ticketTemplates.js";
import eventsApiRouter from "./routes/events.js";
import itemsRouter from "./routes/items.js";
import estimateRequestsRouter from "./routes/estimateRequests.js";
import subscriptionsRouter from "./routes/subscriptions.js";
import subscriptionLabelsRouter from "./routes/subscriptionLabels.js";
import messagesRouter from "./routes/messages.js";
import usersRouter from "./routes/users.js";
import announcementsRouter from "./routes/announcements.js";
import clientPortalRouter from "./routes/client.js";
import projectRequestsRouter from "./routes/projectRequests.js";
import authRouter from "./routes/auth.js";
import estimateFormsRouter from "./routes/estimateForms.js";
import leadsRouter from "./routes/leads.js";
import leadLabelsRouter from "./routes/leadLabels.js";
import taskLabelsRouter from "./routes/taskLabels.js";
import remindersRouter from "./routes/reminders.js";
import helpArticlesRouter from "./routes/helpArticles.js";
import helpCategoriesRouter from "./routes/helpCategories.js";
import notificationsRouter from "./routes/notifications.js";
import settingsRouter from "./routes/settings.js";
import bcrypt from "bcryptjs";
import User from "./models/User.js";

dotenv.config();

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mindspire";

// CORS configuration: allow Vercel frontend, Render preview, and local dev
const defaultOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5000",
  "https://healthspire-crm.vercel.app",
  "https://healthspire-crm.onrender.com",
];
const envOrigins = (process.env.CORS_ORIGINS || "")
  .split(/[;,\s]+/)
  .map((s) => s.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...defaultOrigins, ...envOrigins]);
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // mobile apps, curl, same-origin
    try {
      const url = new URL(origin);
      const ok =
        allowedOrigins.has(origin) ||
        allowedOrigins.has(`${url.protocol}//${url.host}`) ||
        url.hostname.endsWith(".vercel.app") ||
        url.hostname.endsWith(".onrender.com") ||
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1";
      return callback(null, ok);
    } catch {
      return callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "X-Requested-With",
  ],
  exposedHeaders: ["Content-Length", "Content-Type"],
};
app.use(cors(corsOptions));
// Enable CORS preflight for all routes
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "15mb" }));
app.use(morgan("dev"));
// Disable etag and caching for API to prevent 304 interfering with fetch()
app.set("etag", false);
app.use((_, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, "..");
const UPLOAD_DIR = path.join(SERVER_ROOT, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/", (_req, res) => {
  res.json({ ok: true, name: "Healthspire API", health: "/api/health" });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "development" });
});

app.get("/api/debug/routes", (_req, res) => {
  try {
    const stack = app?._router?.stack || [];
    const mounts = stack
      .filter((l) => l && l.name === "router" && l.regexp)
      .map((l) => {
        const s = l.regexp.toString();
        const m = s.match(/\\\/\^\\\\\/(.*?)\\\\\//);
        return m?.[1] ? `/${m[1].replace(/\\\\\//g, "/")}` : s;
      });
    res.json({ mounts });
  } catch (e) {
    res.status(500).json({ error: e.message || "debug failed" });
  }
});

app.use("/api/contacts", contactsRouter);
app.use("/api/companies", companiesRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/leaves", leavesRouter);
app.use("/api/payroll", payrollRouter);
app.use("/api/departments", departmentsRouter);
app.use("/api/files", filesRouter);
app.use("/api/notes", notesRouter);
app.use("/api/note-categories", noteCategoriesRouter);
app.use("/api/note-labels", noteLabelsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/candidates", candidatesRouter);
app.use("/api/interviews", interviewsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/estimates", estimatesRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/items", itemsRouter);
app.use("/api/contracts", contractsRouter);
app.use("/api/proposals", proposalsRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/lead-labels", leadLabelsRouter);
app.use("/api/task-labels", taskLabelsRouter);
app.use("/api/ticket-labels", ticketLabelsRouter);
app.use("/api/ticket-templates", ticketTemplatesRouter);
app.use("/api/reminders", remindersRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/events", eventsApiRouter);
app.use("/api/estimate-requests", estimateRequestsRouter);
app.use("/api/subscriptions", subscriptionsRouter);
app.use("/api/subscription-labels", subscriptionLabelsRouter);
// Backward/alternative path alias to avoid 404s from different frontends
app.use("/api/subscriptionlabels", subscriptionLabelsRouter);
app.use("/api/users", usersRouter);
app.use("/api/announcements", announcementsRouter);
app.use("/api/client", clientPortalRouter);
app.use("/api/project-requests", projectRequestsRouter);
app.use("/api/auth", authRouter);
app.use("/api/estimate-forms", estimateFormsRouter);
// Backward/alternative path alias to avoid 404s from different frontends
app.use("/api/estimateforms", estimateFormsRouter);
// Help & Support
app.use("/api/help/articles", helpArticlesRouter);
app.use("/api/help/categories", helpCategoriesRouter);

async function seedAdmin() {
  try {
    const email = "info@mindspire.com";
    const existing = await User.findOne({ email });
    if (!existing) {
      const passwordHash = await bcrypt.hash("admin123", 10);
      await User.create({
        email,
        username: "admin",
        passwordHash,
        role: "admin",
        status: "active",
        createdBy: "seed",
      });
      console.log("Seeded default admin: info@mindspire.com / admin123");
    } else {
      console.log("Admin user already exists: info@mindspire.com");
    }
  } catch (err) {
    console.error("Admin seed error:", err.message);
  }
}

mongoose
  .connect(MONGODB_URI, { dbName: process.env.MONGODB_DB || "mindspire" })
  .then(() => {
    console.log("MongoDB connected");
    (async () => {
      await seedAdmin();
      const isDev = (process.env.NODE_ENV || "development") !== "production";

      const freePort = async (port) => {
        if (!isDev) return;
        if (process.platform === "win32") {
          const { stdout } = await execAsync(`powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue).OwningProcess"`).catch(() => ({ stdout: "" }));
          const pids = (stdout || "")
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => parseInt(s, 10))
            .filter((n) => Number.isFinite(n));
          for (const pid of pids) {
            // Only kill node/nodemon to avoid terminating other apps that might legitimately use 5000.
            // eslint-disable-next-line no-await-in-loop
            const { stdout: nameOut } = await execAsync(
              `powershell -NoProfile -Command "(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).ProcessName"`
            ).catch(() => ({ stdout: "" }));
            const proc = (nameOut || "").trim().toLowerCase();
            if (proc === "node" || proc === "nodemon") {
              // eslint-disable-next-line no-await-in-loop
              await execAsync(`taskkill /F /PID ${pid}`).catch(() => null);
            }
          }
          return;
        }

        await execAsync(`lsof -ti tcp:${port} | xargs kill -9`).catch(() => null);
      };

      const delay = (ms) => new Promise((r) => setTimeout(r, ms));

      const listenWithRetry = async (retriesLeft = 8) => {
        const server = http.createServer(app);
        server.on("error", async (err) => {
          const code = err?.code;
          if (code === "EADDRINUSE" && isDev && retriesLeft > 0) {
            try {
              await freePort(PORT);
              await delay(800);
              await listenWithRetry(retriesLeft - 1);
            } catch (e) {
              console.error("Failed to recover from port conflict:", e?.message || e);
              process.exit(1);
            }
            return;
          }
          console.error("Server error:", code || "unknown", err?.message || err);
          if (code === "EADDRINUSE" && isDev && retriesLeft <= 0) {
            console.error(`Port ${PORT} is still in use after retries. Try closing other backend terminals.`);
          }
          process.exit(1);
        });

        server.listen(PORT, () => {
          console.log(`Server listening on http://localhost:${PORT}`);
        });
      };

      await freePort(PORT);
      await delay(500);
      await listenWithRetry();
    })();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });
