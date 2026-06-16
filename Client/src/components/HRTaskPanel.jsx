// Client/src/components/HRTaskPanel.jsx

import { useEffect, useState } from "react";
import api from "../api/api";

function HRTaskPanel() {
  const [interns, setInterns] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [formData, setFormData] = useState({
    internId: "",
    title: "",
    description: "",
    priority: "Medium",
    dueDate: "",
  });

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const loadInterns = async () => {
    const res = await api.get("/tasks/interns");
    setInterns(res.data.interns || []);
  };

  const loadTasks = async () => {
    const res = await api.get("/tasks");
    setTasks(res.data.tasks || []);
  };

  const loadData = async () => {
    try {
      await loadInterns();
      await loadTasks();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to load task data.",
        "error"
      );
    }
  };

  const updateField = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const assignTask = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post("/tasks", {
        internId: formData.internId,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        dueDate: formData.dueDate,
      });

      showMessage(res.data.message || "Task assigned successfully.");

      setFormData({
        internId: "",
        title: "",
        description: "",
        priority: "Medium",
        dueDate: "",
      });

      await loadTasks();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to assign task.",
        "error"
      );
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    return String(dateValue).slice(0, 10);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <section className="panel">
      <h2>Task Management</h2>
      <p>Assign tasks to onboarded interns and track their progress.</p>

      {message && (
        <div className={`message-box ${messageType === "error" ? "error" : ""}`}>
          {message}
        </div>
      )}

      <form className="task-form" onSubmit={assignTask}>
        <select
          name="internId"
          value={formData.internId}
          onChange={updateField}
          required
        >
          <option value="">Select Intern</option>

          {interns.map((intern) => (
            <option key={intern.id} value={intern.id}>
              {intern.full_name} - {intern.department_name || "No Department"}
            </option>
          ))}
        </select>

        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={updateField}
          placeholder="Task title"
          required
        />

        <textarea
          name="description"
          value={formData.description}
          onChange={updateField}
          placeholder="Task description"
          rows="3"
        ></textarea>

        <select
          name="priority"
          value={formData.priority}
          onChange={updateField}
        >
          <option value="Low">Low Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="High">High Priority</option>
        </select>

        <input
          type="date"
          name="dueDate"
          value={formData.dueDate}
          onChange={updateField}
        />

        <button type="submit">Assign Task</button>
      </form>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Intern</th>
              <th>Department</th>
              <th>Priority</th>
              <th>Due Date</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {tasks.length === 0 && (
              <tr>
                <td colSpan="6">No tasks assigned yet.</td>
              </tr>
            )}

            {tasks.map((task) => (
              <tr key={task.id}>
                <td>
                  <strong>{task.title}</strong>
                  <br />
                  <span className="small-text">{task.description || "-"}</span>
                </td>
                <td>{task.intern_name}</td>
                <td>{task.department_name || "-"}</td>
                <td>{task.priority}</td>
                <td>{formatDate(task.due_date)}</td>
                <td>
                  <span className={`status ${String(task.status).toLowerCase().replaceAll(" ", "-")}`}>
                    {task.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default HRTaskPanel;