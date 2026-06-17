// Client/src/components/AdminAuditPanel.jsx

import { useEffect, useMemo, useState } from "react";
import api from "../api/api";

function AdminAuditPanel() {
  const [logs, setLogs] = useState([]);
  const [actions, setActions] = useState([]);

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [action, setAction] = useState("all");
  const [date, setDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setMessage("");
      setMessageType("");

      const params = new URLSearchParams();

      params.set("limit", "120");

      if (search.trim()) params.set("search", search.trim());
      if (role !== "all") params.set("role", role);
      if (action !== "all") params.set("action", action);
      if (date) params.set("date", date);

      const res = await api.get(`/audit?${params.toString()}`);

      setLogs(res.data.logs || []);
      setActions(res.data.actions || []);
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to load audit logs.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setRole("all");
    setAction("all");
    setDate("");
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) return "-";

    return new Date(dateValue).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const cleanActionName = (value) => {
    return String(value || "")
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const totalToday = useMemo(() => {
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    return logs.filter((log) => {
      const logDate = new Date(log.created_at).toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });

      return logDate === today;
    }).length;
  }, [logs]);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  return (
    <section className="panel">
      <div className="panel-heading-row">
        <div>
          <h2>Audit Logs</h2>
          <p>
            Track important WorkSync actions such as onboarding, certificates,
            attendance, training, and admin changes.
          </p>
        </div>

        <button
          type="button"
          className="outline-small-btn"
          onClick={loadAuditLogs}
        >
          Refresh
        </button>
      </div>

      {message && (
        <div className={`message-box ${messageType === "error" ? "error" : ""}`}>
          {message}
        </div>
      )}

      <div className="ws12-audit-summary">
        <div>
          <span>Total Loaded Logs</span>
          <strong>{logs.length}</strong>
        </div>

        <div>
          <span>Today's Logs</span>
          <strong>{totalToday}</strong>
        </div>

        <div>
          <span>Action Types</span>
          <strong>{actions.length}</strong>
        </div>
      </div>

      <div className="ws12-filter-bar">
        <div className="ws12-filter-field ws12-wide">
          <label>Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actor, action, target, route..."
          />
        </div>

        <div className="ws12-filter-field">
          <label>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="hr">HR</option>
            <option value="mentor">Mentor</option>
            <option value="intern">Intern</option>
            <option value="user">User</option>
            <option value="system">System</option>
          </select>
        </div>

        <div className="ws12-filter-field">
          <label>Action</label>
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="all">All Actions</option>

            {actions.map((item) => (
              <option key={item} value={item}>
                {cleanActionName(item)}
              </option>
            ))}
          </select>
        </div>

        <div className="ws12-filter-field">
          <label>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="ws12-filter-actions">
          <button type="button" className="small-btn" onClick={loadAuditLogs}>
            Apply
          </button>

          <button
            type="button"
            className="outline-small-btn"
            onClick={clearFilters}
          >
            Clear
          </button>
        </div>
      </div>

      {loading && (
        <div className="ws12-state-card">
          <h3>Loading audit logs</h3>
          <p>Please wait while activity history is loaded.</p>
        </div>
      )}

      {!loading && logs.length === 0 && (
        <div className="ws12-state-card">
          <h3>No audit logs found</h3>
          <p>New system activity will appear here automatically.</p>
        </div>
      )}

      {!loading && logs.length > 0 && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Action</th>
                <th>Target</th>
                <th>Description</th>
                <th>Route</th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.created_at)}</td>

                  <td>
                    {log.actor_name || "System"}
                    <br />
                    <span className="small-text">
                      {log.actor_email || "-"}
                    </span>
                  </td>

                  <td>
                    <span className="status selected">
                      {log.actor_role || "system"}
                    </span>
                  </td>

                  <td>
                    <span className="ws12-action-pill">
                      {cleanActionName(log.action)}
                    </span>
                  </td>

                  <td>
                    {log.target_type || "-"}
                    <br />
                    <span className="small-text">
                      {log.target_name || log.target_id || "-"}
                    </span>
                  </td>

                  <td>{log.description || "-"}</td>

                  <td>
                    <code className="ws12-route-code">{log.route}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default AdminAuditPanel;