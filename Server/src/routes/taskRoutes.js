// Server/src/routes/taskRoutes.js

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

router.get("/interns", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        i.id,
        i.intern_id,
        i.full_name,
        i.email,
        i.status,
        d.name AS department_name
      FROM interns i
      LEFT JOIN departments d ON d.id = i.department_id
      ORDER BY i.created_at DESC
    `);

    res.json({
      interns: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load interns.",
      error: error.message,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        message: "Please login first.",
      });
    }

    if (!["hr", "admin", "mentor"].includes(user.role)) {
      return res.status(403).json({
        message: "Only HR/Admin/Mentor can assign tasks.",
      });
    }

    const { internId, title, description, priority, dueDate } = req.body;

    if (!internId || !title) {
      return res.status(400).json({
        message: "Intern and task title are required.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO tasks
      (
        intern_id,
        assigned_by,
        title,
        description,
        priority,
        due_date,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'Assigned')
      RETURNING *
      `,
      [
        internId,
        user.id,
        title,
        description || null,
        priority || "Medium",
        dueDate || null,
      ]
    );

    res.status(201).json({
      message: "Task assigned successfully.",
      task: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to assign task.",
      error: error.message,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        t.id,
        t.title,
        t.description,
        t.priority,
        t.due_date,
        t.status,
        t.created_at,
        i.intern_id,
        i.full_name AS intern_name,
        i.email AS intern_email,
        d.name AS department_name,
        u.full_name AS assigned_by_name
      FROM tasks t
      JOIN interns i ON i.id = t.intern_id
      LEFT JOIN departments d ON d.id = i.department_id
      LEFT JOIN users u ON u.id = t.assigned_by
      ORDER BY t.created_at DESC
    `);

    res.json({
      tasks: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load tasks.",
      error: error.message,
    });
  }
});

router.get("/my-tasks", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        message: "Please login first.",
      });
    }

    const internResult = await pool.query(
      `
      SELECT id
      FROM interns
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [user.email]
    );

    if (internResult.rows.length === 0) {
      return res.status(404).json({
        message: "Intern profile not found.",
      });
    }

    const internId = internResult.rows[0].id;

    const result = await pool.query(
      `
      SELECT
        t.id,
        t.title,
        t.description,
        t.priority,
        t.due_date,
        t.status,
        t.created_at,
        u.full_name AS assigned_by_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_by
      WHERE t.intern_id = $1
      ORDER BY t.created_at DESC
      `,
      [internId]
    );

    res.json({
      tasks: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load your tasks.",
      error: error.message,
    });
  }
});

router.patch("/:taskId/status", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        message: "Please login first.",
      });
    }

    const { taskId } = req.params;
    const { status, updateText } = req.body;

    const allowedStatuses = [
      "Assigned",
      "In Progress",
      "Completed",
      "Blocked",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid task status.",
      });
    }

    const internResult = await pool.query(
      `
      SELECT id
      FROM interns
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [user.email]
    );

    const internId = internResult.rows[0]?.id || null;

    const result = await pool.query(
      `
      UPDATE tasks
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
      `,
      [status, taskId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    if (internId) {
      await pool.query(
        `
        INSERT INTO task_updates
        (task_id, intern_id, update_text, status)
        VALUES ($1, $2, $3, $4)
        `,
        [taskId, internId, updateText || null, status]
      );
    }

    res.json({
      message: "Task status updated successfully.",
      task: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update task status.",
      error: error.message,
    });
  }
});

router.get("/:taskId/updates", async (req, res) => {
  try {
    const { taskId } = req.params;

    const result = await pool.query(
      `
      SELECT
        tu.id,
        tu.update_text,
        tu.status,
        tu.created_at,
        i.full_name AS intern_name
      FROM task_updates tu
      LEFT JOIN interns i ON i.id = tu.intern_id
      WHERE tu.task_id = $1
      ORDER BY tu.created_at DESC
      `,
      [taskId]
    );

    res.json({
      updates: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load task updates.",
      error: error.message,
    });
  }
});

module.exports = router;