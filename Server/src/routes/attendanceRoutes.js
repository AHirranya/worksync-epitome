// Server/src/routes/attendanceRoutes.js

const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "worksync_secret_key_change_this";
const STANDARD_WORK_MINUTES = 8 * 60;

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

const getInternByEmail = async (email) => {
  const result = await pool.query(
    `
    SELECT id, full_name, email, department_id
    FROM interns
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1
    `,
    [email]
  );

  return result.rows[0] || null;
};

const minutesBetween = (start, end) => {
  if (!start || !end) return 0;

  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  if (Number.isNaN(startTime) || Number.isNaN(endTime)) return 0;

  return Math.max(0, Math.ceil((endTime - startTime) / 60000));
};

const getTodayAttendance = async (internId) => {
  const result = await pool.query(
    `
    SELECT *
    FROM attendance
    WHERE intern_id = $1
    AND attendance_date = CURRENT_DATE
    LIMIT 1
    `,
    [internId]
  );

  return result.rows[0] || null;
};

const getBreaks = async (attendanceId) => {
  const result = await pool.query(
    `
    SELECT *
    FROM attendance_breaks
    WHERE attendance_id = $1
    ORDER BY break_start ASC, id ASC
    `,
    [attendanceId]
  );

  return result.rows;
};

const buildAttendanceResponse = async (attendance) => {
  if (!attendance) return null;

  const breaks = await getBreaks(attendance.id);
  const activeBreak = breaks.find((item) => !item.break_end);

  const completedBreakMinutes = breaks.reduce((total, item) => {
    if (!item.break_end) return total;
    return total + Number(item.break_minutes || 0);
  }, 0);

  const activeBreakMinutes = activeBreak
    ? minutesBetween(activeBreak.break_start, new Date())
    : 0;

  const computedBreakMinutes = completedBreakMinutes + activeBreakMinutes;

  let computedNetMinutes = Number(attendance.net_work_minutes || 0);

  if (attendance.check_in && !attendance.check_out) {
    const totalDuration = minutesBetween(attendance.check_in, new Date());
    computedNetMinutes = Math.max(0, totalDuration - computedBreakMinutes);
  }

  return {
    ...attendance,
    breaks,
    has_active_break: Boolean(activeBreak),
    active_break_start: activeBreak?.break_start || null,
    completed_break_minutes: completedBreakMinutes,
    computed_break_minutes: computedBreakMinutes,
    computed_net_minutes: computedNetMinutes,
    is_overtime: computedNetMinutes > STANDARD_WORK_MINUTES,
  };
};

router.post("/check-in", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        message: "Please login first.",
      });
    }

    if (user.role !== "intern") {
      return res.status(403).json({
        message: "Only interns can mark attendance.",
      });
    }

    const intern = await getInternByEmail(user.email);

    if (!intern) {
      return res.status(404).json({
        message: "Intern profile not found.",
      });
    }

    const existingAttendance = await getTodayAttendance(intern.id);

    if (existingAttendance?.check_in) {
      return res.status(409).json({
        message: "You already checked in today.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO attendance
      (
        intern_id,
        attendance_date,
        check_in,
        status
      )
      VALUES ($1, CURRENT_DATE, CURRENT_TIMESTAMP, 'Checked In')
      RETURNING *
      `,
      [intern.id]
    );

    const attendance = await buildAttendanceResponse(result.rows[0]);

    res.status(201).json({
      message: "Check-in successful.",
      attendance,
    });
  } catch (error) {
    res.status(500).json({
      message: "Check-in failed.",
      error: error.message,
    });
  }
});

router.post("/break-start", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        message: "Please login first.",
      });
    }

    if (user.role !== "intern") {
      return res.status(403).json({
        message: "Only interns can start break.",
      });
    }

    const intern = await getInternByEmail(user.email);

    if (!intern) {
      return res.status(404).json({
        message: "Intern profile not found.",
      });
    }

    const attendance = await getTodayAttendance(intern.id);

    if (!attendance?.check_in) {
      return res.status(400).json({
        message: "Please check in before starting a break.",
      });
    }

    if (attendance.check_out) {
      return res.status(400).json({
        message: "You already checked out today.",
      });
    }

    const activeBreakResult = await pool.query(
      `
      SELECT id
      FROM attendance_breaks
      WHERE attendance_id = $1
      AND break_end IS NULL
      LIMIT 1
      `,
      [attendance.id]
    );

    if (activeBreakResult.rows.length > 0) {
      return res.status(409).json({
        message: "A break is already active. End the current break first.",
      });
    }

    await pool.query(
      `
      INSERT INTO attendance_breaks
      (
        attendance_id,
        intern_id,
        break_start
      )
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      `,
      [attendance.id, intern.id]
    );

    await pool.query(
      `
      UPDATE attendance
      SET status = 'On Break',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [attendance.id]
    );

    const updatedAttendance = await getTodayAttendance(intern.id);

    res.json({
      message: "Break started successfully.",
      attendance: await buildAttendanceResponse(updatedAttendance),
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to start break.",
      error: error.message,
    });
  }
});

router.post("/break-end", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        message: "Please login first.",
      });
    }

    if (user.role !== "intern") {
      return res.status(403).json({
        message: "Only interns can end break.",
      });
    }

    const intern = await getInternByEmail(user.email);

    if (!intern) {
      return res.status(404).json({
        message: "Intern profile not found.",
      });
    }

    const attendance = await getTodayAttendance(intern.id);

    if (!attendance?.check_in) {
      return res.status(400).json({
        message: "Please check in first.",
      });
    }

    if (attendance.check_out) {
      return res.status(400).json({
        message: "You already checked out today.",
      });
    }

    const activeBreakResult = await pool.query(
      `
      SELECT *
      FROM attendance_breaks
      WHERE attendance_id = $1
      AND break_end IS NULL
      ORDER BY break_start DESC
      LIMIT 1
      `,
      [attendance.id]
    );

    if (activeBreakResult.rows.length === 0) {
      return res.status(400).json({
        message: "No active break found.",
      });
    }

    const activeBreak = activeBreakResult.rows[0];
    const breakEnd = new Date();
    const breakMinutes = minutesBetween(activeBreak.break_start, breakEnd);

    await pool.query(
      `
      UPDATE attendance_breaks
      SET break_end = $1,
          break_minutes = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      `,
      [breakEnd, breakMinutes, activeBreak.id]
    );

    await pool.query(
      `
      UPDATE attendance
      SET status = 'Checked In',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [attendance.id]
    );

    const updatedAttendance = await getTodayAttendance(intern.id);

    res.json({
      message: "Break ended successfully.",
      attendance: await buildAttendanceResponse(updatedAttendance),
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to end break.",
      error: error.message,
    });
  }
});

router.post("/check-out", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        message: "Please login first.",
      });
    }

    if (user.role !== "intern") {
      return res.status(403).json({
        message: "Only interns can check out.",
      });
    }

    const intern = await getInternByEmail(user.email);

    if (!intern) {
      return res.status(404).json({
        message: "Intern profile not found.",
      });
    }

    const attendance = await getTodayAttendance(intern.id);

    if (!attendance?.check_in) {
      return res.status(400).json({
        message: "Please check in before checking out.",
      });
    }

    if (attendance.check_out) {
      return res.status(409).json({
        message: "You already checked out today.",
      });
    }

    const activeBreakResult = await pool.query(
      `
      SELECT id
      FROM attendance_breaks
      WHERE attendance_id = $1
      AND break_end IS NULL
      LIMIT 1
      `,
      [attendance.id]
    );

    if (activeBreakResult.rows.length > 0) {
      return res.status(400).json({
        message: "Please end your active break before checking out.",
      });
    }

    const breakResult = await pool.query(
      `
      SELECT COALESCE(SUM(break_minutes), 0) AS total_break_minutes
      FROM attendance_breaks
      WHERE attendance_id = $1
      `,
      [attendance.id]
    );

    const checkOutTime = new Date();
    const totalBreakMinutes = Number(
      breakResult.rows[0]?.total_break_minutes || 0
    );

    const totalDurationMinutes = minutesBetween(attendance.check_in, checkOutTime);
    const netWorkMinutes = Math.max(
      0,
      totalDurationMinutes - totalBreakMinutes
    );

    const { overtimeReason } = req.body;

    if (
      netWorkMinutes > STANDARD_WORK_MINUTES &&
      !String(overtimeReason || "").trim()
    ) {
      return res.status(400).json({
        message:
          "Net working time is more than 8 hours. Overtime reason is required before checkout.",
      });
    }

    const status =
      netWorkMinutes > STANDARD_WORK_MINUTES ? "Overtime" : "Present";

    const result = await pool.query(
      `
      UPDATE attendance
      SET check_out = $1,
          total_break_minutes = $2,
          net_work_minutes = $3,
          overtime_reason = $4,
          status = $5,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
      `,
      [
        checkOutTime,
        totalBreakMinutes,
        netWorkMinutes,
        netWorkMinutes > STANDARD_WORK_MINUTES
          ? String(overtimeReason).trim()
          : null,
        status,
        attendance.id,
      ]
    );

    res.json({
      message: "Check-out successful.",
      attendance: await buildAttendanceResponse(result.rows[0]),
    });
  } catch (error) {
    res.status(500).json({
      message: "Check-out failed.",
      error: error.message,
    });
  }
});

router.get("/today", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        message: "Please login first.",
      });
    }

    if (user.role !== "intern") {
      return res.status(403).json({
        message: "Only interns can view today's attendance.",
      });
    }

    const intern = await getInternByEmail(user.email);

    if (!intern) {
      return res.status(404).json({
        message: "Intern profile not found.",
      });
    }

    const attendance = await getTodayAttendance(intern.id);

    res.json({
      attendance: await buildAttendanceResponse(attendance),
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load today's attendance.",
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

    if (user.role !== "intern") {
      return res.status(403).json({
        message: "Only interns can view attendance history.",
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
        a.*,
        COALESCE(COUNT(ab.id), 0) AS break_count
      FROM attendance a
      LEFT JOIN attendance_breaks ab ON ab.attendance_id = a.id
      WHERE a.intern_id = $1
      GROUP BY a.id
      ORDER BY a.attendance_date DESC, a.created_at DESC
      `,
      [intern.id]
    );

    res.json({
      attendance: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load attendance history.",
      error: error.message,
    });
  }
});

router.get("/hr", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        message: "Please login first.",
      });
    }

    if (!["hr", "admin", "mentor"].includes(user.role)) {
      return res.status(403).json({
        message: "Only HR/Admin/Mentor can view attendance records.",
      });
    }

    const result = await pool.query(
      `
      SELECT
        a.*,
        i.full_name AS intern_name,
        i.email AS intern_email,
        d.name AS department_name,
        COALESCE(COUNT(ab.id), 0) AS break_count
      FROM attendance a
      JOIN interns i ON i.id = a.intern_id
      LEFT JOIN departments d ON d.id = i.department_id
      LEFT JOIN attendance_breaks ab ON ab.attendance_id = a.id
      GROUP BY a.id, i.full_name, i.email, d.name
      ORDER BY a.attendance_date DESC, a.created_at DESC
      `
    );

    res.json({
      attendance: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load attendance records.",
      error: error.message,
    });
  }
});

module.exports = router;