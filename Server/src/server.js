// Server/src/server.js

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const applicantRoutes = require("./routes/applicantRoutes");
const onboardingRoutes = require("./routes/onboardingRoutes");
const trainingRoutes = require("./routes/trainingRoutes");
const taskRoutes = require("./routes/taskRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const workLogRoutes = require("./routes/workLogRoutes");
const performanceRoutes = require("./routes/performanceRoutes");
const certificateRoutes = require("./routes/certificateRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    message: "WorkSync backend is running.",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "WorkSync API is healthy.",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/applicants", applicantRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/training", trainingRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/work-logs", workLogRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "API route not found.",
  });
});

app.use((error, req, res, next) => {
  console.error("Server error:", error.message);

  res.status(500).json({
    message: "Internal server error.",
    error: error.message,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend allowed: ${FRONTEND_URL}`);
});