// Server/src/scripts/assignTrainingToExistingInterns.js

require("dotenv").config();
const pool = require("../config/db");

const assignTrainingToIntern = async (intern) => {
  const coursesResult = await pool.query(
    `
    SELECT id
    FROM training_courses
    WHERE department_id = $1
    `,
    [intern.department_id]
  );

  for (const course of coursesResult.rows) {
    const assignmentResult = await pool.query(
      `
      INSERT INTO training_assignments (intern_id, course_id, status)
      VALUES ($1, $2, 'Assigned')
      ON CONFLICT (intern_id, course_id) DO NOTHING
      RETURNING id
      `,
      [intern.id, course.id]
    );

    let assignmentId = assignmentResult.rows[0]?.id;

    if (!assignmentId) {
      const existingAssignmentResult = await pool.query(
        `
        SELECT id
        FROM training_assignments
        WHERE intern_id = $1 AND course_id = $2
        LIMIT 1
        `,
        [intern.id, course.id]
      );

      assignmentId = existingAssignmentResult.rows[0]?.id;
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

const run = async () => {
  try {
    const internsResult = await pool.query(`
      SELECT id, intern_id, full_name, email, department_id
      FROM interns
      WHERE department_id IS NOT NULL
      ORDER BY id ASC
    `);

    for (const intern of internsResult.rows) {
      await assignTrainingToIntern(intern);
      console.log(`Training assigned for: ${intern.full_name}`);
    }

    console.log("Training assignment completed successfully.");
  } catch (error) {
    console.error("Training assignment failed:", error.message);
  } finally {
    await pool.end();
  }
};

run();