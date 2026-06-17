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
    if (cleanRole === "hr") return "/hr-dashboard";
    if (cleanRole === "mentor") return "/mentor-dashboard";
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

      navigate(getDashboardPath(loggedInUser.role), { replace: true });
    } catch (error) {
      localStorage.removeItem("worksync_user");
      localStorage.removeItem("worksync_token");

      showMessage(
        error.response?.data?.message ||
          "Login failed. Please check your email, password, and role.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="ws-login-page">
      <section className="ws-login-shell">
        <div className="ws-login-showcase">
          <div className="ws-login-mini-logo">WS</div>

          <span className="ws-login-eyebrow">Internship Lifecycle Platform</span>

          <h1>Manage internships with one clean WorkSync workspace.</h1>

          <p>
            Login as Admin, HR, Mentor, or Intern to manage onboarding,
            training, attendance, work logs, certificates, and reports.
          </p>

          <div className="ws-login-feature-grid">
            <div>
              <strong>Training</strong>
              <span>Theory, video, and test modules</span>
            </div>

            <div>
              <strong>Attendance</strong>
              <span>Breaks and net working hours</span>
            </div>

            <div>
              <strong>Mentor Review</strong>
              <span>Work log review and feedback</span>
            </div>

            <div>
              <strong>Reports</strong>
              <span>HR and admin analytics</span>
            </div>
          </div>
        </div>

        <section className="ws-login-card">
          <div className="ws-login-card-header">
            <span>Secure Login</span>
            <h2>Welcome Back</h2>
            <p>Choose your role and continue to your dashboard.</p>
          </div>

          {message && (
            <div
              className={`message-box ${
                messageType === "error" ? "error" : ""
              }`}
            >
              {message}
            </div>
          )}

          <form className="ws-login-form" onSubmit={loginUser}>
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
              Email Address
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
              <div className="ws-password-wrap">
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
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <button type="submit" className="ws-login-submit" disabled={loading}>
              {loading ? "Logging in..." : "Login to Dashboard"}
            </button>
          </form>

          <div className="ws-login-footer">
            <p>
              New applicant? <Link to="/register">Register here</Link>
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}

export default LoginPage;