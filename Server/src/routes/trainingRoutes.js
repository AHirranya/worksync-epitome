// Server/src/routes/trainingRoutes.js

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

const updateAssignmentStatus = async (assignmentId) => {
  const progressResult = await pool.query(
    `
    SELECT
      COUNT(tm.id)::int AS total_modules,
      COUNT(CASE WHEN tp.is_completed = true THEN 1 END)::int AS completed_modules
    FROM training_assignments ta
    JOIN training_modules tm ON tm.course_id = ta.course_id
    LEFT JOIN training_progress tp
      ON tp.assignment_id = ta.id
      AND tp.module_id = tm.id
    WHERE ta.id = $1
    `,
    [assignmentId]
  );

  const progress = progressResult.rows[0];

  if (
    Number(progress.total_modules) > 0 &&
    Number(progress.total_modules) === Number(progress.completed_modules)
  ) {
    await pool.query(
      `
      UPDATE training_assignments
      SET status = 'Completed'
      WHERE id = $1
      `,
      [assignmentId]
    );
  } else if (Number(progress.completed_modules) > 0) {
    await pool.query(
      `
      UPDATE training_assignments
      SET status = 'In Progress'
      WHERE id = $1
      `,
      [assignmentId]
    );
  }
};

router.get("/assignments", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ta.id,
        ta.status,
        ta.assigned_at,
        i.intern_id,
        i.full_name AS intern_name,
        i.email AS intern_email,
        d.name AS department_name,
        tc.title AS course_title,
        COUNT(tm.id)::int AS total_modules,
        COUNT(CASE WHEN tp.is_completed = true THEN 1 END)::int AS completed_modules,
        CASE
          WHEN COUNT(tm.id) = 0 THEN 0
          ELSE ROUND(
            (COUNT(CASE WHEN tp.is_completed = true THEN 1 END)::decimal / COUNT(tm.id)) * 100
          )
        END AS progress_percent
      FROM training_assignments ta
      JOIN interns i ON i.id = ta.intern_id
      JOIN training_courses tc ON tc.id = ta.course_id
      LEFT JOIN departments d ON d.id = tc.department_id
      LEFT JOIN training_modules tm ON tm.course_id = tc.id
      LEFT JOIN training_progress tp
        ON tp.assignment_id = ta.id
        AND tp.module_id = tm.id
      GROUP BY ta.id, i.intern_id, i.full_name, i.email, d.name, tc.title
      ORDER BY ta.assigned_at DESC
    `);

    res.json({
      assignments: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load training assignments.",
      error: error.message,
    });
  }
});

router.get("/my-training", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        message: "Please login first.",
      });
    }

    const assignmentsResult = await pool.query(
      `
      SELECT
        ta.id AS assignment_id,
        ta.status,
        ta.assigned_at,
        tc.id AS course_id,
        tc.title AS course_title,
        tc.description AS course_description,
        d.name AS department_name,
        COUNT(tm.id)::int AS total_modules,
        COUNT(CASE WHEN tp.is_completed = true THEN 1 END)::int AS completed_modules,
        CASE
          WHEN COUNT(tm.id) = 0 THEN 0
          ELSE ROUND(
            (COUNT(CASE WHEN tp.is_completed = true THEN 1 END)::decimal / COUNT(tm.id)) * 100
          )
        END AS progress_percent
      FROM training_assignments ta
      JOIN interns i ON i.id = ta.intern_id
      JOIN training_courses tc ON tc.id = ta.course_id
      LEFT JOIN departments d ON d.id = tc.department_id
      LEFT JOIN training_modules tm ON tm.course_id = tc.id
      LEFT JOIN training_progress tp
        ON tp.assignment_id = ta.id
        AND tp.module_id = tm.id
      WHERE LOWER(i.email) = LOWER($1)
      GROUP BY ta.id, tc.id, d.name
      ORDER BY ta.assigned_at DESC
      `,
      [user.email]
    );

    const assignments = [];

    for (const assignment of assignmentsResult.rows) {
      const modulesResult = await pool.query(
        `
        SELECT
          tm.id AS module_id,
          tm.title,
          tm.content,
          tm.module_order,
          tm.module_type,
          tm.video_url,
          tm.passing_score,
          COALESCE(tp.is_completed, false) AS is_completed,
          tp.completed_at,
          (
            SELECT tta.score
            FROM training_test_attempts tta
            WHERE tta.assignment_id = $1
            AND tta.module_id = tm.id
            ORDER BY tta.attempted_at DESC
            LIMIT 1
          ) AS latest_score,
          (
            SELECT tta.passed
            FROM training_test_attempts tta
            WHERE tta.assignment_id = $1
            AND tta.module_id = tm.id
            ORDER BY tta.attempted_at DESC
            LIMIT 1
          ) AS latest_passed
        FROM training_modules tm
        LEFT JOIN training_progress tp
          ON tp.module_id = tm.id
          AND tp.assignment_id = $1
        WHERE tm.course_id = $2
        ORDER BY tm.module_order ASC, tm.id ASC
        `,
        [assignment.assignment_id, assignment.course_id]
      );

      const modules = [];

      for (const module of modulesResult.rows) {
        let questions = [];

        if (module.module_type === "test") {
          const questionsResult = await pool.query(
            `
            SELECT
              id,
              question,
              option_a,
              option_b,
              option_c,
              option_d
            FROM training_questions
            WHERE module_id = $1
            ORDER BY id ASC
            `,
            [module.module_id]
          );

          questions = questionsResult.rows;
        }

        modules.push({
          ...module,
          questions,
        });
      }

      assignments.push({
        ...assignment,
        modules,
      });
    }

    res.json({
      assignments,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load intern training.",
      error: error.message,
    });
  }
});

router.patch(
  "/progress/:assignmentId/modules/:moduleId/complete",
  async (req, res) => {
    try {
      const { assignmentId, moduleId } = req.params;

      await pool.query(
        `
        INSERT INTO training_progress
        (assignment_id, module_id, is_completed, completed_at)
        VALUES ($1, $2, true, CURRENT_TIMESTAMP)
        ON CONFLICT (assignment_id, module_id)
        DO UPDATE SET
          is_completed = true,
          completed_at = CURRENT_TIMESTAMP
        `,
        [assignmentId, moduleId]
      );

      await updateAssignmentStatus(assignmentId);

      res.json({
        message: "Module marked as completed.",
      });
    } catch (error) {
      res.status(500).json({
        message: "Failed to update training progress.",
        error: error.message,
      });
    }
  }
);

router.post("/test/:assignmentId/modules/:moduleId/submit", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        message: "Please login first.",
      });
    }

    const { assignmentId, moduleId } = req.params;
    const { answers } = req.body;

    const assignmentResult = await pool.query(
      `
      SELECT
        ta.id AS assignment_id,
        ta.intern_id,
        tm.id AS module_id,
        tm.passing_score
      FROM training_assignments ta
      JOIN training_modules tm ON tm.course_id = ta.course_id
      JOIN interns i ON i.id = ta.intern_id
      WHERE ta.id = $1
      AND tm.id = $2
      AND tm.module_type = 'test'
      AND LOWER(i.email) = LOWER($3)
      LIMIT 1
      `,
      [assignmentId, moduleId, user.email]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({
        message: "Test module not found.",
      });
    }

    const assignment = assignmentResult.rows[0];

    const questionsResult = await pool.query(
      `
      SELECT id, correct_option
      FROM training_questions
      WHERE module_id = $1
      ORDER BY id ASC
      `,
      [moduleId]
    );

    const questions = questionsResult.rows;

    if (questions.length === 0) {
      return res.status(400).json({
        message: "No questions found for this test.",
      });
    }

    let correctAnswers = 0;

    questions.forEach((question) => {
      const selectedAnswer = String(answers?.[question.id] || "").toUpperCase();

      if (selectedAnswer === question.correct_option) {
        correctAnswers += 1;
      }
    });

    const totalQuestions = questions.length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const passed = score >= Number(assignment.passing_score || 60);

    await pool.query(
      `
      INSERT INTO training_test_attempts
      (
        assignment_id,
        module_id,
        intern_id,
        score,
        total_questions,
        correct_answers,
        passed
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        assignmentId,
        moduleId,
        assignment.intern_id,
        score,
        totalQuestions,
        correctAnswers,
        passed,
      ]
    );

    if (passed) {
      await pool.query(
        `
        INSERT INTO training_progress
        (assignment_id, module_id, is_completed, completed_at)
        VALUES ($1, $2, true, CURRENT_TIMESTAMP)
        ON CONFLICT (assignment_id, module_id)
        DO UPDATE SET
          is_completed = true,
          completed_at = CURRENT_TIMESTAMP
        `,
        [assignmentId, moduleId]
      );
    } else {
      await pool.query(
        `
        INSERT INTO training_progress
        (assignment_id, module_id, is_completed)
        VALUES ($1, $2, false)
        ON CONFLICT (assignment_id, module_id)
        DO UPDATE SET
          is_completed = false
        `,
        [assignmentId, moduleId]
      );
    }

    await updateAssignmentStatus(assignmentId);

    res.json({
      message: passed
        ? "Test passed. Module completed."
        : "Test submitted, but passing score not reached. Try again.",
      score,
      totalQuestions,
      correctAnswers,
      passed,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to submit test.",
      error: error.message,
    });
  }
});

module.exports = router;