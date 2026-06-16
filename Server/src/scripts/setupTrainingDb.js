// Server/src/scripts/setupTrainingDb.js

const pool = require("../config/db");

const defaultDepartments = [
  { name: "Business Development", code: "BD" },
  { name: "Business Analytics", code: "BA" },
  { name: "Consulting", code: "CONSULTING" },
  { name: "Civil & Construction", code: "CIVIL" },
  { name: "Design", code: "DESIGN" },
  { name: "Hospitality", code: "HOSPITALITY" },
  { name: "Human Resources", code: "HR" },
  { name: "IT", code: "IT" },
  { name: "Marketing", code: "MARKETING" },
  { name: "Operations", code: "OPERATIONS" },
  { name: "Sales", code: "SALES" },
  { name: "Training & EdTech", code: "EDTECH" },
];

const createDepartmentModules = (departmentName) => {
  return [
    {
      title: "Company Orientation",
      content:
        "Understand company policies, internship rules, communication process, attendance rules, reporting structure, and basic work culture.",
      videoUrl: "",
      resourceUrl: "",
      moduleOrder: 1,
    },
    {
      title: `${departmentName} Department Overview`,
      content: `Understand the purpose, workflow, tools, responsibilities, and expected outcomes of the ${departmentName} department.`,
      videoUrl: "",
      resourceUrl: "",
      moduleOrder: 2,
    },
    {
      title: `${departmentName} Tools and Workflow`,
      content: `Learn the common tools, daily workflow, documentation process, reporting method, and collaboration process used in ${departmentName}.`,
      videoUrl: "",
      resourceUrl: "",
      moduleOrder: 3,
    },
    {
      title: `${departmentName} Practical Task Guidelines`,
      content: `Understand how to complete practical work, submit updates, communicate doubts, and report progress in the ${departmentName} department.`,
      videoUrl: "",
      resourceUrl: "",
      moduleOrder: 4,
    },
  ];
};

const setupTrainingDb = async () => {
  try {
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

    const departmentCountResult = await pool.query(`
      SELECT COUNT(*) AS count
      FROM departments
    `);

    const departmentCount = Number(departmentCountResult.rows[0].count);

    if (departmentCount === 0) {
      for (const department of defaultDepartments) {
        await pool.query(
          `
          INSERT INTO departments (name, code)
          VALUES ($1, $2)
          `,
          [department.name, department.code]
        );
      }
    }

    const departmentsResult = await pool.query(`
      SELECT id, name, code
      FROM departments
      ORDER BY id ASC
    `);

    for (const department of departmentsResult.rows) {
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

      const modules = createDepartmentModules(department.name);

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
            SET
              title = $1,
              content = $2,
              video_url = $3,
              resource_url = $4
            WHERE id = $5
            `,
            [
              module.title,
              module.content,
              module.videoUrl,
              module.resourceUrl,
              existingModuleResult.rows[0].id,
            ]
          );
        } else {
          await pool.query(
            `
            INSERT INTO training_modules
            (course_id, title, content, video_url, resource_url, module_order)
            VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [
              courseId,
              module.title,
              module.content,
              module.videoUrl,
              module.resourceUrl,
              module.moduleOrder,
            ]
          );
        }
      }
    }

    console.log("Department-based automatic training setup completed.");
  } catch (error) {
    console.error("Training DB setup failed:", error.message);
  } finally {
    await pool.end();
  }
};

setupTrainingDb();