// Server/src/routes/auditRoutes.js

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

const requireAdmin = async (req, res) => {
  const user = await getUserFromRequest(req);

  if (!user) {
    res.status(401).json({
      message: "Please login first.",
    });

    return null;
  }

  if (user.role !== "admin") {
    res.status(403).json({
      message: "Only admin can view audit logs.",
    });

    return null;
  }

  return user;
};

router.get("/", async (req, res) => {
  try {
    const user = await requireAdmin(req, res);
    if (!user) return;

    const {
      search = "",
      role = "all",
      action = "all",
      date = "",
      limit = "100",
    } = req.query;

    const values = [];
    const conditions = [];

    if (search.trim()) {
      values.push(`%${search.trim()}%`);
      conditions.push(`
        (
          actor_name ILIKE $${values.length}
          OR actor_email ILIKE $${values.length}
          OR action ILIKE $${values.length}
          OR target_name ILIKE $${values.length}
          OR description ILIKE $${values.length}
          OR route ILIKE $${values.length}
        )
      `);
    }

    if (role !== "all") {
      values.push(role);
      conditions.push(`actor_role = $${values.length}`);
    }

    if (action !== "all") {
      values.push(action);
      conditions.push(`action = $${values.length}`);
    }

    if (date) {
      values.push(date);
      conditions.push(`DATE(created_at) = $${values.length}`);
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 300);

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const logsResult = await pool.query(
      `
      SELECT
        id,
        actor_id,
        actor_name,
        actor_email,
        actor_role,
        action,
        method,
        route,
        target_type,
        target_id,
        target_name,
        description,
        metadata,
        ip_address,
        created_at
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${safeLimit}
      `,
      values
    );

    const actionsResult = await pool.query(
      `
      SELECT DISTINCT action
      FROM audit_logs
      ORDER BY action ASC
      `
    );

    res.json({
      logs: logsResult.rows,
      actions: actionsResult.rows.map((item) => item.action),
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load audit logs.",
      error: error.message,
    });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const user = await requireAdmin(req, res);
    if (!user) return;

    const result = await pool.query(`
      SELECT
        COUNT(*) AS total_logs,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) AS today_logs,
        COUNT(CASE WHEN actor_role = 'admin' THEN 1 END) AS admin_actions,
        COUNT(CASE WHEN actor_role = 'hr' THEN 1 END) AS hr_actions,
        COUNT(CASE WHEN actor_role = 'intern' THEN 1 END) AS intern_actions
      FROM audit_logs
    `);

    res.json({
      summary: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load audit summary.",
      error: error.message,
    });
  }
});

module.exports = router;