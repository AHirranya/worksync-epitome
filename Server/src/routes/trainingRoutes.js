// Server/src/routes/trainingRoutes.js

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

const requireRoles = (user, allowedRoles, res) => {
  if (!allowedRoles.includes(user.role)) {
    res.status(403).json({
      message: "You do not have permission for this action.",
    });

    return false;
  }

  return true;
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

const normalizeModuleType = (type) => {
  const cleanType = String(type || "").trim().toLowerCase();

  if (["quiz", "assessment", "exam"].includes(cleanType)) return "test";
  if (["video", "videos"].includes(cleanType)) return "video";
  if (["theory", "reading", "notes"].includes(cleanType)) return "theory";
  if (cleanType === "test") return "test";

  return cleanType || "theory";
};

const normalizeQuestions = (questions) => {
  if (!questions) return [];

  if (Array.isArray(questions)) return questions;

  try {
    return JSON.parse(questions);
  } catch (error) {
    return [];
  }
};

const getModuleById = async (moduleId) => {
  const result = await pool.query(
    `
    SELECT
      id,
      course_id,
      title,
      description,
      module_type,
      theory_content,
      content,
      video_url,
      module_order,
      estimated_minutes,
      passing_score,
      test_questions
    FROM training_modules
    WHERE id = $1
    LIMIT 1
    `,
    [moduleId]
  );

  return result.rows[0] || null;
};

const checkInternAssignedToCourse = async (internId, courseId) => {
  const result = await pool.query(
    `
    SELECT id
    FROM training_assignments
    WHERE intern_id = $1
    AND course_id = $2
    LIMIT 1
    `,
    [internId, courseId]
  );

  return result.rows.length > 0;
};

const checkPreviousModulesCompleted = async (internId, module) => {
  const currentOrder = Number(module.module_order || module.id);

  const result = await pool.query(
    `
    SELECT COUNT(*) AS incomplete_count
    FROM training_modules tm
    LEFT JOIN training_progress tp
      ON tp.module_id = tm.id
      AND tp.intern_id = $1
    WHERE tm.course_id = $2
    AND COALESCE(tm.module_order, tm.id) < $3
    AND LOWER(COALESCE(tp.status, 'not_started')) <> 'completed'
    `,
    [internId, module.course_id, currentOrder]
  );

  return Number(result.rows[0]?.incomplete_count || 0) === 0;
};

const upsertProgress = async ({
  internId,
  moduleId,
  status,
  score = 0,
  answers = {},
}) => {
  const result = await pool.query(
    `
    INSERT INTO training_progress
    (
      intern_id,
      module_id,
      status,
      score,
      answers,
      attempt_count,
      completed_at,
      updated_at
    )
    VALUES
    (
      $1,
      $2,
      $3,
      $4,
      $5::jsonb,
      1,
      CASE WHEN $3 = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (intern_id, module_id)
    DO UPDATE SET
      status = EXCLUDED.status,
      score = EXCLUDED.score,
      answers = EXCLUDED.answers,
      attempt_count = training_progress.attempt_count + 1,
      completed_at =
        CASE
          WHEN EXCLUDED.status = 'completed' THEN CURRENT_TIMESTAMP
          ELSE training_progress.completed_at
        END,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
    `,
    [internId, moduleId, status, score, JSON.stringify(answers)]
  );

  return result.rows[0];
};

router.get("/courses", async (req, res) => {
  try {
    const user = await requireLogin(req, res);
    if (!user) return;

    if (!requireRoles(user, ["admin", "hr", "mentor"], res)) return;

    const result = await pool.query(
      `
      SELECT id, title, description, created_at
      FROM training_courses
      ORDER BY created_at DESC, id DESC
      `
    );

    res.json({
      courses: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load training courses.",
      error: error.message,
    });
  }
});

router.post("/courses", async (req, res) => {
  try {
    const user = await requireLogin(req, res);
    if (!user) return;

    if (!requireRoles(user, ["admin", "hr"], res)) return;

    const { title, description } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({
        message: "Course title is required.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO training_courses (title, description)
      VALUES ($1, $2)
      RETURNING *
      `,
      [String(title).trim(), description ? String(description).trim() : null]
    );

    res.status(201).json({
      message: "Training course created successfully.",
      course: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create training course.",
      error: error.message,
    });
  }
});

router.get("/modules", async (req, res) => {
  try {
    const user = await requireLogin(req, res);
    if (!user) return;

    if (!requireRoles(user, ["admin", "hr", "mentor"], res)) return;

    const { courseId } = req.query;

    const result = await pool.query(
      `
      SELECT
        tm.id,
        tm.course_id,
        tc.title AS course_title,
        tm.title,
        tm.description,
        tm.module_type,
        tm.theory_content,
        tm.content,
        tm.video_url,
        tm.module_order,
        tm.estimated_minutes,
        tm.passing_score,
        tm.test_questions
      FROM training_modules tm
      JOIN training_courses tc ON tc.id = tm.course_id
      WHERE ($1::INTEGER IS NULL OR tm.course_id = $1)
      ORDER BY tm.course_id, COALESCE(tm.module_order, tm.id), tm.id
      `,
      [courseId ? Number(courseId) : null]
    );

    const modules = result.rows.map((module) => ({
      ...module,
      module_type: normalizeModuleType(module.module_type),
      test_questions: normalizeQuestions(module.test_questions),
    }));

    res.json({
      modules,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load training modules.",
      error: error.message,
    });
  }
});

router.post("/modules", async (req, res) => {
  try {
    const user = await requireLogin(req, res);
    if (!user) return;

    if (!requireRoles(user, ["admin", "hr"], res)) return;

    const {
      courseId,
      title,
      description,
      moduleType,
      theoryContent,
      content,
      videoUrl,
      moduleOrder,
      estimatedMinutes,
      passingScore,
      testQuestions,
    } = req.body;

    if (!courseId || !title || !moduleType) {
      return res.status(400).json({
        message: "Course, title, and module type are required.",
      });
    }

    const cleanModuleType = normalizeModuleType(moduleType);

    if (!["theory", "video", "test"].includes(cleanModuleType)) {
      return res.status(400).json({
        message: "Module type must be theory, video, or test.",
      });
    }

    let finalOrder = moduleOrder ? Number(moduleOrder) : null;

    if (!finalOrder) {
      const orderResult = await pool.query(
        `
        SELECT COALESCE(MAX(module_order), 0) + 1 AS next_order
        FROM training_modules
        WHERE course_id = $1
        `,
        [Number(courseId)]
      );

      finalOrder = Number(orderResult.rows[0]?.next_order || 1);
    }

    const result = await pool.query(
      `
      INSERT INTO training_modules
      (
        course_id,
        title,
        description,
        module_type,
        theory_content,
        content,
        video_url,
        module_order,
        estimated_minutes,
        passing_score,
        test_questions
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
      RETURNING *
      `,
      [
        Number(courseId),
        String(title).trim(),
        description ? String(description).trim() : null,
        cleanModuleType,
        theoryContent ? String(theoryContent).trim() : null,
        content ? String(content).trim() : null,
        videoUrl ? String(videoUrl).trim() : null,
        finalOrder,
        estimatedMinutes ? Number(estimatedMinutes) : 3,
        passingScore ? Number(passingScore) : 70,
        JSON.stringify(testQuestions || []),
      ]
    );

    res.status(201).json({
      message: "Training module created successfully.",
      module: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create training module.",
      error: error.message,
    });
  }
});

const assignTraining = async (req, res) => {
  try {
    const user = await requireLogin(req, res);
    if (!user) return;

    if (!requireRoles(user, ["admin", "hr"], res)) return;

    const { internId, courseId } = req.body;

    if (!internId || !courseId) {
      return res.status(400).json({
        message: "Intern and course are required.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO training_assignments (intern_id, course_id)
      VALUES ($1, $2)
      ON CONFLICT (intern_id, course_id)
      DO UPDATE SET assigned_at = CURRENT_TIMESTAMP
      RETURNING *
      `,
      [Number(internId), Number(courseId)]
    );

    res.status(201).json({
      message: "Training assigned successfully.",
      assignment: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to assign training.",
      error: error.message,
    });
  }
};

router.post("/assignments", assignTraining);
router.post("/assign", assignTraining);

const getMyTraining = async (req, res) => {
  try {
    const user = await requireLogin(req, res);
    if (!user) return;

    if (user.role !== "intern") {
      return res.status(403).json({
        message: "Only interns can view assigned training.",
      });
    }

    const intern = await getInternByEmail(user.email);

    if (!intern) {
      return res.status(404).json({
        message: "Intern profile not found.",
        courses: [],
      });
    }

    const assignmentsResult = await pool.query(
      `
      SELECT
        ta.id AS assignment_id,
        ta.course_id,
        ta.assigned_at,
        tc.title AS course_title,
        tc.description AS course_description
      FROM training_assignments ta
      JOIN training_courses tc ON tc.id = ta.course_id
      WHERE ta.intern_id = $1
      ORDER BY ta.assigned_at DESC, ta.id DESC
      `,
      [intern.id]
    );

    const courses = [];

    for (const assignment of assignmentsResult.rows) {
      const modulesResult = await pool.query(
        `
        SELECT
          tm.id,
          tm.course_id,
          tm.title,
          tm.description,
          tm.module_type,
          tm.theory_content,
          tm.content,
          tm.video_url,
          tm.module_order,
          tm.estimated_minutes,
          tm.passing_score,
          tm.test_questions,
          COALESCE(tp.status, 'not_started') AS progress_status,
          COALESCE(tp.score, 0) AS score,
          tp.completed_at,
          tp.updated_at,
          COALESCE(tp.attempt_count, 0) AS attempt_count
        FROM training_modules tm
        LEFT JOIN training_progress tp
          ON tp.module_id = tm.id
          AND tp.intern_id = $1
        WHERE tm.course_id = $2
        ORDER BY COALESCE(tm.module_order, tm.id), tm.id
        `,
        [intern.id, assignment.course_id]
      );

      let canOpenCurrentModule = true;

      const modules = modulesResult.rows.map((module) => {
        const cleanType = normalizeModuleType(module.module_type);
        const isCompleted =
          String(module.progress_status || "").toLowerCase() === "completed";

        const isLocked = !canOpenCurrentModule;

        if (!isCompleted) {
          canOpenCurrentModule = false;
        }

        return {
          ...module,
          module_type: cleanType,
          test_questions: normalizeQuestions(module.test_questions),
          is_completed: isCompleted,
          is_locked: isLocked,
          is_unlocked: !isLocked,
        };
      });

      courses.push({
        assignmentId: assignment.assignment_id,
        courseId: assignment.course_id,
        title: assignment.course_title,
        description: assignment.course_description,
        assignedAt: assignment.assigned_at,
        modules,
      });
    }

    res.json({
      intern,
      courses,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load intern training.",
      error: error.message,
    });
  }
};

router.get("/my", getMyTraining);
router.get("/my-training", getMyTraining);

router.post("/modules/:moduleId/complete", async (req, res) => {
  try {
    const user = await requireLogin(req, res);
    if (!user) return;

    if (user.role !== "intern") {
      return res.status(403).json({
        message: "Only interns can complete modules.",
      });
    }

    const intern = await getInternByEmail(user.email);

    if (!intern) {
      return res.status(404).json({
        message: "Intern profile not found.",
      });
    }

    const { moduleId } = req.params;
    const { confirmStudied, confirmWatched, studySeconds } = req.body;

    const module = await getModuleById(moduleId);

    if (!module) {
      return res.status(404).json({
        message: "Training module not found.",
      });
    }

    const moduleType = normalizeModuleType(module.module_type);

    if (moduleType === "test") {
      return res.status(400).json({
        message: "Tests must be completed by submitting answers.",
      });
    }

    const isAssigned = await checkInternAssignedToCourse(
      intern.id,
      module.course_id
    );

    if (!isAssigned) {
      return res.status(403).json({
        message: "This module is not assigned to you.",
      });
    }

    const previousCompleted = await checkPreviousModulesCompleted(
      intern.id,
      module
    );

    if (!previousCompleted) {
      return res.status(403).json({
        message: "Complete previous modules before opening this module.",
      });
    }

    if (moduleType === "theory") {
      const estimatedMinutes = Number(module.estimated_minutes || 3);
      const requiredSeconds = Math.min(Math.max(estimatedMinutes, 1) * 60, 300);
      const cleanStudySeconds = Number(studySeconds || 0);

      if (!confirmStudied) {
        return res.status(400).json({
          message: "Please confirm that you studied and understood the theory.",
        });
      }

      if (cleanStudySeconds < requiredSeconds) {
        return res.status(400).json({
          message: `Study this theory for at least ${Math.ceil(
            requiredSeconds / 60
          )} minute(s) before completing it.`,
        });
      }
    }

    if (moduleType === "video" && !confirmWatched) {
      return res.status(400).json({
        message: "Please confirm that you watched the video module.",
      });
    }

    const progress = await upsertProgress({
      internId: intern.id,
      moduleId: Number(moduleId),
      status: "completed",
      score: 100,
      answers: {
        completedBy: user.email,
        moduleType,
      },
    });

    res.json({
      message: "Module completed successfully. Next module is now unlocked.",
      progress,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to complete module.",
      error: error.message,
    });
  }
});

router.post("/modules/:moduleId/test-submit", async (req, res) => {
  try {
    const user = await requireLogin(req, res);
    if (!user) return;

    if (user.role !== "intern") {
      return res.status(403).json({
        message: "Only interns can submit tests.",
      });
    }

    const intern = await getInternByEmail(user.email);

    if (!intern) {
      return res.status(404).json({
        message: "Intern profile not found.",
      });
    }

    const { moduleId } = req.params;
    const { answers } = req.body;

    const module = await getModuleById(moduleId);

    if (!module) {
      return res.status(404).json({
        message: "Training module not found.",
      });
    }

    const moduleType = normalizeModuleType(module.module_type);

    if (moduleType !== "test") {
      return res.status(400).json({
        message: "This module is not a test.",
      });
    }

    const isAssigned = await checkInternAssignedToCourse(
      intern.id,
      module.course_id
    );

    if (!isAssigned) {
      return res.status(403).json({
        message: "This test is not assigned to you.",
      });
    }

    const previousCompleted = await checkPreviousModulesCompleted(
      intern.id,
      module
    );

    if (!previousCompleted) {
      return res.status(403).json({
        message: "Complete previous modules before taking this test.",
      });
    }

    const questions = normalizeQuestions(module.test_questions);

    if (questions.length === 0) {
      const progress = await upsertProgress({
        internId: intern.id,
        moduleId: Number(moduleId),
        status: "completed",
        score: 100,
        answers: {},
      });

      return res.json({
        message: "Test completed successfully.",
        passed: true,
        score: 100,
        correctCount: 0,
        totalQuestions: 0,
        progress,
      });
    }

    let correctCount = 0;
    const cleanAnswers = answers || {};

    questions.forEach((question, index) => {
      const userAnswer = cleanAnswers[index];
      const userAnswerNumber = Number(userAnswer);

      let isCorrect = false;

      if (
        question.correctIndex !== undefined &&
        Number(question.correctIndex) === userAnswerNumber
      ) {
        isCorrect = true;
      }

      if (question.correctAnswer !== undefined) {
        const correctAnswer = String(question.correctAnswer)
          .trim()
          .toLowerCase();

        const selectedOption =
          Array.isArray(question.options) && question.options[userAnswerNumber]
            ? String(question.options[userAnswerNumber]).trim().toLowerCase()
            : String(userAnswer || "").trim().toLowerCase();

        if (selectedOption === correctAnswer) {
          isCorrect = true;
        }
      }

      if (isCorrect) correctCount += 1;
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passingScore = Number(module.passing_score || 70);
    const passed = score >= passingScore;

    const progress = await upsertProgress({
      internId: intern.id,
      moduleId: Number(moduleId),
      status: passed ? "completed" : "failed",
      score,
      answers: cleanAnswers,
    });

    res.json({
      message: passed
        ? "Test passed. Next module is now unlocked."
        : `Test failed. You need at least ${passingScore}% to pass.`,
      passed,
      score,
      passingScore,
      correctCount,
      totalQuestions: questions.length,
      progress,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to submit test.",
      error: error.message,
    });
  }
});

module.exports = router;