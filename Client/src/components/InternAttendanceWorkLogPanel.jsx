// Client/src/components/InternAttendanceWorkLogPanel.jsx

import { useEffect, useState } from "react";
import api from "../api/api";

function InternAttendanceWorkLogPanel() {
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);

  const [workLogForm, setWorkLogForm] = useState({
    summary: "",
    hoursWorked: "",
    blockers: "",
  });

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
    const todayRes = await api.get("/attendance/today");
    setTodayAttendance(todayRes.data.attendance || null);

    const historyRes = await api.get("/attendance/my");
    setAttendanceHistory(historyRes.data.attendance || []);
  };

  const loadWorkLogs = async () => {
    const res = await api.get("/work-logs/my");
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

  const checkIn = async () => {
    try {
      const res = await api.post("/attendance/check-in");
      showMessage(res.data.message || "Check-in successful.");
      await loadAttendance();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Check-in failed.",
        "error"
      );
    }
  };

  const checkOut = async () => {
    try {
      const res = await api.post("/attendance/check-out");
      showMessage(res.data.message || "Check-out successful.");
      await loadAttendance();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Check-out failed.",
        "error"
      );
    }
  };

  const updateWorkLogField = (e) => {
    setWorkLogForm({
      ...workLogForm,
      [e.target.name]: e.target.value,
    });
  };

  const submitWorkLog = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post("/work-logs", {
        summary: workLogForm.summary,
        hoursWorked: workLogForm.hoursWorked,
        blockers: workLogForm.blockers,
      });

      showMessage(res.data.message || "Work log submitted successfully.");

      setWorkLogForm({
        summary: "",
        hoursWorked: "",
        blockers: "",
      });

      await loadWorkLogs();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to submit work log.",
        "error"
      );
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <section className="panel">
      <div className="panel-heading-row">
        <div>
          <h2>Attendance & Daily Work Log</h2>
          <p>
            Mark your check-in/check-out and submit your daily internship work.
            All times are shown in Indian Standard Time.
          </p>
        </div>
      </div>

      {message && (
        <div className={`message-box ${messageType === "error" ? "error" : ""}`}>
          {message}
        </div>
      )}

      <div className="attendance-grid-pro">
        <div className="attendance-card-pro">
          <h3>Today’s Attendance</h3>

          <div className="attendance-status-box">
            <div>
              <span>Check In</span>
              <strong>
                {formatTimeIST(todayAttendance?.check_in)}
                {todayAttendance?.check_in ? " IST" : ""}
              </strong>
            </div>

            <div>
              <span>Check Out</span>
              <strong>
                {formatTimeIST(todayAttendance?.check_out)}
                {todayAttendance?.check_out ? " IST" : ""}
              </strong>
            </div>

            <div>
              <span>Status</span>
              <strong>{todayAttendance?.status || "Not Marked"}</strong>
            </div>
          </div>

          <div className="attendance-button-row">
            <button
              type="button"
              className="small-btn"
              onClick={checkIn}
              disabled={Boolean(todayAttendance?.check_in)}
            >
              Check In
            </button>

            <button
              type="button"
              className="outline-small-btn"
              onClick={checkOut}
              disabled={
                !todayAttendance?.check_in || Boolean(todayAttendance?.check_out)
              }
            >
              Check Out
            </button>
          </div>
        </div>

        <form className="attendance-card-pro" onSubmit={submitWorkLog}>
          <h3>Submit Daily Work Log</h3>

          <textarea
            name="summary"
            value={workLogForm.summary}
            onChange={updateWorkLogField}
            placeholder="What did you work on today?"
            required
          ></textarea>

          <input
            type="number"
            name="hoursWorked"
            value={workLogForm.hoursWorked}
            onChange={updateWorkLogField}
            placeholder="Hours worked"
            min="0"
            step="0.5"
            required
          />

          <textarea
            name="blockers"
            value={workLogForm.blockers}
            onChange={updateWorkLogField}
            placeholder="Blockers or doubts optional"
          ></textarea>

          <button type="submit">Submit Work Log</button>
        </form>
      </div>

      <div className="attendance-history-grid">
        <div className="attendance-card-pro">
          <h3>Recent Attendance</h3>

          <div className="mini-table-list">
            {attendanceHistory.length === 0 && <p>No attendance records yet.</p>}

            {attendanceHistory.slice(0, 6).map((item) => (
              <div className="mini-table-row" key={item.id}>
                <span>{formatDateIST(item.attendance_date)}</span>
                <strong>
                  {formatTimeIST(item.check_in)} - {formatTimeIST(item.check_out)} IST
                </strong>
              </div>
            ))}
          </div>
        </div>

        <div className="attendance-card-pro">
          <h3>Recent Work Logs</h3>

          <div className="mini-table-list">
            {workLogs.length === 0 && <p>No work logs yet.</p>}

            {workLogs.slice(0, 6).map((log) => (
              <div className="worklog-mini-card" key={log.id}>
                <div>
                  <strong>{formatDateIST(log.log_date)}</strong>
                  <span>{log.hours_worked || 0} hrs</span>
                </div>

                <p>{log.summary}</p>

                {log.blockers && <small>Blockers: {log.blockers}</small>}

                <em>{log.status}</em>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default InternAttendanceWorkLogPanel;