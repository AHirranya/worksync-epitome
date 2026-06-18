import { useEffect, useMemo, useState } from "react";
import api from "../api/api";

function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [reports, setReports] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [activeTab, setActiveTab] = useState("overview");

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setMessage("");

      const [summaryRes, usersRes, departmentRes, reportsRes, auditRes] =
        await Promise.allSettled([
          api.get("/admin/summary"),
          api.get("/admin/users"),
          api.get("/admin/departments"),
          api.get("/reports"),
          api.get("/audit"),
        ]);

      if (summaryRes.status === "fulfilled") {
        setSummary(summaryRes.value.data?.summary || null);
      }

      if (usersRes.status === "fulfilled") {
        setUsers(usersRes.value.data?.users || []);
      }

      if (departmentRes.status === "fulfilled") {
        setDepartments(departmentRes.value.data?.departments || []);
      }

      if (reportsRes.status === "fulfilled") {
        setReports(reportsRes.value.data || null);
      }

      if (auditRes.status === "fulfilled") {
        const data = auditRes.value.data;
        setAuditLogs(data?.logs || data?.auditLogs || data?.audits || []);
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Failed to load admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const roleCounts = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        const role = String(user.role || "").toLowerCase();

        if (role === "admin") acc.admin += 1;
        if (role === "hr") acc.hr += 1;
        if (role === "mentor") acc.mentor += 1;
        if (role === "intern") acc.intern += 1;

        return acc;
      },
      {
        admin: 0,
        hr: 0,
        mentor: 0,
        intern: 0,
      }
    );
  }, [users]);

  const reportCards = [
    {
      title: "Total Users",
      value: summary?.totalUsers ?? users.length,
      description: "All registered platform users",
    },
    {
      title: "Total Interns",
      value: summary?.totalInterns ?? roleCounts.intern,
      description: "Active and onboarded interns",
    },
    {
      title: "Departments",
      value: summary?.totalDepartments ?? departments.length,
      description: "Available departments",
    },
    {
      title: "Certificates",
      value: summary?.certificatesIssued ?? 0,
      description: "Issued certificates",
    },
    {
      title: "Work Logs",
      value: summary?.workLogs ?? reports?.summary?.workLogs ?? 0,
      description: "Submitted work logs",
    },
    {
      title: "Attendance",
      value: summary?.attendanceRecords ?? reports?.summary?.attendance ?? 0,
      description: "Attendance entries",
    },
  ];

  const departmentStats = departments.map((department) => {
    const count = users.filter((user) => {
      const dept = String(user.department_name || user.department || "")
        .trim()
        .toLowerCase();

      return dept === String(department.name || "").trim().toLowerCase();
    }).length;

    return {
      id: department.id,
      name: department.name,
      code: department.code,
      count,
    };
  });

  return (
    <main className="admin-pro-page">
      <section className="admin-pro-hero">
        <div>
          <p className="admin-pro-kicker">Admin Control Center</p>
          <h1>Admin Dashboard</h1>
          <span>
            Manage users, departments, reports, certificates, work logs,
            attendance, and audit activity in one clean dashboard.
          </span>
        </div>

        <button
          type="button"
          className="admin-refresh-btn"
          onClick={loadAdminData}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </section>

      {message && <div className="admin-message">{message}</div>}

      <section className="admin-pro-stats">
        <StatCard
          label="Total Users"
          value={summary?.totalUsers ?? users.length}
          note="All users"
        />
        <StatCard label="Admins" value={summary?.totalAdmins ?? roleCounts.admin} note="System access" />
        <StatCard label="HR" value={summary?.totalHRs ?? roleCounts.hr} note="Onboarding team" />
        <StatCard label="Mentors" value={summary?.totalMentors ?? roleCounts.mentor} note="Intern guides" />
        <StatCard label="Interns" value={summary?.totalInterns ?? roleCounts.intern} note="Learners" />
        <StatCard
          label="Departments"
          value={summary?.totalDepartments ?? departments.length}
          note="Training groups"
        />
      </section>

      <section className="admin-tabs">
        {[
          ["overview", "Overview"],
          ["users", "Users"],
          ["departments", "Departments"],
          ["reports", "Reports"],
          ["audit", "Audit Logs"],
        ].map(([key, label]) => (
          <button
            type="button"
            key={key}
            className={activeTab === key ? "active" : ""}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </section>

      {activeTab === "overview" && (
        <section className="admin-pro-grid">
          <div className="admin-panel large">
            <PanelHeader
              title="Role Distribution"
              subtitle="Users separated by platform roles"
            />

            <div className="role-list">
              <RoleRow label="Admin" count={roleCounts.admin} />
              <RoleRow label="HR" count={roleCounts.hr} />
              <RoleRow label="Mentor" count={roleCounts.mentor} />
              <RoleRow label="Intern" count={roleCounts.intern} />
            </div>
          </div>

          <div className="admin-panel">
            <PanelHeader
              title="Certificate Rule"
              subtitle="Current eligibility rule"
            />

            <div className="rule-box">
              {summary?.certificateRule ||
                "75% theory/video training completion"}
            </div>
          </div>

          <div className="admin-panel full">
            <PanelHeader
              title="Recent Users"
              subtitle="Latest user accounts"
            />

            <div className="admin-table-wrap">
              <table className="admin-pro-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 8).map((user) => (
                    <tr key={user.id}>
                      <td>{user.full_name || user.fullName || "-"}</td>
                      <td>{user.email || "-"}</td>
                      <td>
                        <span className="role-pill">{user.role || "-"}</span>
                      </td>
                      <td>{formatDate(user.created_at || user.createdAt)}</td>
                    </tr>
                  ))}

                  {users.length === 0 && (
                    <tr>
                      <td colSpan="4">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {activeTab === "users" && (
        <section className="admin-panel full">
          <PanelHeader
            title="Users"
            subtitle="All registered users in the system"
          />

          <div className="admin-table-wrap">
            <table className="admin-pro-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.full_name || user.fullName || "-"}</td>
                    <td>{user.email || "-"}</td>
                    <td>
                      <span className="role-pill">{user.role || "-"}</span>
                    </td>
                    <td>{formatDate(user.created_at || user.createdAt)}</td>
                  </tr>
                ))}

                {users.length === 0 && (
                  <tr>
                    <td colSpan="5">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "departments" && (
        <section className="admin-panel full">
          <PanelHeader
            title="Departments"
            subtitle="Department-wise intern and training structure"
          />

          <div className="department-grid">
            {departmentStats.map((department) => (
              <div className="department-card" key={department.id}>
                <div>
                  <h3>{department.name}</h3>
                  <p>{department.code || "NO CODE"}</p>
                </div>
                <strong>{department.count}</strong>
              </div>
            ))}

            {departmentStats.length === 0 && (
              <div className="empty-state">No departments found.</div>
            )}
          </div>
        </section>
      )}

      {activeTab === "reports" && (
        <section className="admin-panel full">
          <PanelHeader
            title="Reports & Analytics"
            subtitle="System overview from recruitment, onboarding, training, attendance, work logs, certificates, and performance"
          />

          <div className="report-card-grid">
            {reportCards.map((item) => (
              <div className="report-pro-card" key={item.title}>
                <p>{item.title}</p>
                <h3>{item.value}</h3>
                <span>{item.description}</span>
              </div>
            ))}
          </div>

          <div className="admin-report-section">
            <h3>Training Completion</h3>
            <p>
              Overall completion of assigned training modules across interns.
            </p>

            <div className="progress-line">
              <div
                style={{
                  width: `${Number(reports?.summary?.trainingCompletion || 0)}%`,
                }}
              />
            </div>

            <strong>{Number(reports?.summary?.trainingCompletion || 0)}%</strong>
          </div>

          <div className="admin-report-section">
            <h3>Department-wise Intern Count</h3>

            <div className="department-report-list">
              {departmentStats.map((department) => (
                <div key={department.id}>
                  <span>{department.name}</span>
                  <strong>{department.count}</strong>
                </div>
              ))}

              {departmentStats.length === 0 && <p>No department data.</p>}
            </div>
          </div>
        </section>
      )}

      {activeTab === "audit" && (
        <section className="admin-panel full">
          <PanelHeader
            title="Audit Logs"
            subtitle="Important system actions such as onboarding, certificates, attendance, training, and admin changes"
          />

          <div className="audit-summary-grid">
            <div>
              <p>Total Loaded Logs</p>
              <h3>{auditLogs.length}</h3>
            </div>
            <div>
              <p>Today's Logs</p>
              <h3>{countTodayLogs(auditLogs)}</h3>
            </div>
            <div>
              <p>Action Types</p>
              <h3>{new Set(auditLogs.map((item) => item.action)).size}</h3>
            </div>
          </div>

          <div className="audit-log-list">
            {auditLogs.slice(0, 20).map((log, index) => (
              <div className="audit-log-item" key={log.id || index}>
                <div>
                  <h4>{log.action || log.event || "System Action"}</h4>
                  <p>{log.description || log.message || "No description"}</p>
                </div>
                <span>{formatDate(log.created_at || log.createdAt)}</span>
              </div>
            ))}

            {auditLogs.length === 0 && (
              <div className="empty-state">
                No audit logs returned from backend.
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function StatCard({ label, value, note }) {
  return (
    <div className="admin-stat-card">
      <p>{label}</p>
      <h2>{value}</h2>
      <span>{note}</span>
    </div>
  );
}

function PanelHeader({ title, subtitle }) {
  return (
    <div className="panel-header">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function RoleRow({ label, count }) {
  return (
    <div className="role-row">
      <span>{label}</span>
      <strong>{count}</strong>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("en-IN");
  } catch (error) {
    return String(value).slice(0, 10);
  }
}

function countTodayLogs(logs) {
  const today = new Date().toISOString().slice(0, 10);

  return logs.filter((item) => {
    const value = item.created_at || item.createdAt;
    return value && String(value).slice(0, 10) === today;
  }).length;
}

export default AdminDashboard;