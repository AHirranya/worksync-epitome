import { useEffect, useMemo, useState } from "react";
import api from "../api/api";

function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [reports, setReports] = useState(null);

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [userForm, setUserForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "intern",
  });

  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    code: "",
  });

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setMessage("");

      const [summaryRes, usersRes, departmentsRes, reportsRes] =
        await Promise.allSettled([
          api.get("/admin/summary"),
          api.get("/admin/users"),
          api.get("/admin/departments"),
          api.get("/reports"),
        ]);

      if (summaryRes.status === "fulfilled") {
        setSummary(summaryRes.value.data?.summary || null);
      }

      if (usersRes.status === "fulfilled") {
        setUsers(usersRes.value.data?.users || []);
      }

      if (departmentsRes.status === "fulfilled") {
        setDepartments(departmentsRes.value.data?.departments || []);
      }

      if (reportsRes.status === "fulfilled") {
        setReports(reportsRes.value.data || null);
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

  const handleUserInput = (event) => {
    const { name, value } = event.target;

    setUserForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleDepartmentInput = (event) => {
    const { name, value } = event.target;

    setDepartmentForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const createUser = async (event) => {
    event.preventDefault();

    if (!userForm.fullName || !userForm.email || !userForm.role) {
      setMessage("Full name, email, and role are required.");
      return;
    }

    try {
      setLoading(true);
      setMessage("Creating user...");

      const res = await api.post("/admin/users", {
        fullName: userForm.fullName.trim(),
        email: userForm.email.trim(),
        password: userForm.password.trim() || undefined,
        role: userForm.role,
      });

      const generatedPassword = res.data?.generatedPassword;

      setMessage(
        generatedPassword
          ? `${res.data?.message || "User created."} Password: ${generatedPassword}`
          : res.data?.message || "User created successfully."
      );

      setUserForm({
        fullName: "",
        email: "",
        password: "",
        role: "intern",
      });

      await loadAdminData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to create user.");
    } finally {
      setLoading(false);
    }
  };

  const createDepartment = async (event) => {
    event.preventDefault();

    if (!departmentForm.name || !departmentForm.code) {
      setMessage("Department name and code are required.");
      return;
    }

    try {
      setLoading(true);
      setMessage("Creating department...");

      const res = await api.post("/admin/departments", {
        name: departmentForm.name.trim(),
        code: departmentForm.code.trim(),
      });

      setMessage(res.data?.message || "Department created successfully.");

      setDepartmentForm({
        name: "",
        code: "",
      });

      await loadAdminData();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Failed to create department."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, role) => {
    try {
      setLoading(true);
      setMessage("Updating user role...");

      const res = await api.patch(`/admin/users/${userId}/role`, {
        role,
      });

      setMessage(res.data?.message || "User role updated.");

      await loadAdminData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update role.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (userId) => {
    try {
      setLoading(true);
      setMessage("Resetting password...");

      const res = await api.patch(`/admin/users/${userId}/reset-password`);

      setMessage(
        res.data?.generatedPassword
          ? `${res.data?.message || "Password reset."} New Password: ${
              res.data.generatedPassword
            }`
          : res.data?.message || "Password reset successfully."
      );

      await loadAdminData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this user?"
    );

    if (!confirmDelete) return;

    try {
      setLoading(true);
      setMessage("Deleting user...");

      const res = await api.delete(`/admin/users/${userId}`);

      setMessage(res.data?.message || "User deleted successfully.");

      await loadAdminData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to delete user.");
    } finally {
      setLoading(false);
    }
  };

  const deleteDepartment = async (departmentId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this department?"
    );

    if (!confirmDelete) return;

    try {
      setLoading(true);
      setMessage("Deleting department...");

      const res = await api.delete(`/admin/departments/${departmentId}`);

      setMessage(res.data?.message || "Department deleted successfully.");

      await loadAdminData();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Failed to delete department."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-old-page">
      <section className="admin-old-hero">
        <div>
          <p>Admin Control Panel</p>
          <h1>Admin Dashboard</h1>
          <span>
            Add users manually, create departments, manage roles, monitor
            reports, and control the WorkSync system.
          </span>
        </div>

        <button type="button" onClick={loadAdminData} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </section>

      {message && <div className="admin-old-message">{message}</div>}

      <section className="admin-old-tabs">
        <button
          type="button"
          className={activeTab === "overview" ? "active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>

        <button
          type="button"
          className={activeTab === "users" ? "active" : ""}
          onClick={() => setActiveTab("users")}
        >
          Users
        </button>

        <button
          type="button"
          className={activeTab === "departments" ? "active" : ""}
          onClick={() => setActiveTab("departments")}
        >
          Departments
        </button>

        <button
          type="button"
          className={activeTab === "reports" ? "active" : ""}
          onClick={() => setActiveTab("reports")}
        >
          Reports
        </button>
      </section>

      {activeTab === "overview" && (
        <>
          <section className="admin-old-stats">
            <AdminStat title="Total Users" value={summary?.totalUsers ?? users.length} />
            <AdminStat title="Admins" value={summary?.totalAdmins ?? roleCounts.admin} />
            <AdminStat title="HR" value={summary?.totalHRs ?? roleCounts.hr} />
            <AdminStat title="Mentors" value={summary?.totalMentors ?? roleCounts.mentor} />
            <AdminStat title="Interns" value={summary?.totalInterns ?? roleCounts.intern} />
            <AdminStat
              title="Departments"
              value={summary?.totalDepartments ?? departments.length}
            />
          </section>

          <section className="admin-old-grid">
            <CreateUserForm
              userForm={userForm}
              handleUserInput={handleUserInput}
              createUser={createUser}
              loading={loading}
            />

            <CreateDepartmentForm
              departmentForm={departmentForm}
              handleDepartmentInput={handleDepartmentInput}
              createDepartment={createDepartment}
              loading={loading}
            />
          </section>

          <section className="admin-old-card">
            <div className="admin-old-card-header">
              <div>
                <h2>Recent Users</h2>
                <p>Latest manually created and registered users.</p>
              </div>
            </div>

            <UserTable
              users={users.slice(0, 8)}
              updateUserRole={updateUserRole}
              resetPassword={resetPassword}
              deleteUser={deleteUser}
            />
          </section>
        </>
      )}

      {activeTab === "users" && (
        <section className="admin-old-card">
          <div className="admin-old-card-header">
            <div>
              <h2>Manual User Management</h2>
              <p>Add users with name, email, password, and role.</p>
            </div>
          </div>

          <CreateUserForm
            userForm={userForm}
            handleUserInput={handleUserInput}
            createUser={createUser}
            loading={loading}
          />

          <div className="admin-old-divider" />

          <UserTable
            users={users}
            updateUserRole={updateUserRole}
            resetPassword={resetPassword}
            deleteUser={deleteUser}
          />
        </section>
      )}

      {activeTab === "departments" && (
        <section className="admin-old-card">
          <div className="admin-old-card-header">
            <div>
              <h2>Department Management</h2>
              <p>Add departments manually using department name and code.</p>
            </div>
          </div>

          <CreateDepartmentForm
            departmentForm={departmentForm}
            handleDepartmentInput={handleDepartmentInput}
            createDepartment={createDepartment}
            loading={loading}
          />

          <div className="admin-old-divider" />

          <div className="admin-department-grid">
            {departments.map((department) => (
              <div className="admin-department-card" key={department.id}>
                <div>
                  <h3>{department.name}</h3>
                  <p>Code: {department.code}</p>
                  <span>Created: {formatDate(department.created_at)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => deleteDepartment(department.id)}
                >
                  Delete
                </button>
              </div>
            ))}

            {departments.length === 0 && (
              <div className="admin-empty">No departments found.</div>
            )}
          </div>
        </section>
      )}

      {activeTab === "reports" && (
        <section className="admin-old-card">
          <div className="admin-old-card-header">
            <div>
              <h2>Reports & Analytics</h2>
              <p>
                Overview of users, departments, applicants, certificates,
                attendance, and work logs.
              </p>
            </div>
          </div>

          <section className="admin-old-stats compact">
            <AdminStat
              title="Applicants"
              value={summary?.totalApplicants ?? 0}
            />
            <AdminStat
              title="Selected Applicants"
              value={summary?.selectedApplicants ?? 0}
            />
            <AdminStat
              title="Certificates"
              value={summary?.certificatesIssued ?? 0}
            />
            <AdminStat
              title="Departments"
              value={summary?.totalDepartments ?? departments.length}
            />
          </section>

          <div className="admin-report-box">
            <h3>Certificate Rule</h3>
            <p>
              {summary?.certificateRule ||
                "75% theory/video training completion"}
            </p>
          </div>

          <div className="admin-report-box">
            <h3>Raw Report Data</h3>
            <pre>{reports ? JSON.stringify(reports, null, 2) : "No report data found."}</pre>
          </div>
        </section>
      )}
    </main>
  );
}

function CreateUserForm({ userForm, handleUserInput, createUser, loading }) {
  return (
    <form className="admin-old-card form-card" onSubmit={createUser}>
      <div className="admin-old-card-header">
        <div>
          <h2>Add User Manually</h2>
          <p>Create Admin, HR, Mentor, or Intern account.</p>
        </div>
      </div>

      <div className="admin-form-grid">
        <div className="admin-form-group">
          <label>Full Name *</label>
          <input
            type="text"
            name="fullName"
            value={userForm.fullName}
            onChange={handleUserInput}
            placeholder="Enter full name"
          />
        </div>

        <div className="admin-form-group">
          <label>Email *</label>
          <input
            type="email"
            name="email"
            value={userForm.email}
            onChange={handleUserInput}
            placeholder="Enter email"
          />
        </div>

        <div className="admin-form-group">
          <label>Password</label>
          <input
            type="text"
            name="password"
            value={userForm.password}
            onChange={handleUserInput}
            placeholder="Enter password or leave empty"
          />
        </div>

        <div className="admin-form-group">
          <label>Role *</label>
          <select name="role" value={userForm.role} onChange={handleUserInput}>
            <option value="admin">Admin</option>
            <option value="hr">HR</option>
            <option value="mentor">Mentor</option>
            <option value="intern">Intern</option>
          </select>
        </div>
      </div>

      <button className="admin-main-btn" type="submit" disabled={loading}>
        {loading ? "Saving..." : "Add User"}
      </button>
    </form>
  );
}

function CreateDepartmentForm({
  departmentForm,
  handleDepartmentInput,
  createDepartment,
  loading,
}) {
  return (
    <form className="admin-old-card form-card" onSubmit={createDepartment}>
      <div className="admin-old-card-header">
        <div>
          <h2>Add Department</h2>
          <p>Create departments manually for onboarding and training.</p>
        </div>
      </div>

      <div className="admin-form-grid">
        <div className="admin-form-group">
          <label>Department Name *</label>
          <input
            type="text"
            name="name"
            value={departmentForm.name}
            onChange={handleDepartmentInput}
            placeholder="Example: IT"
          />
        </div>

        <div className="admin-form-group">
          <label>Department Code *</label>
          <input
            type="text"
            name="code"
            value={departmentForm.code}
            onChange={handleDepartmentInput}
            placeholder="Example: IT"
          />
        </div>
      </div>

      <button className="admin-main-btn" type="submit" disabled={loading}>
        {loading ? "Saving..." : "Add Department"}
      </button>
    </form>
  );
}

function UserTable({ users, updateUserRole, resetPassword, deleteUser }) {
  if (!users || users.length === 0) {
    return <div className="admin-empty">No users found.</div>;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-old-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Current Role</th>
            <th>Change Role</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <UserTableRow
              key={user.id}
              user={user}
              updateUserRole={updateUserRole}
              resetPassword={resetPassword}
              deleteUser={deleteUser}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserTableRow({ user, updateUserRole, resetPassword, deleteUser }) {
  const [selectedRole, setSelectedRole] = useState(user.role || "intern");

  return (
    <tr>
      <td>{user.full_name || user.fullName || "-"}</td>
      <td>{user.email || "-"}</td>
      <td>
        <span className="admin-role-pill">{user.role || "-"}</span>
      </td>
      <td>
        <select
          className="table-select"
          value={selectedRole}
          onChange={(event) => setSelectedRole(event.target.value)}
        >
          <option value="admin">Admin</option>
          <option value="hr">HR</option>
          <option value="mentor">Mentor</option>
          <option value="intern">Intern</option>
        </select>

        <button
          type="button"
          className="table-btn"
          onClick={() => updateUserRole(user.id, selectedRole)}
        >
          Update
        </button>
      </td>
      <td>{formatDate(user.created_at || user.createdAt)}</td>
      <td>
        <div className="table-actions">
          <button type="button" onClick={() => resetPassword(user.id)}>
            Reset
          </button>

          <button
            type="button"
            className="danger"
            onClick={() => deleteUser(user.id)}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

function AdminStat({ title, value }) {
  return (
    <div className="admin-old-stat">
      <p>{title}</p>
      <h2>{value}</h2>
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

export default AdminDashboard;