// Server/src/routes/adminRoutes.js

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "worksync_secret_key";

const allowedRoles = ["admin", "hr", "mentor", "intern", "user"];

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

const requireAdmin = async (req, res, next) => {
  const user = await getUserFromRequest(req);

  if (!user) {
    return res.status(401).json({
      message: "Please login first.",
    });
  }

  if (user.role !== "admin") {
    return res.status(403).json({
      message: "Only admin can access this section.",
    });
  }

  req.user = user;
  next();
};

const generateTempPassword = () => {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `WS@${random}2026`;
};

const countQuery = async (query, params = []) => {
  try {
    const result = await pool.query(query, params);
    return Number(result.rows[0]?.total || 0);
  } catch (error) {
    return 0;
  }
};

router.get("/summary", requireAdmin, async (req, res) => {
  try {
    const totalUsers = await countQuery(`
      SELECT COUNT(*)::int AS total FROM users
    `);

    const totalAdmins = await countQuery(`
      SELECT COUNT(*)::int AS total FROM users WHERE role = 'admin'
    `);

    const totalHRs = await countQuery(`
      SELECT COUNT(*)::int AS total FROM users WHERE role = 'hr'
    `);

    const totalMentors = await countQuery(`
      SELECT COUNT(*)::int AS total FROM users WHERE role = 'mentor'
    `);

    const totalInterns = await countQuery(`
      SELECT COUNT(*)::int AS total FROM interns
    `);

    const totalApplicants = await countQuery(`
      SELECT COUNT(*)::int AS total FROM applicants
    `);

    const selectedApplicants = await countQuery(`
      SELECT COUNT(*)::int AS total FROM applicants WHERE status = 'Selected'
    `);

    const certificatesIssued = await countQuery(`
      SELECT COUNT(*)::int AS total FROM certificates
    `);

    const totalDepartments = await countQuery(`
      SELECT COUNT(*)::int AS total FROM departments
    `);

    res.json({
      summary: {
        totalUsers,
        totalAdmins,
        totalHRs,
        totalMentors,
        totalInterns,
        totalApplicants,
        selectedApplicants,
        certificatesIssued,
        totalDepartments,
        certificateRule: "75% theory/video training completion",
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load admin summary.",
      error: error.message,
    });
  }
});

router.get("/users", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, full_name, email, role, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    res.json({
      users: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load users.",
      error: error.message,
    });
  }
});

router.post("/users", requireAdmin, async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !role) {
      return res.status(400).json({
        message: "Full name, email, and role are required.",
      });
    }

    const cleanRole = String(role).trim().toLowerCase();

    if (!allowedRoles.includes(cleanRole)) {
      return res.status(400).json({
        message: "Invalid role selected.",
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const tempPassword = password?.trim() || generateTempPassword();

    const existingUser = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [cleanEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "User already exists with this email.",
      });
    }

    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const result = await pool.query(
      `
      INSERT INTO users
      (
        full_name,
        email,
        password_hash,
        role
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, full_name, email, role, created_at
      `,
      [fullName.trim(), cleanEmail, passwordHash, cleanRole]
    );

    res.status(201).json({
      message: "User account created successfully.",
      user: result.rows[0],
      generatedPassword: tempPassword,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create user.",
      error: error.message,
    });
  }
});

router.patch("/users/:id/role", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const cleanRole = String(role || "").trim().toLowerCase();

    if (!allowedRoles.includes(cleanRole)) {
      return res.status(400).json({
        message: "Invalid role selected.",
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        role = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, full_name, email, role, created_at
      `,
      [cleanRole, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    res.json({
      message: "User role updated successfully.",
      user: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update user role.",
      error: error.message,
    });
  }
});

router.patch("/users/:id/reset-password", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const result = await pool.query(
      `
      UPDATE users
      SET
        password_hash = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, full_name, email, role
      `,
      [passwordHash, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    res.json({
      message: "Password reset successfully.",
      user: result.rows[0],
      generatedPassword: tempPassword,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to reset password.",
      error: error.message,
    });
  }
});

router.delete("/users/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (Number(id) === Number(req.user.id)) {
      return res.status(400).json({
        message: "You cannot delete your own admin account.",
      });
    }

    const result = await pool.query(
      `
      DELETE FROM users
      WHERE id = $1
      RETURNING id, full_name, email, role
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    res.json({
      message: "User deleted successfully.",
      user: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to delete user. This user may be connected to intern/certificate records.",
      error: error.message,
    });
  }
});

router.get("/departments", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, code, created_at
      FROM departments
      ORDER BY name ASC
    `);

    res.json({
      departments: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load departments.",
      error: error.message,
    });
  }
});

router.post("/departments", requireAdmin, async (req, res) => {
  try {
    const { name, code } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        message: "Department name and code are required.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO departments
      (
        name,
        code
      )
      VALUES ($1, $2)
      RETURNING id, name, code, created_at
      `,
      [name.trim(), code.trim().toUpperCase()]
    );

    res.status(201).json({
      message: "Department created successfully.",
      department: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create department.",
      error: error.message,
    });
  }
});

router.patch("/departments/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        message: "Department name and code are required.",
      });
    }

    const result = await pool.query(
      `
      UPDATE departments
      SET
        name = $1,
        code = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, name, code, created_at
      `,
      [name.trim(), code.trim().toUpperCase(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Department not found.",
      });
    }

    res.json({
      message: "Department updated successfully.",
      department: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update department.",
      error: error.message,
    });
  }
});

router.delete("/departments/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM departments
      WHERE id = $1
      RETURNING id, name, code
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Department not found.",
      });
    }

    res.json({
      message: "Department deleted successfully.",
      department: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to delete department. It may already be connected to interns or training.",
      error: error.message,
    });
  }
});

module.exports = router;