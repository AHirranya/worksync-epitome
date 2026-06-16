// Server/src/routes/workLogRoutes.js

const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "worksync_secret_key";

const getUserFromRequest = async (req) => {
  try {
    const token =
      req.cookies?.token ||
      req.headers.authorization?.replace("Bearer ", "") ||
      null;

    if (!token) {
      return null;
    }

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

const getInternByEmail = async (email) => {
  const result = await pool.query(
    `
    SELECT id, intern_id, full_name, email
    FROM interns
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1
    `,
    [email]
  );

  return result.rows[0] || null;
};

router.post("/", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        message: "Please login first.",
      });
    }

    const intern = await getInternByEmail(user.email);

    if (!intern) {
      return res.status(404).json({
        message: "Intern profile not found.",
      });
    }

    const { summary, hoursWorked, blockers } = req.body;

    if (!summary) {
      return res.status(400).json({
        message: "Work summary is required.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO work_logs
      (
        intern_id,
        log_date,
        summary,
        hours_worked,
        blockers,
        status
      )
      VALUES ($1, CURRENT_DATE, $2, $3, $4, 'Submitted')
      RETURNING *
      `,
      [intern.id, summary, hoursWorked || 0, blockers || null]
    );

    res.status(201).json({
      message: "Work log submitted successfully.",
      workLog: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to submit work log.",
      error: error.message,
    });
  }
});

router.get("/my", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        message: "Please login first.",
      });
    }

    const intern = await getInternByEmail(user.email);

    if (!intern) {
      return res.status(404).json({
        message: "Intern profile not found.",
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        log_date,
        summary,
        hours_worked,
        blockers,
        status,
        reviewed_at,
        created_at
      FROM work_logs
      WHERE intern_id = $1
      ORDER BY log_date DESC, created_at DESC
      LIMIT 50
      `,
      [intern.id]
    );

    res.json({
      workLogs: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load work logs.",
      error: error.message,
    });
  }
});

router.get("/hr", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        wl.id,
        wl.log_date,
        wl.summary,
        wl.hours_worked,
        wl.blockers,
        wl.status,
        wl.reviewed_at,
        wl.created_at,
        i.intern_id,
        i.full_name AS intern_name,
        i.email AS intern_email,
        d.name AS department_name,
        u.full_name AS reviewed_by_name
      FROM work_logs wl
      JOIN interns i ON i.id = wl.intern_id
      LEFT JOIN departments d ON d.id = i.department_id
      LEFT JOIN users u ON u.id = wl.reviewed_by
      ORDER BY wl.log_date DESC, wl.created_at DESC
      LIMIT 200
    `);

    res.json({
      workLogs: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load HR work logs.",
      error: error.message,
    });
  }
});

router.patch("/:workLogId/review", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        message: "Please login first.",
      });
    }

    if (!["hr", "admin", "mentor"].includes(user.role)) {
      return res.status(403).json({
        message: "Only HR/Admin/Mentor can review work logs.",
      });
    }

    const { workLogId } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["Submitted", "Reviewed", "Needs Improvement"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid work log status.",
      });
    }

    const result = await pool.query(
      `
      UPDATE work_logs
      SET
        status = $1,
        reviewed_by = $2,
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
      `,
      [status, user.id, workLogId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Work log not found.",
      });
    }

    res.json({
      message: "Work log reviewed successfully.",
      workLog: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to review work log.",
      error: error.message,
    });
  }
});

module.exports = router;