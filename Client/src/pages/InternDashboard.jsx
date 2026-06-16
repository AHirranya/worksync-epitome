// Client/src/pages/InternDashboard.jsx

import { useEffect, useState } from "react";
import api from "../api/api";
import DashboardQuickNav from "../components/DashboardQuickNav";
import InternPerformancePanel from "../components/InternPerformancePanel";
import InternCertificatePanel from "../components/InternCertificatePanel";
import InternAttendanceWorkLogPanel from "../components/InternAttendanceWorkLogPanel";
import InternTasksPanel from "../components/InternTasksPanel";

function InternDashboard() {
  const [user, setUser] = useState(null);
  const [intern, setIntern] = useState(null);
  const [assignments, setAssignments] = useState([]);

  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const internNavLinks = [
    { id: "intern-overview", label: "Overview" },
    { id: "intern-profile", label: "Profile" },
    { id: "intern-training", label: "Training" },
    { id: "intern-performance", label: "Performance" },
    { id: "intern-certificate", label: "Certificate" },
    { id: "intern-attendance", label: "Attendance & Logs" },
    { id: "intern-tasks", label: "Tasks" },
  ];

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    return String(dateValue).slice(0, 10);
  };

  const calculateOverallTrainingProgress = () => {
    if (assignments.length === 0) return 0;

    const total = assignments.reduce(
      (sum, assignment) => sum + Number(assignment.progress_percent || 0),
      0
    );

    return Math.round(total / assignments.length);
  };

  const loadDashboard = async () => {
    setLoading(true);
    setMessage("");

    try {
      const userRes = await api.get("/auth/me");
      setUser(userRes.data.user);

      const profileRes = await api.get("/onboarding/my-profile");
      setIntern(profileRes.data.intern);

      const trainingRes = await api.get("/training/my-training");
      setAssignments(trainingRes.data.assignments || []);
    } catch (error) {
      showMessage(
        error.response?.data?.message ||
          "Unable to load intern dashboard. Please login as intern.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const markModuleComplete = async (assignmentId, moduleId) => {
    try {
      const res = await api.patch(
        `/training/progress/${assignmentId}/modules/${moduleId}/complete`
      );

      showMessage(res.data.message || "Module completed successfully.");
      await loadDashboard();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to update training progress.",
        "error"
      );
    }
  };

  const updateAnswer = (assignmentId, moduleId, questionId, selectedOption) => {
    const key = `${assignmentId}-${moduleId}`;

    setAnswers({
      ...answers,
      [key]: {
        ...(answers[key] || {}),
        [questionId]: selectedOption,
      },
    });
  };

  const submitTest = async (assignmentId, moduleId) => {
    const key = `${assignmentId}-${moduleId}`;

    try {
      const res = await api.post(
        `/training/test/${assignmentId}/modules/${moduleId}/submit`,
        {
          answers: answers[key] || {},
        }
      );

      showMessage(
        `${res.data.message} Score: ${res.data.score}%`,
        res.data.passed ? "success" : "error"
      );

      await loadDashboard();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to submit test.",
        "error"
      );
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-header">
          <p className="eyebrow">Intern Workspace</p>
          <h1>Intern Dashboard</h1>
          <p>Loading your internship workspace...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-header">
        <p className="eyebrow">Intern Workspace</p>
        <h1>Intern Dashboard</h1>
        <p>
          Welcome <strong>{intern?.full_name || user?.fullName || "Intern"}</strong>.
          Track your profile, training, performance, certificate, attendance,
          work logs, and tasks from one clean workspace.
        </p>
      </div>

      <DashboardQuickNav links={internNavLinks} />

      {message && (
        <div className={`message-box ${messageType === "error" ? "error" : ""}`}>
          {message}
        </div>
      )}

      <section id="intern-overview" className="stats-grid">
        <div className="stat-card">
          <p>Training Progress</p>
          <h2>{calculateOverallTrainingProgress()}%</h2>
          <span>Overall training completion</span>
        </div>

        <div className="stat-card">
          <p>Intern Status</p>
          <h2>{intern?.status || "-"}</h2>
          <span>Current internship status</span>
        </div>

        <div className="stat-card">
          <p>Department</p>
          <h2>{intern?.department_name || "-"}</h2>
          <span>Your assigned department</span>
        </div>

        <div className="stat-card">
          <p>Work Mode</p>
          <h2>{intern?.work_mode || "-"}</h2>
          <span>Current working mode</span>
        </div>
      </section>

      <section id="intern-profile" className="intern-dashboard-grid">
        <div className="panel">
          <h2>My Profile</h2>
          <p>Your internship account and assigned department details.</p>

          <div className="profile-row">
            <span>Name</span>
            <strong>{intern?.full_name || user?.fullName || "-"}</strong>
          </div>

          <div className="profile-row">
            <span>Email</span>
            <strong>{intern?.email || user?.email || "-"}</strong>
          </div>

          <div className="profile-row">
            <span>Intern ID</span>
            <strong>{intern?.intern_id || "-"}</strong>
          </div>

          <div className="profile-row">
            <span>Department</span>
            <strong>{intern?.department_name || "-"}</strong>
          </div>

          <div className="profile-row">
            <span>Mentor</span>
            <strong>{intern?.mentor_name || "Not assigned"}</strong>
          </div>

          <div className="profile-row">
            <span>Joining Date</span>
            <strong>{formatDate(intern?.joining_date)}</strong>
          </div>

          <div className="profile-row">
            <span>End Date</span>
            <strong>{formatDate(intern?.end_date)}</strong>
          </div>
        </div>

        <div className="panel">
          <h2>Internship Timeline</h2>
          <p>Your current internship lifecycle progress.</p>

          <div className="timeline-list">
            <div className="timeline-item active">
              <span>1</span>
              <div>
                <h3>Onboarding</h3>
                <p>Your intern account has been created.</p>
              </div>
            </div>

            <div className="timeline-item active">
              <span>2</span>
              <div>
                <h3>Training</h3>
                <p>Complete theory, videos, and tests.</p>
              </div>
            </div>

            <div className="timeline-item active">
              <span>3</span>
              <div>
                <h3>Attendance & Logs</h3>
                <p>Mark attendance and submit daily work logs.</p>
              </div>
            </div>

            <div className="timeline-item">
              <span>4</span>
              <div>
                <h3>Certificate</h3>
                <p>Certificate unlocks after completion requirements.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="intern-training" className="panel">
        <div className="panel-heading-row">
          <div>
            <h2>My Training</h2>
            <p>Theory, video learning, and tests assigned by department.</p>
          </div>
        </div>

        {assignments.length === 0 && (
          <div className="empty-state">
            <h3>No training assigned yet</h3>
            <p>Training will appear after HR completes onboarding.</p>
          </div>
        )}

        <div className="training-assignment-list">
          {assignments.map((assignment) => (
            <div
              className="training-assignment-card"
              key={assignment.assignment_id}
            >
              <div className="training-assignment-header">
                <div>
                  <h3>{assignment.course_title}</h3>
                  <p>{assignment.course_description}</p>
                  <p>
                    <strong>Department:</strong>{" "}
                    {assignment.department_name || "-"}
                  </p>
                </div>

                <span>{assignment.progress_percent || 0}% Complete</span>
              </div>

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${assignment.progress_percent || 0}%`,
                  }}
                ></div>
              </div>

              <div className="module-list">
                {(assignment.modules || []).map((module) => {
                  const answerKey = `${assignment.assignment_id}-${module.module_id}`;

                  return (
                    <div className="module-item" key={module.module_id}>
                      <div className="module-content">
                        <div className="module-title-row">
                          <h4>
                            Module {module.module_order}: {module.title}
                          </h4>

                          <span className={`module-type ${module.module_type}`}>
                            {module.module_type}
                          </span>
                        </div>

                        <p>{module.content}</p>

                        {module.module_type === "video" && module.video_url && (
                          <a
                            className="video-link"
                            href={module.video_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open Related Video
                          </a>
                        )}

                        {module.module_type === "test" && (
                          <div className="test-box">
                            <p>
                              <strong>Passing Score:</strong>{" "}
                              {module.passing_score || 60}%
                            </p>

                            {module.latest_score !== null &&
                              module.latest_score !== undefined && (
                                <p>
                                  <strong>Last Score:</strong>{" "}
                                  {module.latest_score}%{" "}
                                  {module.latest_passed
                                    ? "(Passed)"
                                    : "(Not Passed)"}
                                </p>
                              )}

                            <div className="quiz-list">
                              {(module.questions || []).map((question) => (
                                <div
                                  className="quiz-question-card"
                                  key={question.id}
                                >
                                  <h4>{question.question}</h4>

                                  <div className="quiz-options">
                                    {["A", "B", "C", "D"].map((option) => {
                                      const optionText =
                                        option === "A"
                                          ? question.option_a
                                          : option === "B"
                                          ? question.option_b
                                          : option === "C"
                                          ? question.option_c
                                          : question.option_d;

                                      return (
                                        <label
                                          className="quiz-option"
                                          key={option}
                                        >
                                          <input
                                            type="radio"
                                            name={`q-${assignment.assignment_id}-${module.module_id}-${question.id}`}
                                            value={option}
                                            checked={
                                              answers[answerKey]?.[
                                                question.id
                                              ] === option
                                            }
                                            onChange={() =>
                                              updateAnswer(
                                                assignment.assignment_id,
                                                module.module_id,
                                                question.id,
                                                option
                                              )
                                            }
                                          />

                                          <span>
                                            {option}. {optionText}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="module-action">
                        {module.is_completed ? (
                          <span className="completed-text">Completed</span>
                        ) : module.module_type === "test" ? (
                          <button
                            type="button"
                            className="small-btn"
                            onClick={() =>
                              submitTest(
                                assignment.assignment_id,
                                module.module_id
                              )
                            }
                          >
                            Submit Test
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="small-btn"
                            onClick={() =>
                              markModuleComplete(
                                assignment.assignment_id,
                                module.module_id
                              )
                            }
                          >
                            Mark Complete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div id="intern-performance" className="dashboard-section-anchor">
        <InternPerformancePanel />
      </div>

      <div id="intern-certificate" className="dashboard-section-anchor">
        <InternCertificatePanel />
      </div>

      <div id="intern-attendance" className="dashboard-section-anchor">
        <InternAttendanceWorkLogPanel />
      </div>

      <div id="intern-tasks" className="dashboard-section-anchor">
        <InternTasksPanel />
      </div>
    </main>
  );
}

export default InternDashboard;