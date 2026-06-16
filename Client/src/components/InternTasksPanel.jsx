// Client/src/components/InternTasksPanel.jsx

import { useEffect, useState } from "react";
import api from "../api/api";

function InternTasksPanel() {
  const [tasks, setTasks] = useState([]);
  const [updateText, setUpdateText] = useState({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const loadTasks = async () => {
    try {
      const res = await api.get("/tasks/my-tasks");
      setTasks(res.data.tasks || []);
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to load tasks.",
        "error"
      );
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      const res = await api.patch(`/tasks/${taskId}/status`, {
        status,
        updateText: updateText[taskId] || "",
      });

      showMessage(res.data.message || "Task updated successfully.");
      setUpdateText({
        ...updateText,
        [taskId]: "",
      });

      await loadTasks();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to update task.",
        "error"
      );
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    return String(dateValue).slice(0, 10);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  return (
    <section className="panel">
      <h2>My Tasks</h2>
      <p>View assigned tasks and update your progress.</p>

      {message && (
        <div className={`message-box ${messageType === "error" ? "error" : ""}`}>
          {message}
        </div>
      )}

      {tasks.length === 0 && (
        <div className="empty-state">
          <h3>No tasks assigned yet</h3>
          <p>Your assigned tasks will appear here.</p>
        </div>
      )}

      <div className="intern-task-list">
        {tasks.map((task) => (
          <div className="intern-task-card" key={task.id}>
            <div className="intern-task-header">
              <div>
                <h3>{task.title}</h3>
                <p>{task.description || "No description provided."}</p>
              </div>

              <span className={`task-priority ${String(task.priority).toLowerCase()}`}>
                {task.priority}
              </span>
            </div>

            <div className="task-meta-grid">
              <div>
                <span>Assigned By</span>
                <strong>{task.assigned_by_name || "-"}</strong>
              </div>

              <div>
                <span>Due Date</span>
                <strong>{formatDate(task.due_date)}</strong>
              </div>

              <div>
                <span>Status</span>
                <strong>{task.status}</strong>
              </div>
            </div>

            <textarea
              value={updateText[task.id] || ""}
              onChange={(e) =>
                setUpdateText({
                  ...updateText,
                  [task.id]: e.target.value,
                })
              }
              placeholder="Write progress update optional"
              rows="3"
            ></textarea>

            <div className="task-action-row">
              <button
                type="button"
                className="outline-small-btn"
                onClick={() => updateTaskStatus(task.id, "In Progress")}
              >
                In Progress
              </button>

              <button
                type="button"
                className="outline-small-btn"
                onClick={() => updateTaskStatus(task.id, "Blocked")}
              >
                Blocked
              </button>

              <button
                type="button"
                className="small-btn"
                onClick={() => updateTaskStatus(task.id, "Completed")}
              >
                Completed
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default InternTasksPanel;