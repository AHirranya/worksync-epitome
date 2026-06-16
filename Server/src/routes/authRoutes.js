// Server/src/routes/authRoutes.js

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "worksync_secret_key";

const allowedRoles = ["admin", "hr", "mentor", "intern", "user"];

const createToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

const setTokenCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const formatUser = (user) => {
  return {
    id: user.id,
    fullName: user.full_name,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
  };
};

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

router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: "Full name, email, and password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters.",
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

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

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users
      (
        full_name,
        email,
        password_hash,
        role
      )
      VALUES ($1, $2, $3, 'user')
      RETURNING id, full_name, email, role
      `,
      [fullName.trim(), cleanEmail, passwordHash]
    );

    res.status(201).json({
      message: "Registration successful. Please login.",
      user: formatUser(result.rows[0]),
    });
  } catch (error) {
    res.status(500).json({
      message: "Registration failed.",
      error: error.message,
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        message: "Email, password, and role are required.",
      });
    }

    const selectedRole = String(role).trim().toLowerCase();

    if (!allowedRoles.includes(selectedRole)) {
      return res.status(400).json({
        message: "Invalid role selected.",
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const result = await pool.query(
      `
      SELECT id, full_name, email, password_hash, role
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const user = result.rows[0];

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const actualRole = String(user.role).toLowerCase();

    if (actualRole !== selectedRole) {
      return res.status(403).json({
        message: `Role mismatch. This account is registered as ${actualRole}, not ${selectedRole}.`,
      });
    }

    const token = createToken(user);
    setTokenCookie(res, token);

    res.json({
      message: "Login successful.",
      user: formatUser(user),
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed.",
      error: error.message,
    });
  }
});

router.get("/me", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        message: "Not logged in.",
      });
    }

    res.json({
      user: formatUser(user),
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load user.",
      error: error.message,
    });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  res.json({
    message: "Logout successful.",
  });
});

module.exports = router;