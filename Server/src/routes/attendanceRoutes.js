// Server/src/routes/attendanceRoutes.js

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

router.post("/check-in", async (req, res) => {
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

    const existingResult = await pool.query(
      `
      SELECT *
      FROM attendance
      WHERE intern_id = $1
      AND attendance_date = CURRENT_DATE
      LIMIT 1
      `,
      [intern.id]
    );

    if (existingResult.rows.length > 0 && existingResult.rows[0].check_in) {
      return res.status(409).json({
        message: "You have already checked in today.",
        attendance: existingResult.rows[0],
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
      VALUES ($1, CURRENT_DATE, CURRENT_TIMESTAMP, 'Present')
      ON CONFLICT (intern_id, attendance_date)
      DO UPDATE SET
        check_in = COALESCE(attendance.check_in, CURRENT_TIMESTAMP),
        status = 'Present',
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
      `,
      [intern.id]
    );

    res.json({
      message: "Check-in successful.",
      attendance: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Check-in failed.",
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

    const intern = await getInternByEmail(user.email);

    if (!intern) {
      return res.status(404).json({
        message: "Intern profile not found.",
      });
    }

    const existingResult = await pool.query(
      `
      SELECT *
      FROM attendance
      WHERE intern_id = $1
      AND attendance_date = CURRENT_DATE
      LIMIT 1
      `,
      [intern.id]
    );

    if (existingResult.rows.length === 0 || !existingResult.rows[0].check_in) {
      return res.status(400).json({
        message: "Please check in first.",
      });
    }

    if (existingResult.rows[0].check_out) {
      return res.status(409).json({
        message: "You have already checked out today.",
        attendance: existingResult.rows[0],
      });
    }

    const result = await pool.query(
      `
      UPDATE attendance
      SET
        check_out = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE intern_id = $1
      AND attendance_date = CURRENT_DATE
      RETURNING *
      `,
      [intern.id]
    );

    res.json({
      message: "Check-out successful.",
      attendance: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Check-out failed.",
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
        attendance_date,
        check_in,
        check_out,
        status,
        remarks,
        created_at
      FROM attendance
      WHERE intern_id = $1
      ORDER BY attendance_date DESC
      LIMIT 30
      `,
      [intern.id]
    );

    res.json({
      attendance: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load attendance.",
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

    const intern = await getInternByEmail(user.email);

    if (!intern) {
      return res.status(404).json({
        message: "Intern profile not found.",
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM attendance
      WHERE intern_id = $1
      AND attendance_date = CURRENT_DATE
      LIMIT 1
      `,
      [intern.id]
    );

    res.json({
      attendance: result.rows[0] || null,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load today's attendance.",
      error: error.message,
    });
  }
});

router.get("/hr", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.id,
        a.attendance_date,
        a.check_in,
        a.check_out,
        a.status,
        a.remarks,
        i.intern_id,
        i.full_name AS intern_name,
        i.email AS intern_email,
        d.name AS department_name
      FROM attendance a
      JOIN interns i ON i.id = a.intern_id
      LEFT JOIN departments d ON d.id = i.department_id
      ORDER BY a.attendance_date DESC, a.created_at DESC
      LIMIT 200
    `);

    res.json({
      attendance: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load HR attendance.",
      error: error.message,
    });
  }
});

module.exports = router;