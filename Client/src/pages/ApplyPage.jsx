// Client/src/pages/ApplyPage.jsx

import { useState } from "react";
import api from "../api/api";

function ApplyPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    collegeName: "",
    degree: "",
    branch: "",
    yearOfStudy: "",
    cgpaPercentage: "",
    appliedRole: "",
    preferredDomain: "",
    applicationSource: "",
    skills: "",
    linkedinUrl: "",
    githubUrl: "",
    portfolioUrl: "",
    whyJoinUs: "",
    whyInterested: "",
    careerGoals: "",
    skillsToDevelop: "",
    whySelectYou: "",
  });

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);

  const domains = [
    "Business Development",
    "Business Analytics",
    "Consulting",
    "Civil & Construction",
    "Design",
    "Hospitality",
    "Human Resources",
    "IT",
    "Marketing",
    "Operations",
    "Sales",
    "Training & EdTech",
  ];

  const sources = [
    "Company Website",
    "LinkedIn",
    "Instagram",
    "College Placement Cell",
    "Friend Referral",
    "Job Portal",
    "Other",
  ];

  const updateField = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

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

  const validateForm = () => {
    const requiredFields = [
      ["fullName", "Full Name"],
      ["email", "Email"],
      ["phone", "Phone Number"],
      ["city", "City"],
      ["collegeName", "College Name"],
      ["degree", "Degree"],
      ["branch", "Branch"],
      ["yearOfStudy", "Year of Study"],
      ["cgpaPercentage", "CGPA / Percentage"],
      ["appliedRole", "Applied Role"],
      ["preferredDomain", "Domain"],
      ["applicationSource", "Application Source"],
      ["skills", "Skills"],
      ["linkedinUrl", "LinkedIn URL"],
      ["githubUrl", "GitHub URL"],
      ["whyJoinUs", "Why do you want to join us?"],
      ["whyInterested", "Why are you interested in this role?"],
      ["careerGoals", "Career Goals"],
      ["skillsToDevelop", "Skills To Develop"],
      ["whySelectYou", "Why should we select you?"],
    ];

    for (const [key, label] of requiredFields) {
      if (!String(formData[key] || "").trim()) {
        return `${label} is required.`;
      }
    }

    if (!isValidLinkedInUrl(formData.linkedinUrl)) {
      return "Please enter a proper LinkedIn URL. Example: https://www.linkedin.com/in/username";
    }

    if (!isValidGithubUrl(formData.githubUrl)) {
      return "Please enter a proper GitHub URL. Example: https://github.com/username";
    }

    if (formData.portfolioUrl.trim() && !isValidUrl(formData.portfolioUrl)) {
      return "Portfolio URL must be a proper URL if you enter it. Example: https://yourportfolio.com";
    }

    return null;
  };

  const submitApplication = async (e) => {
    e.preventDefault();

    setMessage("");
    setMessageType("");

    const validationError = validateForm();

    if (validationError) {
      setMessage(validationError);
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/applicants", {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        city: formData.city.trim(),
        collegeName: formData.collegeName.trim(),
        degree: formData.degree.trim(),
        branch: formData.branch.trim(),
        yearOfStudy: formData.yearOfStudy.trim(),
        cgpaPercentage: formData.cgpaPercentage.trim(),
        appliedRole: formData.appliedRole.trim(),
        preferredDomain: formData.preferredDomain.trim(),
        applicationSource: formData.applicationSource.trim(),
        skills: formData.skills.trim(),
        linkedinUrl: formData.linkedinUrl.trim(),
        githubUrl: formData.githubUrl.trim(),
        portfolioUrl: formData.portfolioUrl.trim() || null,
        whyJoinUs: formData.whyJoinUs.trim(),
        whyInterested: formData.whyInterested.trim(),
        careerGoals: formData.careerGoals.trim(),
        skillsToDevelop: formData.skillsToDevelop.trim(),
        whySelectYou: formData.whySelectYou.trim(),
      });

      setMessage(res.data.message || "Application submitted successfully.");
      setMessageType("success");

      setFormData({
        fullName: "",
        email: "",
        phone: "",
        city: "",
        collegeName: "",
        degree: "",
        branch: "",
        yearOfStudy: "",
        cgpaPercentage: "",
        appliedRole: "",
        preferredDomain: "",
        applicationSource: "",
        skills: "",
        linkedinUrl: "",
        githubUrl: "",
        portfolioUrl: "",
        whyJoinUs: "",
        whyInterested: "",
        careerGoals: "",
        skillsToDevelop: "",
        whySelectYou: "",
      });
    } catch (error) {
      setMessage(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to submit application."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>
        {`
          .apply-page {
            min-height: calc(100vh - 90px);
            background:
              radial-gradient(circle at top left, rgba(255, 122, 0, 0.14), transparent 34%),
              radial-gradient(circle at bottom right, rgba(255, 122, 0, 0.06), transparent 30%),
              #050505;
            padding: 58px 6%;
          }

          .apply-shell {
            width: 100%;
            max-width: 920px;
            margin: 0 auto;
            background: rgba(12, 12, 12, 0.96);
            border: 1px solid rgba(255, 122, 0, 0.25);
            border-radius: 28px;
            padding: 34px;
            box-shadow: 0 28px 80px rgba(0, 0, 0, 0.55);
          }

          .apply-header {
            margin-bottom: 28px;
          }

          .apply-header .eyebrow {
            color: #ff7a00;
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            margin-bottom: 10px;
          }

          .apply-header h1 {
            color: #ffffff;
            font-size: clamp(32px, 5vw, 48px);
            letter-spacing: -0.04em;
            margin-bottom: 10px;
          }

          .apply-header p {
            color: #bdbdbd;
            line-height: 1.6;
          }

          .apply-message {
            padding: 14px 16px;
            border-radius: 14px;
            margin-bottom: 20px;
            font-weight: 800;
            border: 1px solid rgba(34, 197, 94, 0.35);
            background: rgba(34, 197, 94, 0.1);
            color: #22c55e;
          }

          .apply-message.error {
            border-color: rgba(255, 70, 70, 0.4);
            background: rgba(255, 70, 70, 0.1);
            color: #ff5c5c;
          }

          .apply-form {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
          }

          .apply-form label {
            display: grid;
            gap: 9px;
            color: #ffffff;
            font-weight: 900;
            font-size: 14px;
          }

          .apply-form label.full {
            grid-column: span 2;
          }

          .apply-form input,
          .apply-form select,
          .apply-form textarea {
            width: 100%;
            background: #151515;
            color: #ffffff;
            border: 1px solid #2d2d2d;
            border-radius: 14px;
            padding: 14px 16px;
            font-size: 15px;
            outline: none;
            transition: 0.2s ease;
          }

          .apply-form input,
          .apply-form select {
            height: 54px;
          }

          .apply-form textarea {
            min-height: 110px;
            resize: vertical;
          }

          .apply-form input::placeholder,
          .apply-form textarea::placeholder {
            color: #777777;
          }

          .apply-form input:focus,
          .apply-form select:focus,
          .apply-form textarea:focus {
            border-color: #ff7a00;
            box-shadow: 0 0 0 4px rgba(255, 122, 0, 0.12);
          }

          .optional-text {
            color: #999999;
            font-size: 12px;
            font-weight: 700;
          }

          .submit-application-btn {
            grid-column: span 2;
            height: 58px;
            border: none;
            border-radius: 16px;
            background: #ff7a00;
            color: #000000;
            font-size: 16px;
            font-weight: 1000;
            cursor: pointer;
            transition: 0.2s ease;
            margin-top: 8px;
          }

          .submit-application-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 18px 42px rgba(255, 122, 0, 0.25);
          }

          .submit-application-btn:disabled {
            opacity: 0.65;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }

          @media (max-width: 760px) {
            .apply-shell {
              padding: 24px;
            }

            .apply-form {
              grid-template-columns: 1fr;
            }

            .apply-form label.full,
            .submit-application-btn {
              grid-column: span 1;
            }
          }
        `}
      </style>

      <main className="apply-page">
        <section className="apply-shell">
          <div className="apply-header">
            <p className="eyebrow">Internship Application</p>
            <h1>Apply for Internship</h1>
            <p>
              Fill all required details carefully. Portfolio URL is optional, but
              LinkedIn and GitHub must be valid URLs.
            </p>
          </div>

          {message && (
            <div className={`apply-message ${messageType === "error" ? "error" : ""}`}>
              {message}
            </div>
          )}

          <form className="apply-form" onSubmit={submitApplication}>
            <label>
              Full Name *
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={updateField}
                placeholder="Enter full name"
                required
              />
            </label>

            <label>
              Email *
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={updateField}
                placeholder="Enter email"
                required
              />
            </label>

            <label>
              Phone Number *
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={updateField}
                placeholder="Enter phone number"
                required
              />
            </label>

            <label>
              City *
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={updateField}
                placeholder="Enter city"
                required
              />
            </label>

            <label>
              College Name *
              <input
                type="text"
                name="collegeName"
                value={formData.collegeName}
                onChange={updateField}
                placeholder="Enter college name"
                required
              />
            </label>

            <label>
              Degree *
              <input
                type="text"
                name="degree"
                value={formData.degree}
                onChange={updateField}
                placeholder="B.Tech, BBA, MBA..."
                required
              />
            </label>

            <label>
              Branch *
              <input
                type="text"
                name="branch"
                value={formData.branch}
                onChange={updateField}
                placeholder="CSE, AIML, Civil..."
                required
              />
            </label>

            <label>
              Year of Study *
              <input
                type="text"
                name="yearOfStudy"
                value={formData.yearOfStudy}
                onChange={updateField}
                placeholder="2nd Year, 3rd Year..."
                required
              />
            </label>

            <label>
              CGPA / Percentage *
              <input
                type="text"
                name="cgpaPercentage"
                value={formData.cgpaPercentage}
                onChange={updateField}
                placeholder="8.2 CGPA or 82%"
                required
              />
            </label>

            <label>
              Applied Role *
              <input
                type="text"
                name="appliedRole"
                value={formData.appliedRole}
                onChange={updateField}
                placeholder="Intern role"
                required
              />
            </label>

            <label>
              Select Domain *
              <select
                name="preferredDomain"
                value={formData.preferredDomain}
                onChange={updateField}
                required
              >
                <option value="">Select Domain</option>
                {domains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Application Source *
              <select
                name="applicationSource"
                value={formData.applicationSource}
                onChange={updateField}
                required
              >
                <option value="">Select Source</option>
                {sources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </label>

            <label className="full">
              Skills *
              <textarea
                name="skills"
                value={formData.skills}
                onChange={updateField}
                placeholder="Mention your skills"
                required
              ></textarea>
            </label>

            <label>
              LinkedIn URL *
              <input
                type="url"
                name="linkedinUrl"
                value={formData.linkedinUrl}
                onChange={updateField}
                placeholder="https://www.linkedin.com/in/username"
                required
              />
            </label>

            <label>
              GitHub URL *
              <input
                type="url"
                name="githubUrl"
                value={formData.githubUrl}
                onChange={updateField}
                placeholder="https://github.com/username"
                required
              />
            </label>

            <label className="full">
              Portfolio URL <span className="optional-text">Optional</span>
              <input
                type="url"
                name="portfolioUrl"
                value={formData.portfolioUrl}
                onChange={updateField}
                placeholder="https://yourportfolio.com"
              />
            </label>

            <label className="full">
              Why do you want to join us? *
              <textarea
                name="whyJoinUs"
                value={formData.whyJoinUs}
                onChange={updateField}
                placeholder="Explain why you want to join"
                required
              ></textarea>
            </label>

            <label className="full">
              Why are you interested in this role? *
              <textarea
                name="whyInterested"
                value={formData.whyInterested}
                onChange={updateField}
                placeholder="Explain your interest"
                required
              ></textarea>
            </label>

            <label className="full">
              What are your career goals? *
              <textarea
                name="careerGoals"
                value={formData.careerGoals}
                onChange={updateField}
                placeholder="Mention your career goals"
                required
              ></textarea>
            </label>

            <label className="full">
              What skills do you want to develop? *
              <textarea
                name="skillsToDevelop"
                value={formData.skillsToDevelop}
                onChange={updateField}
                placeholder="Mention skills you want to improve"
                required
              ></textarea>
            </label>

            <label className="full">
              Why should we select you? *
              <textarea
                name="whySelectYou"
                value={formData.whySelectYou}
                onChange={updateField}
                placeholder="Explain why you are a good fit"
                required
              ></textarea>
            </label>

            <button
              type="submit"
              className="submit-application-btn"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit Application"}
            </button>
          </form>
        </section>
      </main>
    </>
  );
}

export default ApplyPage;