// Client/src/components/HRPerformancePanel.jsx

import { useEffect, useState } from "react";
import api from "../api/api";

function HRPerformancePanel() {
  const [performance, setPerformance] = useState([]);
  const [reviewForms, setReviewForms] = useState({});

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const loadPerformance = async () => {
    try {
      const res = await api.get("/performance/hr");
      setPerformance(res.data.performance || []);
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to load performance.",
        "error"
      );
    }
  };

  const updateReviewField = (internId, field, value) => {
    setReviewForms({
      ...reviewForms,
      [internId]: {
        ...(reviewForms[internId] || {}),
        [field]: value,
      },
    });
  };

  const submitReview = async (internId) => {
    const form = reviewForms[internId] || {};

    try {
      const res = await api.post("/performance/reviews", {
        internId,
        rating: form.rating,
        feedback: form.feedback,
      });

      showMessage(res.data.message || "Performance review submitted.");

      setReviewForms({
        ...reviewForms,
        [internId]: {
          rating: "",
          feedback: "",
        },
      });

      await loadPerformance();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to submit review.",
        "error"
      );
    }
  };

  useEffect(() => {
    loadPerformance();
  }, []);

  return (
    <section className="panel">
      <h2>Performance Evaluation</h2>
      <p>
        Review intern performance based on training, tasks, attendance, and work
        logs.
      </p>

      {message && (
        <div className={`message-box ${messageType === "error" ? "error" : ""}`}>
          {message}
        </div>
      )}

      {performance.length === 0 && (
        <div className="empty-state">
          <h3>No performance data yet</h3>
          <p>Performance data will appear after interns start working.</p>
        </div>
      )}

      <div className="performance-list">
        {performance.map((intern) => (
          <div className="performance-card" key={intern.id}>
            <div className="performance-header">
              <div>
                <h3>{intern.full_name}</h3>
                <p>
                  {intern.intern_id} | {intern.department_name || "-"}
                </p>
                <p>{intern.email}</p>
              </div>

              <div className="final-score-box">
                <h2>{intern.finalScore}%</h2>
                <span>{intern.grade}</span>
              </div>
            </div>

            <div className="score-grid">
              <div>
                <span>Training</span>
                <strong>{intern.trainingScore}%</strong>
              </div>

              <div>
                <span>Tasks</span>
                <strong>{intern.taskScore}%</strong>
              </div>

              <div>
                <span>Attendance</span>
                <strong>{intern.attendanceScore}%</strong>
              </div>

              <div>
                <span>Work Logs</span>
                <strong>{intern.workLogScore}%</strong>
              </div>
            </div>

            <div className="performance-details">
              <p>
                <strong>Training:</strong> {intern.completedModules}/
                {intern.totalModules} modules completed
              </p>

              <p>
                <strong>Tasks:</strong> {intern.completedTasks}/
                {intern.totalTasks} tasks completed
              </p>

              <p>
                <strong>Attendance:</strong> {intern.presentDays}/
                {intern.totalAttendance} days present
              </p>

              <p>
                <strong>Work Logs:</strong> {intern.totalLogs} logs submitted
              </p>
            </div>

            {intern.latestReview && (
              <div className="latest-review-box">
                <h4>Latest Review</h4>
                <p>
                  <strong>Rating:</strong> {intern.latestReview.rating}/5
                </p>
                <p>
                  <strong>Feedback:</strong>{" "}
                  {intern.latestReview.feedback || "-"}
                </p>
              </div>
            )}

            <div className="review-form">
              <select
                value={reviewForms[intern.id]?.rating || ""}
                onChange={(e) =>
                  updateReviewField(intern.id, "rating", e.target.value)
                }
              >
                <option value="">Select Rating</option>
                <option value="1">1 - Poor</option>
                <option value="2">2 - Needs Improvement</option>
                <option value="3">3 - Average</option>
                <option value="4">4 - Good</option>
                <option value="5">5 - Excellent</option>
              </select>

              <textarea
                value={reviewForms[intern.id]?.feedback || ""}
                onChange={(e) =>
                  updateReviewField(intern.id, "feedback", e.target.value)
                }
                placeholder="Write HR/Mentor feedback"
              ></textarea>

              <button type="button" onClick={() => submitReview(intern.id)}>
                Submit Review
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HRPerformancePanel;