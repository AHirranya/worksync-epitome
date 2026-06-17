// Server/src/server.js

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

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

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
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
  console.error("Server Error:", error.message);

  res.status(500).json({
    message: "Internal server error.",
    error: process.env.NODE_ENV === "production" ? undefined : error.message,
  });
});

app.listen(PORT, () => {
  console.log(`WorkSync server running on port ${PORT}`);
});