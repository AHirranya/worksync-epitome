// Client/src/pages/AdminDashboard.jsx

import { useEffect, useState } from "react";
import api from "../api/api";
import DashboardQuickNav from "../components/DashboardQuickNav";

function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [newUser, setNewUser] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "hr",
  });

  const [newDepartment, setNewDepartment] = useState({
    name: "",
    code: "",
  });

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState(null);
  const [loading, setLoading] = useState(true);

  const adminNavLinks = [
    { id: "admin-overview", label: "Overview" },
    { id: "admin-users", label: "Users" },
    { id: "admin-create-user", label: "Create User" },
    { id: "admin-departments", label: "Departments" },
    { id: "admin-settings", label: "Settings" },
  ];

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    return String(dateValue).slice(0, 10);
  };

  const loadSummary = async () => {
    const res = await api.get("/admin/summary");
    setSummary(res.data.summary);
  };

  const loadUsers = async () => {
    const res = await api.get("/admin/users");
    setUsers(res.data.users || []);
  };

  const loadDepartments = async () => {
    const res = await api.get("/admin/departments");
    setDepartments(res.data.departments || []);
  };

  const loadDashboard = async () => {
    setLoading(true);
    setMessage("");

    try {
      await loadSummary();
      await loadUsers();
      await loadDepartments();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to load admin dashboard.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const updateNewUserField = (e) => {
    setNewUser({
      ...newUser,
      [e.target.name]: e.target.value,
    });
  };

  const updateDepartmentField = (e) => {
    setNewDepartment({
      ...newDepartment,
      [e.target.name]: e.target.value,
    });
  };

  const createUser = async (e) => {
    e.preventDefault();

    setGeneratedPassword(null);
    setMessage("");

    try {
      const res = await api.post("/admin/users", newUser);

      showMessage(res.data.message || "User created successfully.");
      setGeneratedPassword({
        email: res.data.user.email,
        password: res.data.generatedPassword,
        role: res.data.user.role,
      });

      setNewUser({
        fullName: "",
        email: "",
        password: "",
        role: "hr",
      });

      await loadUsers();
      await loadSummary();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to create user.",
        "error"
      );
    }
  };

  const updateUserRole = async (userId, role) => {
    try {
      const res = await api.patch(`/admin/users/${userId}/role`, {
        role,
      });

      showMessage(res.data.message || "Role updated successfully.");
      await loadUsers();
      await loadSummary();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to update user role.",
        "error"
      );
    }
  };

  const resetPassword = async (userId) => {
    try {
      const res = await api.patch(`/admin/users/${userId}/reset-password`);

      showMessage(res.data.message || "Password reset successfully.");
      setGeneratedPassword({
        email: res.data.user.email,
        password: res.data.generatedPassword,
        role: res.data.user.role,
      });
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to reset password.",
        "error"
      );
    }
  };

  const deleteUser = async (userId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this user?"
    );

    if (!confirmDelete) return;

    try {
      const res = await api.delete(`/admin/users/${userId}`);

      showMessage(res.data.message || "User deleted successfully.");
      await loadUsers();
      await loadSummary();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to delete user.",
        "error"
      );
    }
  };

  const createDepartment = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post("/admin/departments", newDepartment);

      showMessage(res.data.message || "Department created successfully.");

      setNewDepartment({
        name: "",
        code: "",
      });

      await loadDepartments();
      await loadSummary();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to create department.",
        "error"
      );
    }
  };

  const deleteDepartment = async (departmentId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this department?"
    );

    if (!confirmDelete) return;

    try {
      const res = await api.delete(`/admin/departments/${departmentId}`);

      showMessage(res.data.message || "Department deleted successfully.");

      await loadDepartments();
      await loadSummary();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to delete department.",
        "error"
      );
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-header">
          <p className="eyebrow">Admin Workspace</p>
          <h1>Admin Dashboard</h1>
          <p>Loading platform control panel...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-header admin-header">
        <p className="eyebrow">Admin Workspace</p>
        <h1>Admin Dashboard</h1>
        <p>
          Manage users, roles, HR accounts, mentors, departments, certificate
          rules, and overall WorkSync platform settings.
        </p>
      </div>

      <DashboardQuickNav links={adminNavLinks} />

      {message && (
        <div className={`message-box ${messageType === "error" ? "error" : ""}`}>
          {message}
        </div>
      )}

      {generatedPassword && (
        <div className="credentials-box admin-generated-box">
          <h3>Generated Login Credentials</h3>

          <div className="credentials-grid">
            <div>
              <span>Email</span>
              <strong>{generatedPassword.email}</strong>
            </div>

            <div>
              <span>Password</span>
              <strong>{generatedPassword.password}</strong>
            </div>

            <div>
              <span>Role</span>
              <strong>{generatedPassword.role}</strong>
            </div>
          </div>

          <p className="warning-text">
            Save this password now. It will not be shown again after refresh.
          </p>
        </div>
      )}

      <section id="admin-overview" className="stats-grid">
        <div className="stat-card">
          <p>Total Users</p>
          <h2>{summary?.totalUsers || 0}</h2>
          <span>All registered accounts</span>
        </div>

        <div className="stat-card">
          <p>HR Accounts</p>
          <h2>{summary?.totalHRs || 0}</h2>
          <span>HR users managing interns</span>
        </div>

        <div className="stat-card">
          <p>Interns</p>
          <h2>{summary?.totalInterns || 0}</h2>
          <span>Onboarded intern accounts</span>
        </div>

        <div className="stat-card">
          <p>Certificates</p>
          <h2>{summary?.certificatesIssued || 0}</h2>
          <span>Issued training certificates</span>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <p>Admins</p>
          <h2>{summary?.totalAdmins || 0}</h2>
          <span>Platform control users</span>
        </div>

        <div className="stat-card">
          <p>Mentors</p>
          <h2>{summary?.totalMentors || 0}</h2>
          <span>Assigned support accounts</span>
        </div>

        <div className="stat-card">
          <p>Applicants</p>
          <h2>{summary?.totalApplicants || 0}</h2>
          <span>All internship applicants</span>
        </div>

        <div className="stat-card">
          <p>Departments</p>
          <h2>{summary?.totalDepartments || 0}</h2>
          <span>Active platform departments</span>
        </div>
      </section>

      <section id="admin-users" className="panel">
        <h2>User & Role Management</h2>
        <p>
          View all users, change roles, reset passwords, and remove test
          accounts.
        </p>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Current Role</th>
                <th>Change Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan="6">No users found.</td>
                </tr>
              )}

              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.full_name}</td>
                  <td>{user.email}</td>

                  <td>
                    <span className={`status ${user.role}`}>{user.role}</span>
                  </td>

                  <td>
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="hr">HR</option>
                      <option value="mentor">Mentor</option>
                      <option value="intern">Intern</option>
                      <option value="user">User</option>
                    </select>
                  </td>

                  <td>{formatDate(user.created_at)}</td>

                  <td>
                    <div className="admin-action-row">
                      <button
                        type="button"
                        className="outline-small-btn"
                        onClick={() => resetPassword(user.id)}
                      >
                        Reset Password
                      </button>

                      <button
                        type="button"
                        className="danger-small-btn"
                        onClick={() => deleteUser(user.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="admin-create-user" className="panel">
        <h2>Create HR / Mentor / Admin Account</h2>
        <p>
          Admin can create platform accounts directly. If password is empty, the
          system will generate one.
        </p>

        <form className="admin-form-grid" onSubmit={createUser}>
          <input
            type="text"
            name="fullName"
            value={newUser.fullName}
            onChange={updateNewUserField}
            placeholder="Full name"
            required
          />

          <input
            type="email"
            name="email"
            value={newUser.email}
            onChange={updateNewUserField}
            placeholder="Email address"
            required
          />

          <input
            type="text"
            name="password"
            value={newUser.password}
            onChange={updateNewUserField}
            placeholder="Password optional"
          />

          <select name="role" value={newUser.role} onChange={updateNewUserField}>
            <option value="admin">Admin</option>
            <option value="hr">HR</option>
            <option value="mentor">Mentor</option>
            <option value="user">User</option>
          </select>

          <button type="submit">Create User Account</button>
        </form>
      </section>

      <section id="admin-departments" className="panel">
        <h2>Department Management</h2>
        <p>Add and manage departments used in onboarding and training.</p>

        <form className="admin-form-grid" onSubmit={createDepartment}>
          <input
            type="text"
            name="name"
            value={newDepartment.name}
            onChange={updateDepartmentField}
            placeholder="Department name"
            required
          />

          <input
            type="text"
            name="code"
            value={newDepartment.code}
            onChange={updateDepartmentField}
            placeholder="Department code"
            required
          />

          <button type="submit">Add Department</button>
        </form>

        <div className="department-admin-grid">
          {departments.length === 0 && (
            <div className="empty-state">
              <h3>No departments found</h3>
              <p>Add departments to use onboarding and training features.</p>
            </div>
          )}

          {departments.map((department) => (
            <div className="department-admin-card" key={department.id}>
              <div>
                <h3>{department.name}</h3>
                <p>{department.code}</p>
              </div>

              <button
                type="button"
                className="danger-small-btn"
                onClick={() => deleteDepartment(department.id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>

      <section id="admin-settings" className="panel">
        <h2>System Settings</h2>
        <p>Current platform rules and configuration summary.</p>

        <div className="admin-settings-grid">
          <div className="admin-setting-card">
            <h3>Certificate Rule</h3>
            <p>{summary?.certificateRule || "75% training completion"}</p>
          </div>

          <div className="admin-setting-card">
            <h3>Allowed Roles</h3>
            <p>admin, hr, mentor, intern, user</p>
          </div>

          <div className="admin-setting-card">
            <h3>Certificate Type</h3>
            <p>Training Completion Certificate</p>
          </div>

          <div className="admin-setting-card">
            <h3>Work Modes</h3>
            <p>Remote, Hybrid, Onsite</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default AdminDashboard;