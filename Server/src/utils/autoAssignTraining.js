// Server/src/utils/autoAssignTraining.js

const pool = require("../config/db");

const ensureTrainingTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS training_courses (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      domain VARCHAR(120),
      department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      is_default BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    ALTER TABLE training_courses
    ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;
  `);

  await pool.query(`
    ALTER TABLE training_courses
    ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT true;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS training_modules (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      video_url TEXT,
      resource_url TEXT,
      module_order INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS intern_training_assignments (
      id SERIAL PRIMARY KEY,
      intern_id INTEGER NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
      status VARCHAR(50) DEFAULT 'Assigned',
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(intern_id, course_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS intern_training_progress (
      id SERIAL PRIMARY KEY,
      assignment_id INTEGER NOT NULL REFERENCES intern_training_assignments(id) ON DELETE CASCADE,
      module_id INTEGER NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
      is_completed BOOLEAN DEFAULT false,
      completed_at TIMESTAMP,
      UNIQUE(assignment_id, module_id)
    );
  `);
};

const createDefaultModules = (departmentName) => {
  return [
    {
      title: "Company Orientation",
      content:
        "Understand company policies, internship rules, communication process, attendance rules, reporting structure, and basic work culture.",
      moduleOrder: 1,
    },
    {
      title: `${departmentName} Department Overview`,
      content: `Understand the purpose, workflow, tools, responsibilities, and expected outcomes of the ${departmentName} department.`,
      moduleOrder: 2,
    },
    {
      title: `${departmentName} Tools and Workflow`,
      content: `Learn the common tools, daily workflow, documentation process, reporting method, and collaboration process used in ${departmentName}.`,
      moduleOrder: 3,
    },
    {
      title: `${departmentName} Practical Task Guidelines`,
      content: `Understand how to complete practical work, submit updates, communicate doubts, and report progress in the ${departmentName} department.`,
      moduleOrder: 4,
    },
  ];
};

const ensureDepartmentCourse = async (departmentId) => {
  const departmentResult = await pool.query(
    `
    SELECT id, name, code
    FROM departments
    WHERE id = $1
    `,
    [departmentId]
  );

  if (departmentResult.rows.length === 0) {
    return null;
  }

  const department = departmentResult.rows[0];

  const existingCourseResult = await pool.query(
    `
    SELECT id
    FROM training_courses
    WHERE department_id = $1 AND is_default = true
    LIMIT 1
    `,
    [department.id]
  );

  let courseId;

  if (existingCourseResult.rows.length > 0) {
    courseId = existingCourseResult.rows[0].id;

    await pool.query(
      `
      UPDATE training_courses
      SET 
        title = $1,
        description = $2,
        domain = $3,
        department_id = $4,
        is_default = true
      WHERE id = $5
      `,
      [
        `${department.name} Default Training`,
        `Automatic training course for ${department.name} interns.`,
        department.name,
        department.id,
        courseId,
      ]
    );
  } else {
    const courseResult = await pool.query(
      `
      INSERT INTO training_courses
      (title, description, domain, department_id, is_default)
      VALUES ($1, $2, $3, $4, true)
      RETURNING id
      `,
      [
        `${department.name} Default Training`,
        `Automatic training course for ${department.name} interns.`,
        department.name,
        department.id,
      ]
    );

    courseId = courseResult.rows[0].id;
  }

  const modules = createDefaultModules(department.name);

  for (const module of modules) {
    const existingModuleResult = await pool.query(
      `
      SELECT id
      FROM training_modules
      WHERE course_id = $1 AND module_order = $2
      LIMIT 1
      `,
      [courseId, module.moduleOrder]
    );

    if (existingModuleResult.rows.length > 0) {
      await pool.query(
        `
        UPDATE training_modules
        SET title = $1, content = $2
        WHERE id = $3
        `,
        [module.title, module.content, existingModuleResult.rows[0].id]
      );
    } else {
      await pool.query(
        `
        INSERT INTO training_modules
        (course_id, title, content, video_url, resource_url, module_order)
        VALUES ($1, $2, $3, null, null, $4)
        `,
        [courseId, module.title, module.content, module.moduleOrder]
      );
    }
  }

  return courseId;
};

const autoAssignTrainingByDepartment = async ({ internId, departmentId }) => {
  try {
    if (!internId || !departmentId) {
      return {
        assigned: false,
        message: "Intern ID or Department ID missing.",
      };
    }

    await ensureTrainingTables();

    const courseId = await ensureDepartmentCourse(departmentId);

    if (!courseId) {
      return {
        assigned: false,
        message: "Department not found. Training not assigned.",
      };
    }

    const assignmentResult = await pool.query(
      `
      INSERT INTO intern_training_assignments (intern_id, course_id, status)
      VALUES ($1, $2, 'Assigned')
      ON CONFLICT (intern_id, course_id) DO NOTHING
      RETURNING id
      `,
      [internId, courseId]
    );

    let assignmentId = assignmentResult.rows[0]?.id;

    if (!assignmentId) {
      const existingAssignmentResult = await pool.query(
        `
        SELECT id
        FROM intern_training_assignments
        WHERE intern_id = $1 AND course_id = $2
        `,
        [internId, courseId]
      );

      assignmentId = existingAssignmentResult.rows[0]?.id;
    }

    if (assignmentId) {
      await pool.query(
        `
        INSERT INTO intern_training_progress (assignment_id, module_id)
        SELECT $1, id
        FROM training_modules
        WHERE course_id = $2
        ON CONFLICT (assignment_id, module_id) DO NOTHING
        `,
        [assignmentId, courseId]
      );
    }

    return {
      assigned: true,
      message: "Department training assigned automatically.",
    };
  } catch (error) {
    console.error("Auto training assignment failed:", error.message);

    return {
      assigned: false,
      message: "Intern onboarded, but automatic training assignment failed.",
    };
  }
};

module.exports = {
  autoAssignTrainingByDepartment,
};