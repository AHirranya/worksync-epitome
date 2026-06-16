// Client/src/components/HRAttendanceWorkLogPanel.jsx

import { useEffect, useState } from "react";
import api from "../api/api";

function HRAttendanceWorkLogPanel() {
  const [attendance, setAttendance] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const formatDateIST = (dateValue) => {
    if (!dateValue) return "-";

    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateValue));
  };

  const formatTimeIST = (dateValue) => {
    if (!dateValue) return "-";

    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(dateValue));
  };

  const loadAttendance = async () => {
    const res = await api.get("/attendance/hr");
    setAttendance(res.data.attendance || []);
  };

  const loadWorkLogs = async () => {
    const res = await api.get("/work-logs/hr");
    setWorkLogs(res.data.workLogs || []);
  };

  const loadData = async () => {
    try {
      await loadAttendance();
      await loadWorkLogs();
    } catch (error) {
      showMessage(
        error.response?.data?.message ||
          "Failed to load attendance/work logs.",
        "error"
      );
    }
  };

  const reviewWorkLog = async (workLogId, status) => {
    try {
      const res = await api.patch(`/work-logs/${workLogId}/review`, {
        status,
      });

      showMessage(res.data.message || "Work log reviewed successfully.");
      await loadWorkLogs();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to review work log.",
        "error"
      );
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <section className="panel">
      <h2>Attendance & Work Logs</h2>
      <p>
        Track intern check-ins, check-outs, and daily work submissions. All
        attendance times are shown in IST.
      </p>

      {message && (
        <div className={`message-box ${messageType === "error" ? "error" : ""}`}>
          {message}
        </div>
      )}

      <h3 className="section-subtitle">Attendance Records</h3>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Intern</th>
              <th>Department</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {attendance.length === 0 && (
              <tr>
                <td colSpan="6">No attendance records yet.</td>
              </tr>
            )}

            {attendance.map((item) => (
              <tr key={item.id}>
                <td>{formatDateIST(item.attendance_date)}</td>
                <td>
                  {item.intern_name}
                  <br />
                  <span className="small-text">{item.intern_email}</span>
                </td>
                <td>{item.department_name || "-"}</td>
                <td>
                  {formatTimeIST(item.check_in)}
                  {item.check_in ? " IST" : ""}
                </td>
                <td>
                  {formatTimeIST(item.check_out)}
                  {item.check_out ? " IST" : ""}
                </td>
                <td>
                  <span className="status selected">{item.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="section-subtitle">Daily Work Logs</h3>

      <div className="worklog-hr-list">
        {workLogs.length === 0 && (
          <div className="empty-state">
            <h3>No work logs submitted yet</h3>
            <p>Intern daily work logs will appear here.</p>
          </div>
        )}

        {workLogs.map((log) => (
          <div className="worklog-hr-card" key={log.id}>
            <div className="worklog-hr-header">
              <div>
                <h3>{log.intern_name}</h3>
                <p>
                  {log.department_name || "-"} | {formatDateIST(log.log_date)}
                </p>
              </div>

              <span className="status selected">{log.status}</span>
            </div>

            <p>
              <strong>Summary:</strong> {log.summary}
            </p>

            <p>
              <strong>Hours Worked:</strong> {log.hours_worked || 0}
            </p>

            {log.blockers && (
              <p>
                <strong>Blockers:</strong> {log.blockers}
              </p>
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
  );
}

export default HRAttendanceWorkLogPanel;