// Client/src/components/InternPerformancePanel.jsx

import { useEffect, useState } from "react";
import api from "../api/api";

function InternPerformancePanel() {
  const [performance, setPerformance] = useState(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    return String(dateValue).slice(0, 10);
  };

  const loadPerformance = async () => {
    try {
      const res = await api.get("/performance/my");
      setPerformance(res.data.performance);
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to load performance.",
        "error"
      );
    }
  };

  useEffect(() => {
    loadPerformance();
  }, []);

  return (
    <section className="panel">
      <h2>My Performance</h2>
      <p>Your score is calculated from training, tasks, attendance, and logs.</p>

      {message && (
        <div className={`message-box ${messageType === "error" ? "error" : ""}`}>
          {message}
        </div>
      )}

      {!performance && (
        <div className="empty-state">
          <h3>No performance data yet</h3>
          <p>Complete training, tasks, attendance, and work logs first.</p>
        </div>
      )}

      {performance && (
        <>
          <div className="performance-header intern-performance-main">
            <div>
              <h3>{performance.full_name}</h3>
              <p>
                {performance.intern_id} | {performance.department_name || "-"}
              </p>
            </div>

            <div className="final-score-box">
              <h2>{performance.finalScore}%</h2>
              <span>{performance.grade}</span>
            </div>
          </div>

          <div className="score-grid">
            <div>
              <span>Training</span>
              <strong>{performance.trainingScore}%</strong>
            </div>

            <div>
              <span>Tasks</span>
              <strong>{performance.taskScore}%</strong>
            </div>

            <div>
              <span>Attendance</span>
              <strong>{performance.attendanceScore}%</strong>
            </div>

            <div>
              <span>Work Logs</span>
              <strong>{performance.workLogScore}%</strong>
            </div>
          </div>

          <div className="performance-details">
            <p>
              <strong>Training:</strong> {performance.completedModules}/
              {performance.totalModules} modules completed
            </p>

            <p>
              <strong>Tasks:</strong> {performance.completedTasks}/
              {performance.totalTasks} tasks completed
            </p>

            <p>
              <strong>Attendance:</strong> {performance.presentDays}/
              {performance.totalAttendance} days present
            </p>

            <p>
              <strong>Work Logs:</strong> {performance.totalLogs} logs submitted
            </p>
          </div>

          <div className="review-history">
            <h3>HR/Mentor Reviews</h3>

            {performance.reviews.length === 0 && (
              <p>No reviews submitted yet.</p>
            )}

            {performance.reviews.map((review) => (
              <div className="review-history-card" key={review.id}>
                <div>
                  <strong>Rating: {review.rating}/5</strong>
                  <span>{formatDate(review.created_at)}</span>
                </div>

                <p>{review.feedback || "No feedback provided."}</p>

                <small>Reviewed by: {review.reviewed_by_name || "-"}</small>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default InternPerformancePanel;