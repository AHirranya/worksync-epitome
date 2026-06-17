// Client/src/components/InternAttendanceWorkLogPanel.jsx

import { useEffect, useState } from "react";
import api from "../api/api";

function InternAttendanceWorkLogPanel() {
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);

  const [overtimeReason, setOvertimeReason] = useState("");

  const [workLogForm, setWorkLogForm] = useState({
    summary: "",
    blockers: "",
  });

  const [tick, setTick] = useState(0);

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

  const formatDuration = (minutes) => {
    const cleanMinutes = Math.max(0, Number(minutes || 0));
    const hrs = Math.floor(cleanMinutes / 60);
    const mins = cleanMinutes % 60;

    if (hrs === 0) return `${mins} min`;

    return `${hrs} hr ${mins} min`;
  };

  const minutesBetween = (start, end) => {
    if (!start || !end) return 0;

    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();

    if (Number.isNaN(startTime) || Number.isNaN(endTime)) return 0;

    return Math.max(0, Math.ceil((endTime - startTime) / 60000));
  };

  const liveBreakMinutes = () => {
    if (!todayAttendance) return 0;

    const completed = Number(
      todayAttendance.completed_break_minutes ??
        todayAttendance.total_break_minutes ??
        0
    );

    if (!todayAttendance.has_active_break || !todayAttendance.active_break_start) {
      return completed;
    }

    return completed + minutesBetween(todayAttendance.active_break_start, new Date());
  };

  const liveNetMinutes = () => {
    if (!todayAttendance?.check_in) return 0;

    if (todayAttendance.check_out) {
      return Number(
        todayAttendance.net_work_minutes ||
          todayAttendance.computed_net_minutes ||
          0
      );
    }

    const totalDuration = minutesBetween(todayAttendance.check_in, new Date());
    return Math.max(0, totalDuration - liveBreakMinutes());
  };

  const netMinutes = liveNetMinutes();
  const totalBreakMinutes = todayAttendance?.check_out
    ? Number(todayAttendance.total_break_minutes || 0)
    : liveBreakMinutes();

  const isOvertime = netMinutes > 480;

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
      showMessage(error.response?.data?.message || "Check-in failed.", "error");
    }
  };

  const startBreak = async () => {
    try {
      const res = await api.post("/attendance/break-start");
      showMessage(res.data.message || "Break started successfully.");
      await loadAttendance();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to start break.",
        "error"
      );
    }
  };

  const endBreak = async () => {
    try {
      const res = await api.post("/attendance/break-end");
      showMessage(res.data.message || "Break ended successfully.");
      await loadAttendance();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to end break.",
        "error"
      );
    }
  };

  const checkOut = async () => {
    setMessage("");
    setMessageType("");

    if (isOvertime && !overtimeReason.trim()) {
      showMessage(
        "Net working time is more than 8 hours. Please give overtime reason before checkout.",
        "error"
      );
      return;
    }

    try {
      const res = await api.post("/attendance/check-out", {
        overtimeReason,
      });

      showMessage(res.data.message || "Check-out successful.");
      setOvertimeReason("");
      await loadAttendance();
    } catch (error) {
      showMessage(error.response?.data?.message || "Check-out failed.", "error");
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

    setMessage("");
    setMessageType("");

    if (!todayAttendance?.check_out) {
      showMessage("Please check out before submitting work log.", "error");
      return;
    }

    if (!workLogForm.summary.trim()) {
      showMessage("Work summary is required.", "error");
      return;
    }

    try {
      const res = await api.post("/work-logs", {
        summary: workLogForm.summary,
        blockers: workLogForm.blockers,
      });

      showMessage(res.data.message || "Work log submitted successfully.");

      setWorkLogForm({
        summary: "",
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

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="panel">
      <div className="panel-heading-row">
        <div>
          <h2>Attendance, Breaks & Work Log</h2>
          <p>
            Standard work time is <strong>8 hours</strong>. Break time is not
            counted as working time.
          </p>
        </div>
      </div>

      {message && (
        <div className={`message-box ${messageType === "error" ? "error" : ""}`}>
          {message}
        </div>
      )}

      <div className="ws-attendance-grid">
        <div className="ws-attendance-card">
          <h3>Today’s Attendance</h3>

          <div className="ws-attendance-metrics">
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
              <span>Total Break</span>
              <strong>{formatDuration(totalBreakMinutes)}</strong>
            </div>

            <div>
              <span>Net Work</span>
              <strong>{formatDuration(netMinutes)}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong>{todayAttendance?.status || "Not Marked"}</strong>
            </div>
          </div>

          {todayAttendance?.has_active_break && (
            <div className="ws-break-active">
              Break is active since{" "}
              {formatTimeIST(todayAttendance.active_break_start)} IST
            </div>
          )}

          {isOvertime && !todayAttendance?.check_out && (
            <div className="ws-overtime-box">
              <strong>Overtime reason required</strong>
              <textarea
                value={overtimeReason}
                onChange={(e) => setOvertimeReason(e.target.value)}
                placeholder="Explain why you worked more than 8 hours"
                required
              ></textarea>
            </div>
          )}

          {todayAttendance?.overtime_reason && (
            <div className="ws-overtime-box">
              <strong>Overtime Reason</strong>
              <p>{todayAttendance.overtime_reason}</p>
            </div>
          )}

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
              onClick={startBreak}
              disabled={
                !todayAttendance?.check_in ||
                Boolean(todayAttendance?.check_out) ||
                Boolean(todayAttendance?.has_active_break)
              }
            >
              Start Break
            </button>

            <button
              type="button"
              className="outline-small-btn"
              onClick={endBreak}
              disabled={!todayAttendance?.has_active_break}
            >
              End Break
            </button>

            <button
              type="button"
              className="outline-small-btn"
              onClick={checkOut}
              disabled={
                !todayAttendance?.check_in ||
                Boolean(todayAttendance?.check_out) ||
                Boolean(todayAttendance?.has_active_break)
              }
            >
              Check Out
            </button>
          </div>
        </div>

        <form className="ws-attendance-card" onSubmit={submitWorkLog}>
          <h3>Submit Daily Work Log</h3>

          <div className="ws-worklog-note">
            <span>Today’s Net Work</span>
            <strong>{formatDuration(netMinutes)}</strong>
          </div>

          {!todayAttendance?.check_out && (
            <p className="small-text">
              You can submit work log only after checkout.
            </p>
          )}

          <textarea
            name="summary"
            value={workLogForm.summary}
            onChange={updateWorkLogField}
            placeholder="What did you work on today?"
            required
          ></textarea>

          <textarea
            name="blockers"
            value={workLogForm.blockers}
            onChange={updateWorkLogField}
            placeholder="Blockers or doubts optional"
          ></textarea>

          <button type="submit" disabled={!todayAttendance?.check_out}>
            Submit Work Log
          </button>
        </form>
      </div>

      <div className="attendance-history-grid">
        <div className="ws-attendance-card">
          <h3>Recent Attendance</h3>

          <div className="mini-table-list">
            {attendanceHistory.length === 0 && <p>No attendance records yet.</p>}

            {attendanceHistory.slice(0, 6).map((item) => (
              <div className="mini-table-row" key={item.id}>
                <span>{formatDateIST(item.attendance_date)}</span>
                <strong>
                  {formatDuration(item.net_work_minutes)} work /{" "}
                  {formatDuration(item.total_break_minutes)} break
                </strong>
              </div>
            ))}
          </div>
        </div>

        <div className="ws-attendance-card">
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

                {log.overtime_reason && (
                  <small className="overtime-text">
                    Overtime Reason: {log.overtime_reason}
                  </small>
                )}

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