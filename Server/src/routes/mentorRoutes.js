// Server/src/routes/mentorRoutes.js

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

const requireMentorAccess = async (req, res) => {
  const user = await getUserFromRequest(req);

  if (!user) {
    res.status(401).json({
      message: "Please login first.",
    });

    return null;
  }

  if (!["mentor", "admin"].includes(user.role)) {
    res.status(403).json({
      message: "Only Mentor/Admin can access mentor dashboard.",
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
    console.warn("Mentor query skipped:", error.message);
    return fallback;
  }
};

const safeCount = async (query, values = []) => {
  try {
    const result = await pool.query(query, values);
    return Number(result.rows[0]?.count || 0);
  } catch (error) {
    return 0;
  }
};

router.get("/overview", async (req, res) => {
  try {
    const user = await requireMentorAccess(req, res);
    if (!user) return;

    const totalInterns = await safeCount(`
      SELECT COUNT(*) AS count
      FROM interns
    `);

    const activeInterns = await safeCount(`
      SELECT COUNT(*) AS count
      FROM interns
      WHERE LOWER(COALESCE(status, 'active')) = 'active'
    `);

    const pendingWorkLogs = await safeCount(`
      SELECT COUNT(*) AS count
      FROM work_logs
      WHERE LOWER(COALESCE(status, 'submitted')) = 'submitted'
    `);

    const internsWithBlockers = await safeCount(`
      SELECT COUNT(DISTINCT intern_id) AS count
      FROM work_logs
      WHERE blockers IS NOT NULL
      AND TRIM(blockers) <> ''
    `);

    const certificatesIssued = await safeCount(`
      SELECT COUNT(*) AS count
      FROM certificates
    `);

    const todayAttendance = await safeCount(`
      SELECT COUNT(*) AS count
      FROM attendance
      WHERE attendance_date = CURRENT_DATE
    `);

    const interns = await safeQuery(`
      WITH training_stats AS (
        SELECT
          ta.intern_id,
          COUNT(tm.id) AS total_modules,
          COUNT(
            CASE
              WHEN LOWER(COALESCE(tp.status, '')) = 'completed' THEN 1
            END
          ) AS completed_modules
        FROM training_assignments ta
        JOIN training_modules tm ON tm.course_id = ta.course_id
        LEFT JOIN training_progress tp
          ON tp.module_id = tm.id
          AND tp.intern_id = ta.intern_id
        GROUP BY ta.intern_id
      ),
      latest_attendance AS (
        SELECT DISTINCT ON (intern_id)
          intern_id,
          attendance_date,
          check_in,
          check_out,
          status,
          total_break_minutes,
          net_work_minutes
        FROM attendance
        ORDER BY intern_id, attendance_date DESC, id DESC
      ),
      latest_certificate AS (
        SELECT DISTINCT ON (intern_id)
          intern_id,
          certificate_number,
          status AS certificate_status,
          issued_at
        FROM certificates
        ORDER BY intern_id, issued_at DESC, id DESC
      )
      SELECT
        i.id,
        i.full_name,
        i.email,
        i.status,
        i.joining_date,
        i.end_date,
        d.name AS department_name,
        COALESCE(ts.total_modules, 0) AS total_modules,
        COALESCE(ts.completed_modules, 0) AS completed_modules,
        CASE
          WHEN COALESCE(ts.total_modules, 0) = 0 THEN 0
          ELSE ROUND((COALESCE(ts.completed_modules, 0)::decimal / ts.total_modules) * 100)
        END AS training_percent,
        la.attendance_date,
        la.check_in,
        la.check_out,
        la.status AS attendance_status,
        la.total_break_minutes,
        la.net_work_minutes,
        lc.certificate_number,
        lc.certificate_status
      FROM interns i
      LEFT JOIN departments d ON d.id = i.department_id
      LEFT JOIN training_stats ts ON ts.intern_id = i.id
      LEFT JOIN latest_attendance la ON la.intern_id = i.id
      LEFT JOIN latest_certificate lc ON lc.intern_id = i.id
      ORDER BY i.created_at DESC, i.id DESC
    `);

    const workLogs = await safeQuery(`
      SELECT
        wl.id,
        wl.log_date,
        wl.summary,
        wl.hours_worked,
        wl.blockers,
        wl.overtime_reason,
        wl.status,
        wl.created_at,
        i.full_name AS intern_name,
        i.email AS intern_email,
        d.name AS department_name
      FROM work_logs wl
      JOIN interns i ON i.id = wl.intern_id
      LEFT JOIN departments d ON d.id = i.department_id
      ORDER BY wl.created_at DESC, wl.id DESC
      LIMIT 20
    `);

    const attendance = await safeQuery(`
      SELECT
        a.id,
        a.attendance_date,
        a.check_in,
        a.check_out,
        a.status,
        a.total_break_minutes,
        a.net_work_minutes,
        a.overtime_reason,
        i.full_name AS intern_name,
        i.email AS intern_email,
        d.name AS department_name
      FROM attendance a
      JOIN interns i ON i.id = a.intern_id
      LEFT JOIN departments d ON d.id = i.department_id
      ORDER BY a.attendance_date DESC, a.id DESC
      LIMIT 20
    `);

    const feedback = await safeQuery(`
      SELECT
        mf.id,
        mf.rating,
        mf.feedback_text,
        mf.action_plan,
        mf.created_at,
        u.full_name AS mentor_name,
        i.full_name AS intern_name,
        i.email AS intern_email,
        d.name AS department_name
      FROM mentor_feedback mf
      LEFT JOIN users u ON u.id = mf.mentor_id
      JOIN interns i ON i.id = mf.intern_id
      LEFT JOIN departments d ON d.id = i.department_id
      ORDER BY mf.created_at DESC, mf.id DESC
      LIMIT 20
    `);

    const cards = [
      {
        label: "Total Interns",
        value: totalInterns,
        note: "Interns available for monitoring",
      },
      {
        label: "Active Interns",
        value: activeInterns,
        note: "Currently active interns",
      },
      {
        label: "Pending Work Logs",
        value: pendingWorkLogs,
        note: "Logs waiting for review",
      },
      {
        label: "Interns With Blockers",
        value: internsWithBlockers,
        note: "Need mentor guidance",
      },
      {
        label: "Today Attendance",
        value: todayAttendance,
        note: "Marked attendance today",
      },
      {
        label: "Certificates Issued",
        value: certificatesIssued,
        note: "Completed interns",
      },
    ];

    res.json({
      cards,
      interns,
      workLogs,
      attendance,
      feedback,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load mentor dashboard.",
      error: error.message,
    });
  }
});

router.post("/feedback", async (req, res) => {
  try {
    const user = await requireMentorAccess(req, res);
    if (!user) return;

    const { internId, rating, feedbackText, actionPlan } = req.body;

    if (!internId) {
      return res.status(400).json({
        message: "Intern is required.",
      });
    }

    if (!feedbackText || !String(feedbackText).trim()) {
      return res.status(400).json({
        message: "Feedback is required.",
      });
    }

    const cleanRating = Math.min(Math.max(Number(rating || 5), 1), 5);

    const result = await pool.query(
      `
      INSERT INTO mentor_feedback
      (
        mentor_id,
        intern_id,
        rating,
        feedback_text,
        action_plan,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
      `,
      [
        user.id,
        Number(internId),
        cleanRating,
        String(feedbackText).trim(),
        actionPlan ? String(actionPlan).trim() : null,
      ]
    );

    res.status(201).json({
      message: "Feedback added successfully.",
      feedback: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to add feedback.",
      error: error.message,
    });
  }
});

router.patch("/work-logs/:id/review", async (req, res) => {
  try {
    const user = await requireMentorAccess(req, res);
    if (!user) return;

    const { id } = req.params;
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
      [status, user.id, id]
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