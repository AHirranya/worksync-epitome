// Server/src/routes/certificateRoutes.js

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

const requireLogin = async (req, res) => {
  const user = await getUserFromRequest(req);

  if (!user) {
    res.status(401).json({
      message: "Please login first.",
    });

    return null;
  }

  return user;
};

const getInternByEmail = async (email) => {
  const result = await pool.query(
    `
    SELECT
      i.id,
      i.full_name,
      i.email,
      i.department_id,
      i.status,
      d.name AS department_name
    FROM interns i
    LEFT JOIN departments d ON d.id = i.department_id
    WHERE LOWER(i.email) = LOWER($1)
    LIMIT 1
    `,
    [email]
  );

  return result.rows[0] || null;
};

const getInternById = async (internId) => {
  const result = await pool.query(
    `
    SELECT
      i.id,
      i.full_name,
      i.email,
      i.department_id,
      i.status,
      d.name AS department_name
    FROM interns i
    LEFT JOIN departments d ON d.id = i.department_id
    WHERE i.id = $1
    LIMIT 1
    `,
    [internId]
  );

  return result.rows[0] || null;
};

const createCertificateNumber = () => {
  const year = new Date().getFullYear();
  const randomNumber = Math.floor(100000 + Math.random() * 900000);

  return `WS-CERT-${year}-${randomNumber}`;
};

const createVerificationCode = () => {
  const partOne = Math.random().toString(36).substring(2, 8).toUpperCase();
  const partTwo = Math.random().toString(36).substring(2, 8).toUpperCase();
  const partThree = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `VERIFY-${partOne}-${partTwo}-${partThree}`;
};

const calculateTrainingEligibility = async (internId) => {
  const result = await pool.query(
    `
    SELECT
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
    WHERE ta.intern_id = $1
    AND LOWER(COALESCE(tm.module_type, '')) IN ('theory', 'video')
    `,
    [internId]
  );

  const totalModules = Number(result.rows[0]?.total_modules || 0);
  const completedModules = Number(result.rows[0]?.completed_modules || 0);

  const trainingPercent =
    totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  return {
    totalModules,
    completedModules,
    trainingPercent,
    eligible: totalModules > 0 && trainingPercent >= 75,
    requiredPercent: 75,
  };
};

const getCertificateByInternId = async (internId) => {
  const result = await pool.query(
    `
    SELECT
      c.id,
      c.intern_id,
      c.certificate_number,
      c.verification_code,
      c.title,
      c.status,
      c.issued_at,
      c.created_at,
      c.updated_at,
      i.full_name AS intern_name,
      i.email AS intern_email,
      d.name AS department_name
    FROM certificates c
    JOIN interns i ON i.id = c.intern_id
    LEFT JOIN departments d ON d.id = i.department_id
    WHERE c.intern_id = $1
    LIMIT 1
    `,
    [internId]
  );

  return result.rows[0] || null;
};

const getCertificateResponse = async (intern) => {
  const eligibility = await calculateTrainingEligibility(intern.id);
  const certificate = await getCertificateByInternId(intern.id);

  return {
    intern: {
      id: intern.id,
      full_name: intern.full_name,
      intern_name: intern.full_name,
      email: intern.email,
      department_name: intern.department_name,
      status: intern.status,
    },
    eligibility,
    certificate,
  };
};

router.get("/my", async (req, res) => {
  try {
    const user = await requireLogin(req, res);
    if (!user) return;

    if (user.role !== "intern") {
      return res.status(403).json({
        message: "Only interns can view their certificate.",
      });
    }

    const intern = await getInternByEmail(user.email);

    if (!intern) {
      return res.status(404).json({
        message: "Intern profile not found.",
      });
    }

    const response = await getCertificateResponse(intern);

    res.json(response);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load certificate.",
      error: error.message,
    });
  }
});

router.get("/hr", async (req, res) => {
  try {
    const user = await requireLogin(req, res);
    if (!user) return;

    if (!["hr", "admin", "mentor"].includes(user.role)) {
      return res.status(403).json({
        message: "Only HR/Admin/Mentor can view certificates.",
      });
    }

    const internsResult = await pool.query(
      `
      SELECT
        i.id,
        i.full_name,
        i.email,
        i.status,
        d.name AS department_name
      FROM interns i
      LEFT JOIN departments d ON d.id = i.department_id
      ORDER BY i.created_at DESC, i.id DESC
      `
    );

    const interns = [];

    for (const intern of internsResult.rows) {
      const eligibility = await calculateTrainingEligibility(intern.id);
      const certificate = await getCertificateByInternId(intern.id);

      interns.push({
        ...intern,
        intern_name: intern.full_name,
        eligibility,
        certificate,
      });
    }

    res.json({
      interns,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load certificate records.",
      error: error.message,
    });
  }
});

const generateCertificate = async (req, res) => {
  try {
    const user = await requireLogin(req, res);
    if (!user) return;

    if (!["hr", "admin"].includes(user.role)) {
      return res.status(403).json({
        message: "Only HR/Admin can generate certificates.",
      });
    }

    const internId = req.params.internId || req.body.internId;

    if (!internId) {
      return res.status(400).json({
        message: "Intern ID is required.",
      });
    }

    const intern = await getInternById(Number(internId));

    if (!intern) {
      return res.status(404).json({
        message: "Intern not found.",
      });
    }

    const eligibility = await calculateTrainingEligibility(intern.id);

    if (!eligibility.eligible) {
      return res.status(400).json({
        message: `Intern is not eligible yet. Minimum 75% theory/video training completion required. Current progress is ${eligibility.trainingPercent}%.`,
        eligibility,
      });
    }

    const certificateNumber = createCertificateNumber();
    const verificationCode = createVerificationCode();

    const result = await pool.query(
      `
      INSERT INTO certificates
      (
        intern_id,
        certificate_number,
        verification_code,
        title,
        status,
        issued_at,
        created_at,
        updated_at
      )
      VALUES
      (
        $1,
        $2,
        $3,
        'Training Completion Certificate',
        'Issued',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (intern_id)
      DO UPDATE SET
        certificate_number = certificates.certificate_number,
        verification_code = certificates.verification_code,
        title = 'Training Completion Certificate',
        status = 'Issued',
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
      `,
      [intern.id, certificateNumber, verificationCode]
    );

    const certificate = await getCertificateByInternId(intern.id);

    res.status(201).json({
      message: "Certificate generated successfully.",
      certificate: certificate || result.rows[0],
      eligibility,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to generate certificate.",
      error: error.message,
    });
  }
};

router.post("/generate", generateCertificate);
router.post("/generate/:internId", generateCertificate);

router.get("/eligibility/:internId", async (req, res) => {
  try {
    const user = await requireLogin(req, res);
    if (!user) return;

    if (!["hr", "admin", "mentor"].includes(user.role)) {
      return res.status(403).json({
        message: "Only HR/Admin/Mentor can check certificate eligibility.",
      });
    }

    const intern = await getInternById(Number(req.params.internId));

    if (!intern) {
      return res.status(404).json({
        message: "Intern not found.",
      });
    }

    const eligibility = await calculateTrainingEligibility(intern.id);

    res.json({
      intern,
      eligibility,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to check eligibility.",
      error: error.message,
    });
  }
});

module.exports = router;