// Server/src/routes/certificateRoutes.js

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

const calculateEligibility = async (internId) => {
  const trainingResult = await pool.query(
    `
    SELECT
      COUNT(tm.id)::int AS total_required_modules,
      COUNT(
        CASE
          WHEN tp.is_completed = true THEN 1
        END
      )::int AS completed_required_modules
    FROM training_assignments ta
    JOIN training_modules tm ON tm.course_id = ta.course_id
    LEFT JOIN training_progress tp
      ON tp.assignment_id = ta.id
      AND tp.module_id = tm.id
    WHERE ta.intern_id = $1
    AND LOWER(tm.module_type) IN ('theory', 'video')
    `,
    [internId]
  );

  const row = trainingResult.rows[0];

  const totalRequiredModules = Number(row.total_required_modules || 0);
  const completedRequiredModules = Number(row.completed_required_modules || 0);

  const trainingPercent =
    totalRequiredModules === 0
      ? 0
      : Math.round((completedRequiredModules / totalRequiredModules) * 100);

  const eligible = totalRequiredModules > 0 && trainingPercent >= 75;

  const missingRequirements = [];

  if (totalRequiredModules === 0) {
    missingRequirements.push("No theory/video training modules assigned yet.");
  }

  if (trainingPercent < 75) {
    missingRequirements.push(
      "Complete at least 75% of theory and video training modules."
    );
  }

  return {
    eligible,
    missingRequirements,
    totalRequiredModules,
    completedRequiredModules,
    trainingPercent,
    requiredPercent: 75,
  };
};

const getCertificateForIntern = async (internId) => {
  const result = await pool.query(
    `
    SELECT
      c.id,
      c.certificate_number,
      c.verification_code,
      c.title,
      c.status,
      c.issued_at,
      u.full_name AS issued_by_name
    FROM certificates c
    LEFT JOIN users u ON u.id = c.issued_by
    WHERE c.intern_id = $1
    LIMIT 1
    `,
    [internId]
  );

  return result.rows[0] || null;
};

const generateCertificateNumber = (internId) => {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);

  return `WS-CERT-${year}-${internId}-${random}`;
};

const generateVerificationCode = () => {
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();

  return `VERIFY-${random}-${timestamp}`;
};

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
        message: "Only HR/Admin/Mentor can view certificates.",
      });
    }

    const internsResult = await pool.query(`
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

    const certificates = [];

    for (const intern of internsResult.rows) {
      const eligibility = await calculateEligibility(intern.id);
      const certificate = await getCertificateForIntern(intern.id);

      certificates.push({
        ...intern,
        eligibility,
        certificate,
      });
    }

    res.json({
      certificates,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load certificate data.",
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

    const internResult = await pool.query(
      `
      SELECT
        i.id,
        i.intern_id,
        i.full_name,
        i.email,
        i.status,
        d.name AS department_name
      FROM interns i
      LEFT JOIN departments d ON d.id = i.department_id
      WHERE LOWER(i.email) = LOWER($1)
      LIMIT 1
      `,
      [user.email]
    );

    if (internResult.rows.length === 0) {
      return res.status(404).json({
        message: "Intern profile not found.",
      });
    }

    const intern = internResult.rows[0];
    const eligibility = await calculateEligibility(intern.id);
    const certificate = await getCertificateForIntern(intern.id);

    res.json({
      intern,
      eligibility,
      certificate,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load your certificate.",
      error: error.message,
    });
  }
});

router.post("/generate/:internId", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        message: "Please login first.",
      });
    }

    if (!["hr", "admin", "mentor"].includes(user.role)) {
      return res.status(403).json({
        message: "Only HR/Admin/Mentor can generate certificates.",
      });
    }

    const { internId } = req.params;

    const internResult = await pool.query(
      `
      SELECT id, intern_id, full_name, email
      FROM interns
      WHERE id = $1
      LIMIT 1
      `,
      [internId]
    );

    if (internResult.rows.length === 0) {
      return res.status(404).json({
        message: "Intern not found.",
      });
    }

    const existingCertificate = await getCertificateForIntern(internId);

    if (existingCertificate) {
      return res.status(409).json({
        message: "Certificate already generated for this intern.",
        certificate: existingCertificate,
      });
    }

    const eligibility = await calculateEligibility(internId);

    if (!eligibility.eligible) {
      return res.status(400).json({
        message:
          "Intern is not eligible yet. They must complete at least 75% of theory/video training.",
        missingRequirements: eligibility.missingRequirements,
        eligibility,
      });
    }

    const certificateNumber = generateCertificateNumber(internId);
    const verificationCode = generateVerificationCode();

    const result = await pool.query(
      `
      INSERT INTO certificates
      (
        intern_id,
        issued_by,
        certificate_number,
        verification_code,
        title,
        status
      )
      VALUES ($1, $2, $3, $4, 'Training Completion Certificate', 'Issued')
      RETURNING *
      `,
      [internId, user.id, certificateNumber, verificationCode]
    );

    res.status(201).json({
      message: "Certificate generated successfully.",
      certificate: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to generate certificate.",
      error: error.message,
    });
  }
});

router.get("/verify/:verificationCode", async (req, res) => {
  try {
    const { verificationCode } = req.params;

    const result = await pool.query(
      `
      SELECT
        c.certificate_number,
        c.verification_code,
        c.title,
        c.status,
        c.issued_at,
        i.intern_id,
        i.full_name AS intern_name,
        i.email AS intern_email,
        d.name AS department_name
      FROM certificates c
      JOIN interns i ON i.id = c.intern_id
      LEFT JOIN departments d ON d.id = i.department_id
      WHERE c.verification_code = $1
      LIMIT 1
      `,
      [verificationCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        valid: false,
        message: "Certificate not found.",
      });
    }

    res.json({
      valid: true,
      certificate: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to verify certificate.",
      error: error.message,
    });
  }
});

module.exports = router;