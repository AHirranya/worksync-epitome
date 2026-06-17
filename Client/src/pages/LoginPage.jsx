// Client/src/pages/LoginPage.jsx

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";

function LoginPage({ setUser, onLoginSuccess }) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "intern",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const getDashboardPath = (role) => {
    const cleanRole = String(role || "").toLowerCase();

    if (cleanRole === "admin") return "/admin-dashboard";
    if (cleanRole === "hr" || cleanRole === "mentor") return "/hr-dashboard";
    if (cleanRole === "intern") return "/intern-dashboard";

    return "/";
  };

  const updateForm = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const loginUser = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      localStorage.removeItem("worksync_manual_logout");

      const res = await api.post("/auth/login", {
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });

      const loggedInUser = res.data.user;
      const token = res.data.token;

      if (!loggedInUser || !token) {
        showMessage("Login response is missing user or token.", "error");
        return;
      }

      localStorage.removeItem("worksync_manual_logout");
      localStorage.setItem("worksync_user", JSON.stringify(loggedInUser));
      localStorage.setItem("worksync_token", token);

      if (typeof setUser === "function") {
        setUser(loggedInUser);
      }

      if (typeof onLoginSuccess === "function") {
        onLoginSuccess(loggedInUser, token);
      }

      showMessage("Login successful.");

      navigate(getDashboardPath(loggedInUser.role), { replace: true });
    } catch (error) {
      localStorage.removeItem("worksync_user");
      localStorage.removeItem("worksync_token");

      showMessage(
        error.response?.data?.message || "Login failed. Please check your details.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-header">
          <span className="auth-badge">WorkSync Login</span>
          <h1>Welcome Back</h1>
          <p>
            Login to continue to your role-based WorkSync dashboard.
          </p>
        </div>

        {message && (
          <div className={`message-box ${messageType === "error" ? "error" : ""}`}>
            {message}
          </div>
        )}

        <form className="auth-form" onSubmit={loginUser}>
          <label>
            Role
            <select
              name="role"
              value={form.role}
              onChange={updateForm}
              required
            >
              <option value="admin">Admin</option>
              <option value="hr">HR</option>
              <option value="mentor">Mentor</option>
              <option value="intern">Intern</option>
              <option value="user">Applicant / User</option>
            </select>
          </label>

          <label>
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={updateForm}
              placeholder="Enter your email"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <div className="password-input-wrap">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={updateForm}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            New applicant? <Link to="/register">Register here</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;