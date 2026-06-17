// Server/src/server.js

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { auditMiddleware } = require("./utils/auditLogger");

const app = express();

const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(auditMiddleware);

const loadRoute = (routePath, routeName) => {
  try {
    return require(routePath);
  } catch (error) {
    console.warn(`Route not loaded: ${routeName}`);
    console.warn(error.message);
    return null;
  }
};

const authRoutes = loadRoute("./routes/authRoutes", "authRoutes");
const applicantRoutes = loadRoute("./routes/applicantRoutes", "applicantRoutes");
const onboardingRoutes = loadRoute("./routes/onboardingRoutes", "onboardingRoutes");
const trainingRoutes = loadRoute("./routes/trainingRoutes", "trainingRoutes");
const taskRoutes = loadRoute("./routes/taskRoutes", "taskRoutes");
const attendanceRoutes = loadRoute("./routes/attendanceRoutes", "attendanceRoutes");
const workLogRoutes = loadRoute("./routes/workLogRoutes", "workLogRoutes");
const performanceRoutes = loadRoute("./routes/performanceRoutes", "performanceRoutes");
const certificateRoutes = loadRoute("./routes/certificateRoutes", "certificateRoutes");
const adminRoutes = loadRoute("./routes/adminRoutes", "adminRoutes");
const summaryRoutes = loadRoute("./routes/summaryRoutes", "summaryRoutes");
const auditRoutes = loadRoute("./routes/auditRoutes", "auditRoutes");

app.get("/", (req, res) => {
  res.json({
    message: "WorkSync Server is running.",
    apiBase: "/api",
  });
});

app.get("/api", (req, res) => {
  res.json({
    message: "WorkSync API is running.",
    routes: {
      health: "/api/health",
      auth: "/api/auth",
      applicants: "/api/applicants",
      onboarding: "/api/onboarding",
      training: "/api/training",
      tasks: "/api/tasks",
      attendance: "/api/attendance",
      workLogs: "/api/work-logs",
      performance: "/api/performance",
      certificates: "/api/certificates",
      admin: "/api/admin",
      summary: "/api/summary",
      audit: "/api/audit",
    },
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "WorkSync API is healthy.",
    time: new Date().toISOString(),
  });
});

if (authRoutes) app.use("/api/auth", authRoutes);
if (applicantRoutes) app.use("/api/applicants", applicantRoutes);
if (onboardingRoutes) app.use("/api/onboarding", onboardingRoutes);
if (trainingRoutes) app.use("/api/training", trainingRoutes);
if (taskRoutes) app.use("/api/tasks", taskRoutes);
if (attendanceRoutes) app.use("/api/attendance", attendanceRoutes);
if (workLogRoutes) app.use("/api/work-logs", workLogRoutes);
if (performanceRoutes) app.use("/api/performance", performanceRoutes);
if (certificateRoutes) app.use("/api/certificates", certificateRoutes);
if (adminRoutes) app.use("/api/admin", adminRoutes);
if (summaryRoutes) app.use("/api/summary", summaryRoutes);
if (auditRoutes) app.use("/api/audit", auditRoutes);

app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({
      message: "API route not found.",
      path: req.originalUrl,
      hint: "Check if the route file exists and is mounted in Server/src/server.js.",
    });
  }

  return res.status(404).json({
    message: "Route not found.",
    path: req.originalUrl,
  });
});

app.use((error, req, res, next) => {
  console.error("Server Error:", error);

  if (error.message && error.message.includes("CORS blocked")) {
    return res.status(403).json({
      message: "CORS blocked this request.",
      error: error.message,
    });
  }

  return res.status(error.status || 500).json({
    message: "Internal server error.",
    error:
      process.env.NODE_ENV === "production"
        ? "Something went wrong."
        : error.message,
  });
});

app.listen(PORT, () => {
  console.log("==============================================");
  console.log(`WorkSync server running on port ${PORT}`);
  console.log("Health check: /api/health");
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || "Not set"}`);
  console.log("Audit logs: /api/audit");
  console.log("==============================================");
});