// Client/src/pages/AdminDashboard.jsx

import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [usersLoading, setUsersLoading] = useState(true);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);

  const [usersError, setUsersError] = useState("");
  const [departmentsError, setDepartmentsError] = useState("");

  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [departmentSearch, setDepartmentSearch] = useState("");

  const [userForm, setUserForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "hr",
  });

  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    code: "",
  });

  const [generatedPassword, setGeneratedPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      setUsersError("");

      const res = await api.get("/admin/users");
      setUsers(res.data.users || []);
    } catch (error) {
      setUsersError(error.response?.data?.message || "Failed to load users.");
    } finally {
      setUsersLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      setDepartmentsLoading(true);
      setDepartmentsError("");

      const res = await api.get("/admin/departments");
      setDepartments(res.data.departments || []);
    } catch (error) {
      setDepartmentsError(
        error.response?.data?.message || "Failed to load departments."
      );
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const loadData = async () => {
    await Promise.all([loadUsers(), loadDepartments()]);
  };

  const filteredUsers = useMemo(() => {
    const searchText = userSearch.trim().toLowerCase();

    return users.filter((item) => {
      const name = String(item.full_name || item.fullName || "").toLowerCase();
      const email = String(item.email || "").toLowerCase();
      const role = String(item.role || "").toLowerCase();

      const matchesSearch =
        !searchText || name.includes(searchText) || email.includes(searchText);

      const matchesRole = roleFilter === "all" || role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, userSearch, roleFilter]);

  const filteredDepartments = useMemo(() => {
    const searchText = departmentSearch.trim().toLowerCase();

    return departments.filter((dept) => {
      const name = String(dept.name || "").toLowerCase();
      const code = String(dept.code || "").toLowerCase();

      return !searchText || name.includes(searchText) || code.includes(searchText);
    });
  }, [departments, departmentSearch]);

  const updateUserForm = (e) => {
    setUserForm({
      ...userForm,
      [e.target.name]: e.target.value,
    });
  };

  const updateDepartmentForm = (e) => {
    setDepartmentForm({
      ...departmentForm,
      [e.target.name]: e.target.value,
    });
  };

  const createUser = async (e) => {
    e.preventDefault();

    setGeneratedPassword("");
    setMessage("");
    setMessageType("");

    try {
      const res = await api.post("/admin/users", userForm);

      showMessage(res.data.message || "User created successfully.");

      setGeneratedPassword(
        res.data.generatedPassword ||
          res.data.password ||
          userForm.password ||
          ""
      );

      setUserForm({
        fullName: "",
        email: "",
        password: "",
        role: "hr",
      });

      await loadUsers();
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

      showMessage(res.data.message || "User role updated successfully.");
      await loadUsers();
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

      setGeneratedPassword(
        res.data.generatedPassword || res.data.password || ""
      );

      await loadUsers();
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
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to delete user.",
        "error"
      );
    }
  };

  const createDepartment = async (e) => {
    e.preventDefault();

    setMessage("");
    setMessageType("");

    try {
      const res = await api.post("/admin/departments", departmentForm);

      showMessage(res.data.message || "Department created successfully.");

      setDepartmentForm({
        name: "",
        code: "",
      });

      await loadDepartments();
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
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to delete department.",
        "error"
      );
    }
  };

  const clearUserFilters = () => {
    setUserSearch("");
    setRoleFilter("all");
  };

  const clearDepartmentFilters = () => {
    setDepartmentSearch("");
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <main className="dashboard-page">
      <section className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p>
          Manage platform users, user roles, departments, and WorkSync system
          access.
        </p>
      </section>

      {message && (
        <section className="panel">
          <div
            className={`message-box ${messageType === "error" ? "error" : ""}`}
          >
            {message}
          </div>

          {generatedPassword && (
            <div className="ws-highlight-box">
              <strong>Generated Password:</strong>
              <p>{generatedPassword}</p>
            </div>
          )}
        </section>
      )}

      <section className="panel">
        <div className="panel-heading-row">
          <div>
            <h2>Create Platform User</h2>
            <p>
              Create Admin, HR, Mentor, Intern, or Applicant/User accounts from
              one place.
            </p>
          </div>
        </div>

        <form className="form-grid" onSubmit={createUser}>
          <label>
            Full Name
            <input
              type="text"
              name="fullName"
              value={userForm.fullName}
              onChange={updateUserForm}
              placeholder="Enter full name"
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              name="email"
              value={userForm.email}
              onChange={updateUserForm}
              placeholder="Enter email address"
              required
            />
          </label>

          <label>
            Password
            <input
              type="text"
              name="password"
              value={userForm.password}
              onChange={updateUserForm}
              placeholder="Example: 123456"
              required
            />
          </label>

          <label>
            Role
            <select
              name="role"
              value={userForm.role}
              onChange={updateUserForm}
              required
            >
              <option value="admin">Admin</option>
              <option value="hr">HR</option>
              <option value="mentor">Mentor</option>
              <option value="intern">Intern</option>
              <option value="user">Applicant / User</option>
            </select>
          </label>

          <div className="form-grid-full">
            <button type="submit">Create User</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading-row">
          <div>
            <h2>Users & Roles</h2>
            <p>Search users by name/email and filter by role.</p>
          </div>

          <button
            type="button"
            className="outline-small-btn"
            onClick={loadUsers}
          >
            Refresh
          </button>
        </div>

        <div className="ws-filter-bar">
          <div className="ws-filter-field">
            <label>Search Users</label>
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by name or email"
            />
          </div>

          <div className="ws-filter-field">
            <label>Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="hr">HR</option>
              <option value="mentor">Mentor</option>
              <option value="intern">Intern</option>
              <option value="user">Applicant / User</option>
            </select>
          </div>

          <div className="ws-filter-actions">
            <button
              type="button"
              className="outline-small-btn"
              onClick={clearUserFilters}
            >
              Clear
            </button>
          </div>
        </div>

        <p className="ws-result-count">
          Showing {filteredUsers.length} of {users.length} users
        </p>

        {usersLoading && <LoadingState type="table" />}

        {!usersLoading && usersError && (
          <ErrorState
            title="Users not loaded"
            message={usersError}
            onRetry={loadUsers}
          />
        )}

        {!usersLoading && !usersError && users.length === 0 && (
          <EmptyState
            title="No users found"
            message="Created platform users will appear here."
          />
        )}

        {!usersLoading && !usersError && users.length > 0 && filteredUsers.length === 0 && (
          <EmptyState
            title="No matching users"
            message="Try changing the search text or role filter."
          />
        )}

        {!usersLoading && !usersError && filteredUsers.length > 0 && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Change Role</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((item) => (
                  <tr key={item.id}>
                    <td>{item.full_name || item.fullName || "-"}</td>
                    <td>{item.email}</td>
                    <td>
                      <span className="status selected">{item.role}</span>
                    </td>
                    <td>
                      <select
                        value={item.role}
                        onChange={(e) =>
                          updateUserRole(item.id, e.target.value)
                        }
                      >
                        <option value="admin">Admin</option>
                        <option value="hr">HR</option>
                        <option value="mentor">Mentor</option>
                        <option value="intern">Intern</option>
                        <option value="user">Applicant / User</option>
                      </select>
                    </td>
                    <td>
                      <div className="task-action-row">
                        <button
                          type="button"
                          className="small-btn"
                          onClick={() => resetPassword(item.id)}
                        >
                          Reset Password
                        </button>

                        <button
                          type="button"
                          className="outline-small-btn"
                          onClick={() => deleteUser(item.id)}
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
        )}
      </section>

      <section className="panel">
        <div className="panel-heading-row">
          <div>
            <h2>Department Management</h2>
            <p>Create, search, and manage departments used during onboarding.</p>
          </div>
        </div>

        <form className="form-grid" onSubmit={createDepartment}>
          <label>
            Department Name
            <input
              type="text"
              name="name"
              value={departmentForm.name}
              onChange={updateDepartmentForm}
              placeholder="Example: Web Development"
              required
            />
          </label>

          <label>
            Department Code
            <input
              type="text"
              name="code"
              value={departmentForm.code}
              onChange={updateDepartmentForm}
              placeholder="Example: WD"
              required
            />
          </label>

          <div className="form-grid-full">
            <button type="submit">Create Department</button>
          </div>
        </form>

        <h3 className="section-subtitle">Departments</h3>

        <div className="ws-filter-bar">
          <div className="ws-filter-field ws-filter-wide">
            <label>Search Departments</label>
            <input
              type="text"
              value={departmentSearch}
              onChange={(e) => setDepartmentSearch(e.target.value)}
              placeholder="Search by department name or code"
            />
          </div>

          <div className="ws-filter-actions">
            <button
              type="button"
              className="outline-small-btn"
              onClick={clearDepartmentFilters}
            >
              Clear
            </button>
          </div>
        </div>

        <p className="ws-result-count">
          Showing {filteredDepartments.length} of {departments.length} departments
        </p>

        {departmentsLoading && <LoadingState type="table" />}

        {!departmentsLoading && departmentsError && (
          <ErrorState
            title="Departments not loaded"
            message={departmentsError}
            onRetry={loadDepartments}
          />
        )}

        {!departmentsLoading && !departmentsError && departments.length === 0 && (
          <EmptyState
            title="No departments found"
            message="Departments created by admin will appear here."
          />
        )}

        {!departmentsLoading &&
          !departmentsError &&
          departments.length > 0 &&
          filteredDepartments.length === 0 && (
            <EmptyState
              title="No matching departments"
              message="Try changing the search text."
            />
          )}

        {!departmentsLoading &&
          !departmentsError &&
          filteredDepartments.length > 0 && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Code</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDepartments.map((dept) => (
                    <tr key={dept.id}>
                      <td>{dept.name}</td>
                      <td>
                        <span className="status info">{dept.code}</span>
                      </td>
                      <td>
                        {dept.created_at
                          ? new Date(dept.created_at).toLocaleDateString(
                              "en-IN"
                            )
                          : "-"}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="outline-small-btn"
                          onClick={() => deleteDepartment(dept.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </section>
    </main>
  );
}

export default AdminDashboard;