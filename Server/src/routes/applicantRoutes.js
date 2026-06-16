// Server/src/routes/applicantRoutes.js

const express = require("express");
const pool = require("../config/db");

const router = express.Router();

const isValidUrl = (url) => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch (error) {
    return false;
  }
};

const isValidLinkedInUrl = (url) => {
  if (!isValidUrl(url)) return false;

  const parsedUrl = new URL(url);
  return parsedUrl.hostname.includes("linkedin.com");
};

const isValidGithubUrl = (url) => {
  if (!isValidUrl(url)) return false;

  const parsedUrl = new URL(url);
  return parsedUrl.hostname.includes("github.com");
};

router.post("/", async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      city,
      collegeName,
      degree,
      branch,
      yearOfStudy,
      cgpaPercentage,
      appliedRole,
      preferredDomain,
      applicationSource,
      skills,
      linkedinUrl,
      githubUrl,
      portfolioUrl,
      whyJoinUs,
      whyInterested,
      careerGoals,
      skillsToDevelop,
      whySelectYou,
    } = req.body;

    const requiredFields = [
      [fullName, "Full Name"],
      [email, "Email"],
      [phone, "Phone Number"],
      [city, "City"],
      [collegeName, "College Name"],
      [degree, "Degree"],
      [branch, "Branch"],
      [yearOfStudy, "Year of Study"],
      [cgpaPercentage, "CGPA / Percentage"],
      [appliedRole, "Applied Role"],
      [preferredDomain, "Preferred Domain"],
      [applicationSource, "Application Source"],
      [skills, "Skills"],
      [linkedinUrl, "LinkedIn URL"],
      [githubUrl, "GitHub URL"],
      [whyJoinUs, "Why Join Us"],
      [whyInterested, "Why Interested"],
      [careerGoals, "Career Goals"],
      [skillsToDevelop, "Skills To Develop"],
      [whySelectYou, "Why Select You"],
    ];

    for (const [value, label] of requiredFields) {
      if (!String(value || "").trim()) {
        return res.status(400).json({
          message: `${label} is required.`,
        });
      }
    }

    if (!isValidLinkedInUrl(linkedinUrl)) {
      return res.status(400).json({
        message:
          "Please enter a proper LinkedIn URL. Example: https://www.linkedin.com/in/username",
      });
    }

    if (!isValidGithubUrl(githubUrl)) {
      return res.status(400).json({
        message:
          "Please enter a proper GitHub URL. Example: https://github.com/username",
      });
    }

    if (portfolioUrl && !isValidUrl(portfolioUrl)) {
      return res.status(400).json({
        message:
          "Portfolio URL must be a proper URL if entered. Example: https://yourportfolio.com",
      });
    }

    const existingApplication = await pool.query(
      `
      SELECT id
      FROM applicants
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email.trim()]
    );

    if (existingApplication.rows.length > 0) {
      return res.status(409).json({
        message: "Application already exists with this email.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO applicants
      (
        full_name,
        email,
        phone,
        city,
        college_name,
        degree,
        branch,
        year_of_study,
        cgpa_percentage,
        applied_role,
        preferred_domain,
        application_source,
        skills,
        linkedin_url,
        github_url,
        portfolio_url,
        why_join_us,
        why_interested,
        career_goals,
        skills_to_develop,
        why_select_you,
        status
      )
      VALUES
      (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, 'Applied'
      )
      RETURNING *
      `,
      [
        fullName.trim(),
        email.trim().toLowerCase(),
        phone.trim(),
        city.trim(),
        collegeName.trim(),
        degree.trim(),
        branch.trim(),
        yearOfStudy.trim(),
        cgpaPercentage.trim(),
        appliedRole.trim(),
        preferredDomain.trim(),
        applicationSource.trim(),
        skills.trim(),
        linkedinUrl.trim(),
        githubUrl.trim(),
        portfolioUrl ? portfolioUrl.trim() : null,
        whyJoinUs.trim(),
        whyInterested.trim(),
        careerGoals.trim(),
        skillsToDevelop.trim(),
        whySelectYou.trim(),
      ]
    );

    res.status(201).json({
      message: "Application submitted successfully.",
      applicant: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to submit application.",
      error: error.message,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM applicants
      ORDER BY created_at DESC
    `);

    res.json({
      applicants: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load applicants.",
      error: error.message,
    });
  }
});

router.get("/stats/summary", async (req, res) => {
  try {
    const totalResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM applicants
    `);

    const shortlistedResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM applicants
      WHERE status = 'Shortlisted'
    `);

    const selectedResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM applicants
      WHERE status = 'Selected'
    `);

    const rejectedResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM applicants
      WHERE status = 'Rejected'
    `);

    const sourceResult = await pool.query(`
      SELECT application_source, COUNT(*)::int AS count
      FROM applicants
      GROUP BY application_source
      ORDER BY count DESC
    `);

    res.json({
      stats: {
        totalApplicants: totalResult.rows[0].total,
        shortlistedCandidates: shortlistedResult.rows[0].total,
        selectedCandidates: selectedResult.rows[0].total,
        rejectedCandidates: rejectedResult.rows[0].total,
        sourceWise: sourceResult.rows,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load applicant stats.",
      error: error.message,
    });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "Applied",
      "Under Review",
      "Shortlisted",
      "Selected",
      "Rejected",
      "Onboarded",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid applicant status.",
      });
    }

    const result = await pool.query(
      `
      UPDATE applicants
      SET
        status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
      `,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Applicant not found.",
      });
    }

    res.json({
      message: "Applicant status updated successfully.",
      applicant: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update applicant status.",
      error: error.message,
    });
  }
});

module.exports = router;