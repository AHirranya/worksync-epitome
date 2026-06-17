// Server/src/routes/reportRoutes.js

const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "worksync_secret_key_change_this";

const getTokenFromRequest = (req) => {
  const cookieToken = req.cookies?.token;

  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "")
      : null;

  return cookieToken || bearerToken || null;
};

const getUserFromRequest = async (req) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await pool.query(
      `
      SELECT id, full_name, email, role
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [decoded.id]
    );

    return result.rows[0] || null;
  } catch (error) {
    return null;
  }
};

const requireReportsAccess = async (req, res) => {
  const user = await getUserFromRequest(req);

  if (!user) {
    res.status(401).json({
      message: "Please login first.",
    });

    return null;
  }

  if (!["admin", "hr", "mentor"].includes(user.role)) {
    res.status(403).json({
      message: "Only Admin, HR, or Mentor can view reports.",
    });

    return null;
  }

  return user;
};

const safeQuery = async (query, values = [], fallback = []) => {
  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    console.warn("Report query skipped:", error.message);
    return fallback;
  }
};

const safeCount = async (tableName, whereClause = "") => {
  try {
    const result = await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM ${tableName}
      ${whereClause}
      `
    );

    return Number(result.rows[0]?.count || 0);
  } catch (error) {
    return 0;
  }
};

router.get("/overview", async (req, res) => {
  try {
    const user = await requireReportsAccess(req, res);
    if (!user) return;

    const totalUsers = await safeCount("users");
    const totalApplicants = await safeCount("applicants");
    const totalInterns = await safeCount("interns");
    const activeInterns = await safeCount(
      "interns",
      `WHERE LOWER(COALESCE(status, 'active')) = 'active'`
    );
    const totalDepartments = await safeCount("departments");
    const totalCertificates = await safeCount("certificates");
    const totalWorkLogs = await safeCount("work_logs");
    const totalAttendance = await safeCount("attendance");

    const departmentStats = await safeQuery(`
      SELECT
        d.name AS department_name,
        COUNT(i.id) AS intern_count
      FROM departments d
      LEFT JOIN interns i ON i.department_id = d.id
      GROUP BY d.id, d.name
      ORDER BY intern_count DESC, d.name ASC
    `);

    const applicantStats = await safeQuery(`
      SELECT
        COALESCE(status, 'Applied') AS status,
        COUNT(*) AS count
      FROM applicants
      GROUP BY COALESCE(status, 'Applied')
      ORDER BY count DESC
    `);

    const certificateStats = await safeQuery(`
      SELECT
        COALESCE(status, 'Issued') AS status,
        COUNT(*) AS count
      FROM certificates
      GROUP BY COALESCE(status, 'Issued')
      ORDER BY count DESC
    `);

    const workLogStats = await safeQuery(`
      SELECT
        COALESCE(status, 'Submitted') AS status,
        COUNT(*) AS count
      FROM work_logs
      GROUP BY COALESCE(status, 'Submitted')
      ORDER BY count DESC
    `);

    const attendanceStats = await safeQuery(`
      SELECT
        COALESCE(status, 'Present') AS status,
        COUNT(*) AS count
      FROM attendance
      GROUP BY COALESCE(status, 'Present')
      ORDER BY count DESC
    `);

    const trainingStats = await safeQuery(`
      SELECT
        COUNT(tm.id) AS total_modules,
        COUNT(
          CASE
            WHEN LOWER(COALESCE(tp.status, '')) = 'completed' THEN 1
          END
        ) AS completed_modules
      FROM training_modules tm
      LEFT JOIN training_progress tp ON tp.module_id = tm.id
    `);

    const trainingTotal = Number(trainingStats[0]?.total_modules || 0);
    const trainingCompleted = Number(trainingStats[0]?.completed_modules || 0);
    const trainingPercent =
      trainingTotal > 0
        ? Math.round((trainingCompleted / trainingTotal) * 100)
        : 0;

    const recentWorkLogs = await safeQuery(`
      SELECT
        wl.id,
        wl.log_date,
        wl.summary,
        wl.hours_worked,
        wl.status,
        i.full_name AS intern_name,
        d.name AS department_name
      FROM work_logs wl
      JOIN interns i ON i.id = wl.intern_id
      LEFT JOIN departments d ON d.id = i.department_id
      ORDER BY wl.created_at DESC, wl.id DESC
      LIMIT 8
    `);

    const recentCertificates = await safeQuery(`
      SELECT
        c.id,
        c.certificate_number,
        c.verification_code,
        c.status,
        c.issued_at,
        i.full_name AS intern_name,
        d.name AS department_name
      FROM certificates c
      JOIN interns i ON i.id = c.intern_id
      LEFT JOIN departments d ON d.id = i.department_id
      ORDER BY c.issued_at DESC, c.id DESC
      LIMIT 8
    `);

    const cards = [
      {
        label: "Total Users",
        value: totalUsers,
        note: "All platform accounts",
      },
      {
        label: "Applicants",
        value: totalApplicants,
        note: "Internship applications",
      },
      {
        label: "Total Interns",
        value: totalInterns,
        note: "Onboarded interns",
      },
      {
        label: "Active Interns",
        value: activeInterns,
        note: "Currently active",
      },
      {
        label: "Departments",
        value: totalDepartments,
        note: "Available departments",
      },
      {
        label: "Certificates",
        value: totalCertificates,
        note: "Issued certificates",
      },
      {
        label: "Work Logs",
        value: totalWorkLogs,
        note: "Submitted work logs",
      },
      {
        label: "Attendance Records",
        value: totalAttendance,
        note: "Attendance entries",
      },
    ];

    res.json({
      cards,
      training: {
        totalModules: trainingTotal,
        completedModules: trainingCompleted,
        completionPercent: trainingPercent,
      },
      departmentStats,
      applicantStats,
      certificateStats,
      workLogStats,
      attendanceStats,
      recentWorkLogs,
      recentCertificates,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load reports.",
      error: error.message,
    });
  }
});

module.exports = router;