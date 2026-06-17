// Client/src/pages/MentorDashboard.jsx

import { useEffect, useMemo, useState } from "react";
import api from "../api/api";

function MentorDashboard() {
  const [activeSection, setActiveSection] = useState("overview");

  const [cards, setCards] = useState([]);
  const [interns, setInterns] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [feedback, setFeedback] = useState([]);

  const [internSearch, setInternSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [feedbackForm, setFeedbackForm] = useState({
    internId: "",
    rating: "5",
    feedbackText: "",
    actionPlan: "",
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setMessage("");
      setMessageType("");

      const res = await api.get("/mentor/overview");

      setCards(res.data.cards || []);
      setInterns(res.data.interns || []);
      setWorkLogs(res.data.workLogs || []);
      setAttendance(res.data.attendance || []);
      setFeedback(res.data.feedback || []);
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to load mentor dashboard.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";

    return new Date(dateValue).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateValue) => {
    if (!dateValue) return "-";

    return new Date(dateValue).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatMinutes = (minutes) => {
    const total = Number(minutes || 0);
    const hrs = Math.floor(total / 60);
    const mins = total % 60;

    if (hrs === 0) return `${mins} min`;

    return `${hrs} hr ${mins} min`;
  };

  const departments = useMemo(() => {
    const values = interns
      .map((intern) => intern.department_name)
      .filter(Boolean);

    return [...new Set(values)];
  }, [interns]);

  const filteredInterns = useMemo(() => {
    const search = internSearch.trim().toLowerCase();

    return interns.filter((intern) => {
      const name = String(intern.full_name || "").toLowerCase();
      const email = String(intern.email || "").toLowerCase();
      const department = String(intern.department_name || "").toLowerCase();

      const matchesSearch =
        !search || name.includes(search) || email.includes(search);

      const matchesDepartment =
        departmentFilter === "all" ||
        department === departmentFilter.toLowerCase();

      return matchesSearch && matchesDepartment;
    });
  }, [interns, internSearch, departmentFilter]);

  const updateFeedbackForm = (e) => {
    setFeedbackForm({
      ...feedbackForm,
      [e.target.name]: e.target.value,
    });
  };

  const submitFeedback = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post("/mentor/feedback", feedbackForm);

      showMessage(res.data.message || "Feedback added successfully.");

      setFeedbackForm({
        internId: "",
        rating: "5",
        feedbackText: "",
        actionPlan: "",
      });

      await loadDashboard();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to add feedback.",
        "error"
      );
    }
  };

  const reviewWorkLog = async (workLogId, status) => {
    try {
      const res = await api.patch(`/mentor/work-logs/${workLogId}/review`, {
        status,
      });

      showMessage(res.data.message || "Work log reviewed successfully.");
      await loadDashboard();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to review work log.",
        "error"
      );
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <main className="dashboard-page mentor-dashboard-page">
      <section className="dashboard-header">
        <h1>Mentor Dashboard</h1>
        <p>
          Monitor interns, review work logs, track training progress, check
          attendance discipline, and provide mentor feedback.
        </p>
      </section>

      <section className="panel">
        <div className="task-action-row">
          {[
            ["overview", "Overview"],
            ["interns", "Interns"],
            ["training", "Training"],
            ["worklogs", "Work Logs"],
            ["attendance", "Attendance"],
            ["feedback", "Feedback"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={
                activeSection === key ? "small-btn" : "outline-small-btn"
              }
              onClick={() => setActiveSection(key)}
            >
              {label}
            </button>
          ))}

          <button
            type="button"
            className="outline-small-btn"
            onClick={loadDashboard}
          >
            Refresh
          </button>
        </div>
      </section>

      {message && (
        <section className="panel">
          <div
            className={`message-box ${messageType === "error" ? "error" : ""}`}
          >
            {message}
          </div>
        </section>
      )}

      {loading && (
        <section className="panel">
          <div className="mentor-state-card">
            <h3>Loading mentor workspace</h3>
            <p>Please wait while intern monitoring data is loaded.</p>
          </div>
        </section>
      )}

      {!loading && activeSection === "overview" && (
        <>
          <section className="mentor-card-grid">
            {cards.map((card) => (
              <div className="mentor-stat-card" key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <p>{card.note}</p>
              </div>
            ))}
          </section>

          <section className="panel">
            <h2>Interns Needing Attention</h2>
            <p>Interns with blockers or lower training progress are shown here.</p>

            <div className="mentor-focus-list">
              {interns
                .filter(
                  (intern) =>
                    Number(intern.training_percent || 0) < 75 ||
                    workLogs.some(
                      (log) =>
                        log.intern_email === intern.email &&
                        log.blockers &&
                        String(log.blockers).trim() !== ""
                    )
                )
                .slice(0, 8)
                .map((intern) => (
                  <div className="mentor-focus-card" key={intern.id}>
                    <div>
                      <h3>{intern.full_name}</h3>
                      <p>
                        {intern.department_name || "No Department"} | Training:{" "}
                        {intern.training_percent || 0}%
                      </p>
                    </div>

                    <span className="status selected">
                      {intern.status || "Active"}
                    </span>
                  </div>
                ))}

              {interns.length === 0 && <p>No interns found.</p>}
            </div>
          </section>
        </>
      )}

      {!loading && activeSection === "interns" && (
        <section className="panel">
          <div className="panel-heading-row">
            <div>
              <h2>Intern Monitoring</h2>
              <p>Track intern training, attendance, and certificate status.</p>
            </div>
          </div>

          <div className="mentor-filter-bar">
            <input
              type="text"
              value={internSearch}
              onChange={(e) => setInternSearch(e.target.value)}
              placeholder="Search intern by name or email"
            />

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="all">All Departments</option>

              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Intern</th>
                  <th>Department</th>
                  <th>Training</th>
                  <th>Attendance</th>
                  <th>Certificate</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredInterns.length === 0 && (
                  <tr>
                    <td colSpan="6">No interns found.</td>
                  </tr>
                )}

                {filteredInterns.map((intern) => (
                  <tr key={intern.id}>
                    <td>
                      {intern.full_name}
                      <br />
                      <span className="small-text">{intern.email}</span>
                    </td>
                    <td>{intern.department_name || "-"}</td>
                    <td>{intern.training_percent || 0}%</td>
                    <td>{intern.attendance_status || "Not Marked"}</td>
                    <td>{intern.certificate_number || "Not Issued"}</td>
                    <td>
                      <span className="status selected">
                        {intern.status || "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && activeSection === "training" && (
        <section className="panel">
          <h2>Training Progress</h2>
          <p>Mentor can monitor training progress but cannot modify modules.</p>

          <div className="mentor-training-grid">
            {interns.map((intern) => (
              <div className="mentor-training-card" key={intern.id}>
                <div>
                  <h3>{intern.full_name}</h3>
                  <p>{intern.department_name || "No Department"}</p>
                </div>

                <strong>{intern.training_percent || 0}%</strong>

                <div className="mentor-progress-track">
                  <div
                    className="mentor-progress-fill"
                    style={{ width: `${intern.training_percent || 0}%` }}
                  ></div>
                </div>

                <p>
                  {intern.completed_modules || 0} of {intern.total_modules || 0}{" "}
                  modules completed
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && activeSection === "worklogs" && (
        <section className="panel">
          <h2>Work Log Review</h2>
          <p>Review intern daily work logs and blockers.</p>

          <div className="mentor-worklog-list">
            {workLogs.length === 0 && <p>No work logs submitted yet.</p>}

            {workLogs.map((log) => (
              <div className="mentor-worklog-card" key={log.id}>
                <div className="mentor-worklog-top">
                  <div>
                    <h3>{log.intern_name}</h3>
                    <p>
                      {formatDate(log.log_date)} |{" "}
                      {log.department_name || "No Department"}
                    </p>
                  </div>

                  <span className="status selected">
                    {log.status || "Submitted"}
                  </span>
                </div>

                <p>
                  <strong>Summary:</strong> {log.summary}
                </p>

                <p>
                  <strong>Hours:</strong> {log.hours_worked || 0}
                </p>

                {log.blockers && (
                  <div className="mentor-blocker-box">
                    <strong>Blocker / Doubt</strong>
                    <p>{log.blockers}</p>
                  </div>
                )}

                {log.overtime_reason && (
                  <div className="mentor-blocker-box">
                    <strong>Overtime Reason</strong>
                    <p>{log.overtime_reason}</p>
                  </div>
                )}

                <div className="task-action-row">
                  <button
                    type="button"
                    className="small-btn"
                    onClick={() => reviewWorkLog(log.id, "Reviewed")}
                  >
                    Mark Reviewed
                  </button>

                  <button
                    type="button"
                    className="outline-small-btn"
                    onClick={() => reviewWorkLog(log.id, "Needs Improvement")}
                  >
                    Needs Improvement
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && activeSection === "attendance" && (
        <section className="panel">
          <h2>Attendance Monitoring</h2>
          <p>Mentor can monitor attendance discipline but cannot edit records.</p>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Intern</th>
                  <th>Department</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Break</th>
                  <th>Net Work</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {attendance.length === 0 && (
                  <tr>
                    <td colSpan="8">No attendance records found.</td>
                  </tr>
                )}

                {attendance.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.attendance_date)}</td>
                    <td>{item.intern_name}</td>
                    <td>{item.department_name || "-"}</td>
                    <td>{formatTime(item.check_in)}</td>
                    <td>{formatTime(item.check_out)}</td>
                    <td>{formatMinutes(item.total_break_minutes)}</td>
                    <td>{formatMinutes(item.net_work_minutes)}</td>
                    <td>
                      <span className="status selected">
                        {item.status || "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && activeSection === "feedback" && (
        <section className="panel">
          <h2>Mentor Feedback</h2>
          <p>Add guidance, ratings, and improvement plans for interns.</p>

          <form className="form-grid" onSubmit={submitFeedback}>
            <label>
              Intern
              <select
                name="internId"
                value={feedbackForm.internId}
                onChange={updateFeedbackForm}
                required
              >
                <option value="">Select intern</option>

                {interns.map((intern) => (
                  <option key={intern.id} value={intern.id}>
                    {intern.full_name} - {intern.email}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Rating
              <select
                name="rating"
                value={feedbackForm.rating}
                onChange={updateFeedbackForm}
                required
              >
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Good</option>
                <option value="3">3 - Average</option>
                <option value="2">2 - Needs Improvement</option>
                <option value="1">1 - Poor</option>
              </select>
            </label>

            <label className="form-grid-full">
              Feedback
              <textarea
                name="feedbackText"
                value={feedbackForm.feedbackText}
                onChange={updateFeedbackForm}
                placeholder="Write mentor feedback..."
                required
              ></textarea>
            </label>

            <label className="form-grid-full">
              Action Plan
              <textarea
                name="actionPlan"
                value={feedbackForm.actionPlan}
                onChange={updateFeedbackForm}
                placeholder="Improvement plan or next steps..."
              ></textarea>
            </label>

            <div className="form-grid-full">
              <button type="submit">Submit Feedback</button>
            </div>
          </form>

          <h3 className="section-subtitle">Recent Feedback</h3>

          <div className="mentor-feedback-list">
            {feedback.length === 0 && <p>No feedback added yet.</p>}

            {feedback.map((item) => (
              <div className="mentor-feedback-card" key={item.id}>
                <div>
                  <h3>{item.intern_name}</h3>
                  <span>
                    Rating: {item.rating}/5 | {formatDate(item.created_at)}
                  </span>
                </div>

                <p>{item.feedback_text}</p>

                {item.action_plan && (
                  <small>Action Plan: {item.action_plan}</small>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export default MentorDashboard; 