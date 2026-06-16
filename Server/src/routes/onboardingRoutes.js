// Server/src/routes/onboardingRoutes.js

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "worksync_secret_key";

const generatePassword = () => {
  const random = Math.random().toString(36).slice(-6);
  return `WorkSync@${random}`;
};

const generateInternId = () => {
  return `WSI-${Date.now().toString().slice(-6)}`;
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

const assignDepartmentTraining = async (internId, departmentId) => {
  const coursesResult = await pool.query(
    `
    SELECT id
    FROM training_courses
    WHERE department_id = $1
    ORDER BY id ASC
    `,
    [departmentId]
  );

  for (const course of coursesResult.rows) {
    const assignmentResult = await pool.query(
      `
      INSERT INTO training_assignments (intern_id, course_id, status)
      VALUES ($1, $2, 'Assigned')
      ON CONFLICT (intern_id, course_id) DO NOTHING
      RETURNING id
      `,
      [internId, course.id]
    );

    let assignmentId = assignmentResult.rows[0]?.id;

    if (!assignmentId) {
      const existingAssignment = await pool.query(
        `
        SELECT id
        FROM training_assignments
        WHERE intern_id = $1 AND course_id = $2
        LIMIT 1
        `,
        [internId, course.id]
      );

      assignmentId = existingAssignment.rows[0]?.id;
    }

    if (assignmentId) {
      await pool.query(
        `
        INSERT INTO training_progress (assignment_id, module_id)
        SELECT $1, id
        FROM training_modules
        WHERE course_id = $2
        ON CONFLICT (assignment_id, module_id) DO NOTHING
        `,
        [assignmentId, course.id]
      );
    }
  }
};

router.get("/departments", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, code
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

router.get("/mentors", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, full_name, email, role
      FROM users
      WHERE role IN ('admin', 'hr', 'mentor')
      ORDER BY full_name ASC
    `);

    res.json({
      mentors: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load mentors.",
      error: error.message,
    });
  }
});

router.get("/interns", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        i.id,
        i.intern_id,
        i.full_name,
        i.email,
        i.joining_date,
        i.end_date,
        i.work_mode,
        i.status,
        d.name AS department_name,
        u.full_name AS mentor_name
      FROM interns i
      LEFT JOIN departments d ON d.id = i.department_id
      LEFT JOIN users u ON u.id = i.mentor_id
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

router.get("/my-profile", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        message: "Not logged in.",
      });
    }

    const result = await pool.query(
      `
      SELECT
        i.id,
        i.intern_id,
        i.full_name,
        i.email,
        i.joining_date,
        i.end_date,
        i.work_mode,
        i.status,
        d.name AS department_name,
        u.full_name AS mentor_name
      FROM interns i
      LEFT JOIN departments d ON d.id = i.department_id
      LEFT JOIN users u ON u.id = i.mentor_id
      WHERE i.email = $1
      LIMIT 1
      `,
      [user.email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Intern profile not found.",
      });
    }

    res.json({
      intern: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load intern profile.",
      error: error.message,
    });
  }
});

router.post("/convert/:applicantId", async (req, res) => {
  const client = await pool.connect();

  try {
    const { applicantId } = req.params;
    const { departmentId, mentorId, joiningDate, endDate, workMode } = req.body;

    if (!departmentId) {
      return res.status(400).json({
        message: "Department is required.",
      });
    }

    await client.query("BEGIN");

    const applicantResult = await client.query(
      `
      SELECT *
      FROM applicants
      WHERE id = $1
      LIMIT 1
      `,
      [applicantId]
    );

    if (applicantResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Applicant not found.",
      });
    }

    const applicant = applicantResult.rows[0];

    const temporaryPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const existingUserResult = await client.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [applicant.email]
    );

    let userId;

    if (existingUserResult.rows.length > 0) {
      userId = existingUserResult.rows[0].id;

      await client.query(
        `
        UPDATE users
        SET
          full_name = $1,
          password_hash = $2,
          role = 'intern',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        `,
        [applicant.full_name, hashedPassword, userId]
      );
    } else {
      const userResult = await client.query(
        `
        INSERT INTO users (full_name, email, password_hash, role)
        VALUES ($1, $2, $3, 'intern')
        RETURNING id
        `,
        [applicant.full_name, applicant.email, hashedPassword]
      );

      userId = userResult.rows[0].id;
    }

    const existingInternResult = await client.query(
      `
      SELECT id, intern_id
      FROM interns
      WHERE applicant_id = $1 OR LOWER(email) = LOWER($2)
      LIMIT 1
      `,
      [applicant.id, applicant.email]
    );

    let intern;
    let finalInternId;

    if (existingInternResult.rows.length > 0) {
      finalInternId = existingInternResult.rows[0].intern_id;

      const internResult = await client.query(
        `
        UPDATE interns
        SET
          user_id = $1,
          department_id = $2,
          mentor_id = $3,
          full_name = $4,
          email = $5,
          joining_date = $6,
          end_date = $7,
          work_mode = $8,
          status = 'Active',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
        RETURNING *
        `,
        [
          userId,
          departmentId,
          mentorId || null,
          applicant.full_name,
          applicant.email,
          joiningDate || null,
          endDate || null,
          workMode || "Remote",
          existingInternResult.rows[0].id,
        ]
      );

      intern = internResult.rows[0];
    } else {
      finalInternId = generateInternId();

      const internResult = await client.query(
        `
        INSERT INTO interns
        (
          applicant_id,
          user_id,
          department_id,
          mentor_id,
          intern_id,
          full_name,
          email,
          joining_date,
          end_date,
          work_mode,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Active')
        RETURNING *
        `,
        [
          applicant.id,
          userId,
          departmentId,
          mentorId || null,
          finalInternId,
          applicant.full_name,
          applicant.email,
          joiningDate || null,
          endDate || null,
          workMode || "Remote",
        ]
      );

      intern = internResult.rows[0];
    }

    await client.query(
      `
      UPDATE applicants
      SET status = 'Onboarded', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [applicant.id]
    );

    await client.query("COMMIT");

    await assignDepartmentTraining(intern.id, departmentId);

    res.json({
      message:
        "Applicant onboarded successfully. Department training assigned automatically.",
      intern,
      credentials: {
        internId: finalInternId,
        email: applicant.email,
        temporaryPassword,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    res.status(500).json({
      message: "Onboarding failed.",
      error: error.message,
    });
  } finally {
    client.release();
  }
});

module.exports = router;