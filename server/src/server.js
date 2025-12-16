import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import contactsRouter from "./routes/contacts.js";
import companiesRouter from "./routes/companies.js";
import employeesRouter from "./routes/employees.js";
import attendanceRouter from "./routes/attendance.js";
import leavesRouter from "./routes/leaves.js";
import payrollRouter from "./routes/payroll.js";
import departmentsRouter from "./routes/departments.js";
import filesRouter from "./routes/files.js";
import notesRouter from "./routes/notes.js";
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
import eventsApiRouter from "./routes/events.js";
import itemsRouter from "./routes/items.js";
import estimateRequestsRouter from "./routes/estimateRequests.js";
import subscriptionsRouter from "./routes/subscriptions.js";
import authRouter from "./routes/auth.js";
import estimateFormsRouter from "./routes/estimateForms.js";
import bcrypt from "bcryptjs";
import User from "./models/User.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mindspire";

app.use(cors());
// Enable CORS preflight for all routes
app.options("*", cors());
app.use(express.json({ limit: "15mb" }));
app.use(morgan("dev"));
// Disable etag and caching for API to prevent 304 interfering with fetch()
app.set("etag", false);
app.use((_, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "development" });
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
app.use("/api/tickets", ticketsRouter);
app.use("/api/events", eventsApiRouter);
app.use("/api/estimate-requests", estimateRequestsRouter);
app.use("/api/subscriptions", subscriptionsRouter);
app.use("/api/auth", authRouter);
app.use("/api/estimate-forms", estimateFormsRouter);
// Backward/alternative path alias to avoid 404s from different frontends
app.use("/api/estimateforms", estimateFormsRouter);

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
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    (async () => {
      await seedAdmin();
      app.listen(PORT, () => {
        console.log(`Server listening on http://localhost:${PORT}`);
      });
    })();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });
