import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

function ApplicantForm() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    department: "",
    college: "",
    degree: "",
    graduationYear: "",
    linkedinUrl: "",
    githubUrl: "",
    portfolioUrl: "",
    resumeUrl: "",
    skills: "",
    whyJoin: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const departments = [
    "Frontend Development",
    "Backend Development",
    "Full Stack Development",
    "UI/UX Design",
    "Data Science",
    "AI/ML",
    "Cyber Security",
    "Cloud / DevOps",
    "Mobile App Development",
  ];

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !formData.fullName ||
      !formData.email ||
      !formData.phone ||
      !formData.department ||
      !formData.linkedinUrl ||
      !formData.githubUrl
    ) {
      setMessage("Please fill all required fields.");
      return;
    }

    try {
      setLoading(true);
      setMessage("Submitting application...");

      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        college: formData.college,
        degree: formData.degree,
        graduationYear: formData.graduationYear,
        linkedinUrl: formData.linkedinUrl,
        githubUrl: formData.githubUrl,
        portfolioUrl: formData.portfolioUrl,
        resumeUrl: formData.resumeUrl,
        skills: formData.skills,
        whyJoin: formData.whyJoin,
      };

      const response = await api.post("/applicants", payload);

      setMessage(
        response.data?.message || "Application submitted successfully."
      );

      setFormData({
        fullName: "",
        email: "",
        phone: "",
        department: "",
        college: "",
        degree: "",
        graduationYear: "",
        linkedinUrl: "",
        githubUrl: "",
        portfolioUrl: "",
        resumeUrl: "",
        skills: "",
        whyJoin: "",
      });

      setTimeout(() => {
        navigate("/login");
      }, 1800);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Application submission failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="applicant-page">
      <section className="applicant-shell">
        <div className="applicant-header">
          <button
            type="button"
            className="back-btn"
            onClick={() => navigate("/")}
          >
            ← Back
          </button>

          <div>
            <p>Internship Application</p>
            <h1>Apply to WorkSync</h1>
            <span>
              Fill your details. HR will review your application and onboard you
              if selected.
            </span>
          </div>
        </div>

        <form className="applicant-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="text"
                name="phone"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Preferred Department *</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
              >
                <option value="">Select department</option>
                {departments.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>College / University</label>
              <input
                type="text"
                name="college"
                placeholder="Enter college name"
                value={formData.college}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Degree</label>
              <input
                type="text"
                name="degree"
                placeholder="Example: B.Tech CSE AIML"
                value={formData.degree}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Graduation Year</label>
              <input
                type="text"
                name="graduationYear"
                placeholder="Example: 2028"
                value={formData.graduationYear}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>LinkedIn Profile *</label>
              <input
                type="url"
                name="linkedinUrl"
                placeholder="https://linkedin.com/in/yourname"
                value={formData.linkedinUrl}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>GitHub Profile *</label>
              <input
                type="url"
                name="githubUrl"
                placeholder="https://github.com/yourname"
                value={formData.githubUrl}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Portfolio Link</label>
              <input
                type="url"
                name="portfolioUrl"
                placeholder="https://yourportfolio.com"
                value={formData.portfolioUrl}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Resume Link</label>
              <input
                type="url"
                name="resumeUrl"
                placeholder="Google Drive resume link"
                value={formData.resumeUrl}
                onChange={handleChange}
              />
            </div>

            <div className="form-group full">
              <label>Skills</label>
              <textarea
                name="skills"
                placeholder="Example: React, Node.js, Python, SQL"
                value={formData.skills}
                onChange={handleChange}
              />
            </div>

            <div className="form-group full">
              <label>Why do you want to join?</label>
              <textarea
                name="whyJoin"
                placeholder="Write a short reason"
                value={formData.whyJoin}
                onChange={handleChange}
              />
            </div>
          </div>

          {message && <p className="form-message">{message}</p>}

          <button className="submit-btn" type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default ApplicantForm;