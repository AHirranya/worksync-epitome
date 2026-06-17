// Client/src/components/ReportsPanel.jsx

import { useEffect, useState } from "react";
import api from "../api/api";

function ReportsPanel() {
  const [cards, setCards] = useState([]);
  const [training, setTraining] = useState(null);
  const [departmentStats, setDepartmentStats] = useState([]);
  const [applicantStats, setApplicantStats] = useState([]);
  const [certificateStats, setCertificateStats] = useState([]);
  const [workLogStats, setWorkLogStats] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState([]);
  const [recentWorkLogs, setRecentWorkLogs] = useState([]);
  const [recentCertificates, setRecentCertificates] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      setMessage("");
      setMessageType("");

      const res = await api.get("/reports/overview");

      setCards(res.data.cards || []);
      setTraining(res.data.training || null);
      setDepartmentStats(res.data.departmentStats || []);
      setApplicantStats(res.data.applicantStats || []);
      setCertificateStats(res.data.certificateStats || []);
      setWorkLogStats(res.data.workLogStats || []);
      setAttendanceStats(res.data.attendanceStats || []);
      setRecentWorkLogs(res.data.recentWorkLogs || []);
      setRecentCertificates(res.data.recentCertificates || []);
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to load reports.",
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

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <section className="panel">
      <div className="panel-heading-row">
        <div>
          <h2>Reports & Analytics</h2>
          <p>
            View platform summary, department analytics, training progress,
            attendance, work logs, and certificate reports.
          </p>
        </div>

        <button type="button" className="outline-small-btn" onClick={loadReports}>
          Refresh
        </button>
      </div>

      {message && (
        <div className={`message-box ${messageType === "error" ? "error" : ""}`}>
          {message}
        </div>
      )}

      {loading && (
        <div className="ws13-state-card">
          <h3>Loading reports</h3>
          <p>Please wait while reports are generated.</p>
        </div>
      )}

      {!loading && (
        <>
          <div className="ws13-report-grid">
            {cards.map((card) => (
              <div className="ws13-report-card" key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <p>{card.note}</p>
              </div>
            ))}
          </div>

          <div className="ws13-training-card">
            <div>
              <h3>Training Completion</h3>
              <p>
                Overall completion of assigned training modules across interns.
              </p>
            </div>

            <strong>{training?.completionPercent || 0}%</strong>

            <div className="ws13-progress-track">
              <div
                className="ws13-progress-fill"
                style={{ width: `${training?.completionPercent || 0}%` }}
              ></div>
            </div>

            <p>
              {training?.completedModules || 0} of{" "}
              {training?.totalModules || 0} modules completed.
            </p>
          </div>

          <div className="ws13-two-column">
            <div className="ws13-box">
              <h3>Department-wise Intern Count</h3>

              <div className="ws13-list">
                {departmentStats.length === 0 && <p>No department data.</p>}

                {departmentStats.map((item) => (
                  <div className="ws13-list-row" key={item.department_name}>
                    <span>{item.department_name || "No Department"}</span>
                    <strong>{item.intern_count}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="ws13-box">
              <h3>Applicant Status Report</h3>

              <div className="ws13-list">
                {applicantStats.length === 0 && <p>No applicant data.</p>}

                {applicantStats.map((item) => (
                  <div className="ws13-list-row" key={item.status}>
                    <span>{item.status}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ws13-three-column">
            <div className="ws13-box">
              <h3>Attendance Report</h3>

              <div className="ws13-list">
                {attendanceStats.length === 0 && <p>No attendance data.</p>}

                {attendanceStats.map((item) => (
                  <div className="ws13-list-row" key={item.status}>
                    <span>{item.status}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="ws13-box">
              <h3>Work Log Report</h3>

              <div className="ws13-list">
                {workLogStats.length === 0 && <p>No work log data.</p>}

                {workLogStats.map((item) => (
                  <div className="ws13-list-row" key={item.status}>
                    <span>{item.status}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="ws13-box">
              <h3>Certificate Report</h3>

              <div className="ws13-list">
                {certificateStats.length === 0 && <p>No certificate data.</p>}

                {certificateStats.map((item) => (
                  <div className="ws13-list-row" key={item.status}>
                    <span>{item.status}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ws13-two-column">
            <div className="ws13-box">
              <h3>Recent Work Logs</h3>

              <div className="ws13-list">
                {recentWorkLogs.length === 0 && <p>No recent work logs.</p>}

                {recentWorkLogs.map((log) => (
                  <div className="ws13-detail-row" key={log.id}>
                    <strong>{log.intern_name || "Intern"}</strong>
                    <span>
                      {formatDate(log.log_date)} | {log.department_name || "-"}
                    </span>
                    <p>{log.summary}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="ws13-box">
              <h3>Recent Certificates</h3>

              <div className="ws13-list">
                {recentCertificates.length === 0 && (
                  <p>No recent certificates.</p>
                )}

                {recentCertificates.map((cert) => (
                  <div className="ws13-detail-row" key={cert.id}>
                    <strong>{cert.intern_name || "Intern"}</strong>
                    <span>
                      {formatDate(cert.issued_at)} |{" "}
                      {cert.department_name || "-"}
                    </span>
                    <p>{cert.certificate_number}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default ReportsPanel;