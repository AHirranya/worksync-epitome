// Server/src/routes/performanceRoutes.js

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

const calculatePerformance = async (internId) => {
  const trainingResult = await pool.query(
    `
    SELECT
      COUNT(tm.id)::int AS total_modules,
      COUNT(CASE WHEN tp.is_completed = true THEN 1 END)::int AS completed_modules
    FROM training_assignments ta
    JOIN training_modules tm ON tm.course_id = ta.course_id
    LEFT JOIN training_progress tp
      ON tp.assignment_id = ta.id
      AND tp.module_id = tm.id
    WHERE ta.intern_id = $1
    `,
    [internId]
  );

  const taskResult = await pool.query(
    `
    SELECT
      COUNT(*)::int AS total_tasks,
      COUNT(CASE WHEN status = 'Completed' THEN 1 END)::int AS completed_tasks
    FROM tasks
    WHERE intern_id = $1
    `,
    [internId]
  );

  const attendanceResult = await pool.query(
    `
    SELECT
      COUNT(*)::int AS total_attendance,
      COUNT(CASE WHEN status = 'Present' THEN 1 END)::int AS present_days
    FROM attendance
    WHERE intern_id = $1
    `,
    [internId]
  );

  const workLogResult = await pool.query(
    `
    SELECT
      COUNT(*)::int AS total_logs,
      COALESCE(
        SUM(
          CASE
            WHEN status = 'Reviewed' THEN 100
            WHEN status = 'Submitted' THEN 70
            WHEN status = 'Needs Improvement' THEN 40
            ELSE 50
          END
        ),
        0
      )::int AS total_log_points
    FROM work_logs
    WHERE intern_id = $1
    `,
    [internId]
  );

  const reviewResult = await pool.query(
    `
    SELECT
      pr.id,
      pr.rating,
      pr.feedback,
      pr.created_at,
      u.full_name AS reviewed_by_name
    FROM performance_reviews pr
    LEFT JOIN users u ON u.id = pr.reviewed_by
    WHERE pr.intern_id = $1
    ORDER BY pr.created_at DESC
    `,
    [internId]
  );

  const training = trainingResult.rows[0];
  const task = taskResult.rows[0];
  const attendance = attendanceResult.rows[0];
  const workLog = workLogResult.rows[0];

  const totalModules = Number(training.total_modules || 0);
  const completedModules = Number(training.completed_modules || 0);

  const totalTasks = Number(task.total_tasks || 0);
  const completedTasks = Number(task.completed_tasks || 0);

  const totalAttendance = Number(attendance.total_attendance || 0);
  const presentDays = Number(attendance.present_days || 0);

  const totalLogs = Number(workLog.total_logs || 0);
  const totalLogPoints = Number(workLog.total_log_points || 0);

  const trainingScore =
    totalModules === 0 ? 0 : Math.round((completedModules / totalModules) * 100);

  const taskScore =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const attendanceScore =
    totalAttendance === 0
      ? 0
      : Math.round((presentDays / totalAttendance) * 100);

  const workLogScore =
    totalLogs === 0 ? 0 : Math.round(totalLogPoints / totalLogs);

  const finalScore = Math.round(
    trainingScore * 0.3 +
      taskScore * 0.3 +
      attendanceScore * 0.2 +
      workLogScore * 0.2
  );

  let grade = "Needs Improvement";

  if (finalScore >= 90) {
    grade = "Excellent";
  } else if (finalScore >= 75) {
    grade = "Very Good";
  } else if (finalScore >= 60) {
    grade = "Good";
  } else if (finalScore >= 40) {
    grade = "Average";
  }

  return {
    trainingScore,
    taskScore,
    attendanceScore,
    workLogScore,
    finalScore,
    grade,
    totalModules,
    completedModules,
    totalTasks,
    completedTasks,
    totalAttendance,
    presentDays,
    totalLogs,
    reviews: reviewResult.rows,
    latestReview: reviewResult.rows[0] || null,
  };
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
        message: "Only HR/Admin/Mentor can view performance.",
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

    const performance = [];

    for (const intern of internsResult.rows) {
      const scores = await calculatePerformance(intern.id);

      performance.push({
        ...intern,
        ...scores,
      });
    }

    res.json({
      performance,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load HR performance.",
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
    const scores = await calculatePerformance(intern.id);

    res.json({
      performance: {
        ...intern,
        ...scores,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load your performance.",
      error: error.message,
    });
  }
});

router.post("/reviews", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        message: "Please login first.",
      });
    }

    if (!["hr", "admin", "mentor"].includes(user.role)) {
      return res.status(403).json({
        message: "Only HR/Admin/Mentor can review performance.",
      });
    }

    const { internId, rating, feedback } = req.body;

    if (!internId || !rating) {
      return res.status(400).json({
        message: "Intern and rating are required.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO performance_reviews
      (
        intern_id,
        reviewed_by,
        rating,
        feedback
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [internId, user.id, rating, feedback || null]
    );

    res.status(201).json({
      message: "Performance review submitted successfully.",
      review: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to submit performance review.",
      error: error.message,
    });
  }
});

module.exports = router;