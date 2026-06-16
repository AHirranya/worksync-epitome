// Client/src/pages/HRDashboard.jsx

import { useEffect, useState } from "react";
import api from "../api/api";

import DashboardQuickNav from "../components/DashboardQuickNav";
import HRPerformancePanel from "../components/HRPerformancePanel";
import HRCertificatePanel from "../components/HRCertificatePanel";
import HRAttendanceWorkLogPanel from "../components/HRAttendanceWorkLogPanel";
import HRTaskPanel from "../components/HRTaskPanel";

function HRDashboard() {
  const [applicants, setApplicants] = useState([]);
  const [interns, setInterns] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [mentors, setMentors] = useState([]);

  const [stats, setStats] = useState({
    totalApplicants: 0,
    shortlistedCandidates: 0,
    selectedCandidates: 0,
    rejectedCandidates: 0,
    sourceWise: [],
  });

  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [credentials, setCredentials] = useState(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(true);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  const [onboardingForm, setOnboardingForm] = useState({
    departmentId: "",
    mentorId: "",
    joiningDate: "",
    endDate: "",
    workMode: "Remote",
  });

  const hrNavLinks = [
    { id: "hr-overview", label: "Overview" },
    { id: "hr-applicants", label: "Applicants" },
    { id: "hr-onboarding", label: "Onboarding" },
    { id: "hr-interns", label: "Interns" },
    { id: "hr-performance", label: "Performance" },
    { id: "hr-certificates", label: "Certificates" },
    { id: "hr-attendance", label: "Attendance & Logs" },
    { id: "hr-tasks", label: "Tasks" },
  ];

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const formatDateInput = (date) => {
    return date.toISOString().split("T")[0];
  };

  const getToday = () => {
    return formatDateInput(new Date());
  };

  const getAfterDays = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return formatDateInput(date);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    return String(dateValue).slice(0, 10);
  };

  const loadApplicants = async () => {
    const res = await api.get("/applicants");
    setApplicants(res.data.applicants || []);
  };

  const loadStats = async () => {
    const res = await api.get("/applicants/stats/summary");

    setStats(
      res.data.stats || {
        totalApplicants: 0,
        shortlistedCandidates: 0,
        selectedCandidates: 0,
        rejectedCandidates: 0,
        sourceWise: [],
      }
    );
  };

  const loadDepartments = async () => {
    const res = await api.get("/onboarding/departments");
    setDepartments(res.data.departments || []);
    return res.data.departments || [];
  };

  const loadMentors = async () => {
    const res = await api.get("/onboarding/mentors");
    setMentors(res.data.mentors || []);
  };

  const loadInterns = async () => {
    const res = await api.get("/onboarding/interns");
    setInterns(res.data.interns || []);
  };

  const loadDashboard = async () => {
    setLoading(true);
    setMessage("");

    try {
      await loadApplicants();
      await loadStats();
      await loadDepartments();
      await loadMentors();
      await loadInterns();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to load HR dashboard.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (applicantId, status) => {
    try {
      const res = await api.patch(`/applicants/${applicantId}/status`, {
        status,
      });

      showMessage(res.data.message || "Applicant status updated successfully.");

      await loadApplicants();
      await loadStats();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to update applicant status.",
        "error"
      );
    }
  };

  const findDepartmentForApplicant = (applicant, departmentList) => {
    const domain = String(applicant.preferred_domain || "").toLowerCase();

    const matchedDepartment = departmentList.find((department) => {
      const departmentName = String(department.name || "").toLowerCase();
      const departmentCode = String(department.code || "").toLowerCase();

      return (
        domain === departmentName ||
        domain === departmentCode ||
        domain.includes(departmentName) ||
        departmentName.includes(domain)
      );
    });

    return matchedDepartment?.id || "";
  };

  const openOnboarding = async (applicant) => {
    setSelectedApplicant(applicant);
    setCredentials(null);
    setMessage("");

    let departmentList = departments;

    if (departmentList.length === 0) {
      departmentList = await loadDepartments();
    }

    const matchedDepartmentId = findDepartmentForApplicant(
      applicant,
      departmentList
    );

    setOnboardingForm({
      departmentId: matchedDepartmentId,
      mentorId: "",
      joiningDate: getToday(),
      endDate: getAfterDays(60),
      workMode: "Remote",
    });

    setTimeout(() => {
      const section = document.getElementById("hr-onboarding");
      if (section) {
        section.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  const closeOnboarding = () => {
    setSelectedApplicant(null);
    setCredentials(null);
  };

  const updateOnboardingField = (e) => {
    setOnboardingForm({
      ...onboardingForm,
      [e.target.name]: e.target.value,
    });
  };

  const submitOnboarding = async (e) => {
    e.preventDefault();

    if (!selectedApplicant) {
      showMessage("Please select an applicant first.", "error");
      return;
    }

    if (!onboardingForm.departmentId) {
      showMessage("Please select a department.", "error");
      return;
    }

    setOnboardingLoading(true);
    setCredentials(null);
    setMessage("");

    try {
      const res = await api.post(`/onboarding/convert/${selectedApplicant.id}`, {
        departmentId: onboardingForm.departmentId,
        mentorId: onboardingForm.mentorId || null,
        joiningDate: onboardingForm.joiningDate || null,
        endDate: onboardingForm.endDate || null,
        workMode: onboardingForm.workMode,
      });

      setCredentials(res.data.credentials);

      showMessage(
        res.data.message ||
          "Applicant onboarded successfully. Intern account generated."
      );

      await loadApplicants();
      await loadStats();
      await loadInterns();
    } catch (error) {
      showMessage(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Onboarding failed.",
        "error"
      );
    } finally {
      setOnboardingLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-header">
          <p className="eyebrow">HR Workspace</p>
          <h1>HR Dashboard</h1>
          <p>Loading HR workspace...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-header">
        <p className="eyebrow">HR Workspace</p>
        <h1>HR Dashboard</h1>
        <p>
          Manage applicants, onboarding, intern accounts, generated credentials,
          performance, certificates, attendance, work logs, and tasks.
        </p>
      </div>

      <DashboardQuickNav links={hrNavLinks} />

      {message && (
        <div className={`message-box ${messageType === "error" ? "error" : ""}`}>
          {message}
        </div>
      )}

      <section id="hr-overview" className="stats-grid">
        <div className="stat-card">
          <p>Total Applicants</p>
          <h2>{stats.totalApplicants}</h2>
          <span>All submitted applications</span>
        </div>

        <div className="stat-card">
          <p>Shortlisted</p>
          <h2>{stats.shortlistedCandidates}</h2>
          <span>Ready for next review</span>
        </div>

        <div className="stat-card">
          <p>Selected</p>
          <h2>{stats.selectedCandidates}</h2>
          <span>Ready for onboarding</span>
        </div>

        <div className="stat-card">
          <p>Onboarded Interns</p>
          <h2>{interns.length}</h2>
          <span>Intern accounts generated</span>
        </div>
      </section>

      <section className="panel">
        <h2>Source-wise Applicants</h2>
        <p>Application count grouped by source.</p>

        <div className="source-list">
          {stats.sourceWise.length === 0 && <p>No source data available.</p>}

          {stats.sourceWise.map((item, index) => (
            <div className="source-item" key={index}>
              <span>{item.application_source || "Unknown Source"}</span>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>
      </section>

      <section id="hr-applicants" className="panel">
        <h2>Application Pipeline</h2>
        <p>
          Review applications, update status, and onboard selected candidates.
        </p>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Domain</th>
                <th>Source</th>
                <th>Status</th>
                <th>Change Status</th>
                <th>Onboarding</th>
              </tr>
            </thead>

            <tbody>
              {applicants.length === 0 && (
                <tr>
                  <td colSpan="8">No applicants found.</td>
                </tr>
              )}

              {applicants.map((applicant) => {
                const status = applicant.status || "Applied";
                const normalizedStatus = status
                  .toLowerCase()
                  .replace(/\s+/g, "-");

                return (
                  <tr key={applicant.id}>
                    <td>{applicant.full_name}</td>
                    <td>{applicant.email}</td>
                    <td>{applicant.phone || "-"}</td>
                    <td>{applicant.preferred_domain || "-"}</td>
                    <td>{applicant.application_source || "-"}</td>

                    <td>
                      <span className={`status ${normalizedStatus}`}>
                        {status}
                      </span>
                    </td>

                    <td>
                      <select
                        value={status}
                        onChange={(e) =>
                          updateStatus(applicant.id, e.target.value)
                        }
                      >
                        <option value="Applied">Applied</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Shortlisted">Shortlisted</option>
                        <option value="Selected">Selected</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Onboarded">Onboarded</option>
                      </select>
                    </td>

                    <td>
                      {status === "Selected" && (
                        <button
                          type="button"
                          className="small-btn"
                          onClick={() => openOnboarding(applicant)}
                        >
                          Onboard
                        </button>
                      )}

                      {status === "Onboarded" && (
                        <span className="completed-text">Completed</span>
                      )}

                      {status !== "Selected" && status !== "Onboarded" && (
                        <span className="small-text">Select first</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section id="hr-onboarding" className="panel">
        <div className="panel-heading-row">
          <div>
            <h2>Generate Intern Account</h2>
            <p>
              Select an applicant with status <strong>Selected</strong>, then
              generate intern email/password credentials.
            </p>
          </div>
        </div>

        {!selectedApplicant && (
          <div className="empty-state">
            <h3>No applicant selected</h3>
            <p>
              Go to Application Pipeline, change an applicant status to Selected,
              then click Onboard.
            </p>
          </div>
        )}

        {selectedApplicant && (
          <>
            <div className="selected-applicant-box">
              <div>
                <p className="eyebrow">Selected Applicant</p>
                <h3>{selectedApplicant.full_name}</h3>
                <p>{selectedApplicant.email}</p>
                <p>{selectedApplicant.preferred_domain || "-"}</p>
              </div>

              <button
                type="button"
                className="outline-small-btn"
                onClick={closeOnboarding}
              >
                Clear Selection
              </button>
            </div>

            <form className="onboarding-form" onSubmit={submitOnboarding}>
              <select
                name="departmentId"
                value={onboardingForm.departmentId}
                onChange={updateOnboardingField}
                required
              >
                <option value="">Select Department</option>

                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name} ({department.code})
                  </option>
                ))}
              </select>

              <select
                name="mentorId"
                value={onboardingForm.mentorId}
                onChange={updateOnboardingField}
              >
                <option value="">Select Mentor Optional</option>

                {mentors.map((mentor) => (
                  <option key={mentor.id} value={mentor.id}>
                    {mentor.full_name} - {mentor.email}
                  </option>
                ))}
              </select>

              <input
                type="date"
                name="joiningDate"
                value={onboardingForm.joiningDate}
                onChange={updateOnboardingField}
              />

              <input
                type="date"
                name="endDate"
                value={onboardingForm.endDate}
                onChange={updateOnboardingField}
              />

              <select
                name="workMode"
                value={onboardingForm.workMode}
                onChange={updateOnboardingField}
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Onsite">Onsite</option>
              </select>

              <button type="submit" disabled={onboardingLoading}>
                {onboardingLoading
                  ? "Generating Account..."
                  : "Generate Intern Email & Password"}
              </button>
            </form>

            {credentials && (
              <div className="credentials-box">
                <h3>Generated Intern Login Credentials</h3>

                <div className="credentials-grid">
                  <div>
                    <span>Intern ID</span>
                    <strong>{credentials.internId}</strong>
                  </div>

                  <div>
                    <span>Email</span>
                    <strong>{credentials.email}</strong>
                  </div>

                  <div>
                    <span>Temporary Password</span>
                    <strong>{credentials.temporaryPassword}</strong>
                  </div>
                </div>

                <p className="warning-text">
                  Save this password now. The intern must use this email and
                  temporary password to login as role: Intern.
                </p>
              </div>
            )}
          </>
        )}
      </section>

      <section id="hr-interns" className="panel">
        <h2>Onboarded Interns</h2>
        <p>All generated intern accounts are listed here.</p>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Intern ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Mentor</th>
                <th>Joining</th>
                <th>End</th>
                <th>Mode</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {interns.length === 0 && (
                <tr>
                  <td colSpan="9">No interns onboarded yet.</td>
                </tr>
              )}

              {interns.map((intern) => (
                <tr key={intern.id}>
                  <td>{intern.intern_id}</td>
                  <td>{intern.full_name}</td>
                  <td>{intern.email}</td>
                  <td>{intern.department_name || "-"}</td>
                  <td>{intern.mentor_name || "-"}</td>
                  <td>{formatDate(intern.joining_date)}</td>
                  <td>{formatDate(intern.end_date)}</td>
                  <td>{intern.work_mode}</td>
                  <td>
                    <span className="status selected">{intern.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div id="hr-performance" className="dashboard-section-anchor">
        <HRPerformancePanel />
      </div>

      <div id="hr-certificates" className="dashboard-section-anchor">
        <HRCertificatePanel />
      </div>

      <div id="hr-attendance" className="dashboard-section-anchor">
        <HRAttendanceWorkLogPanel />
      </div>

      <div id="hr-tasks" className="dashboard-section-anchor">
        <HRTaskPanel />
      </div>
    </main>
  );
}

export default HRDashboard;