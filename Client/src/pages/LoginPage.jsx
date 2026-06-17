// Client/src/pages/LoginPage.jsx

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";

function LoginPage({ setUser }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    role: "",
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const togglePassword = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPassword((prev) => !prev);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    setMessage("");
    setMessageType("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", {
        role: formData.role,
        email: formData.email,
        password: formData.password,
      });

      const loggedUser = res.data.user;
      const token = res.data.token;

      localStorage.setItem("worksync_user", JSON.stringify(loggedUser));
      localStorage.setItem("worksync_token", token);

      if (setUser) {
        setUser(loggedUser);
      }

      setMessage("Login successful. Redirecting...");
      setMessageType("success");

      setTimeout(() => {
        if (loggedUser.role === "admin") {
          navigate("/admin-dashboard");
        } else if (["hr", "mentor"].includes(loggedUser.role)) {
          navigate("/hr-dashboard");
        } else if (loggedUser.role === "intern") {
          navigate("/intern-dashboard");
        } else {
          navigate("/");
        }
      }, 500);
    } catch (error) {
      setMessage(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Login failed. Please check your email, password, and role."
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>
        {`
          .auth-pro-page {
            min-height: calc(100vh - 90px);
            background:
              radial-gradient(circle at top left, rgba(255, 122, 0, 0.18), transparent 32%),
              radial-gradient(circle at bottom right, rgba(255, 122, 0, 0.08), transparent 30%),
              #050505;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 60px 6%;
          }

          .auth-pro-shell {
            width: 100%;
            max-width: 1120px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            background: rgba(12, 12, 12, 0.95);
            border: 1px solid rgba(255, 122, 0, 0.22);
            border-radius: 28px;
            overflow: hidden;
            box-shadow: 0 30px 90px rgba(0, 0, 0, 0.55);
          }

          .auth-pro-info {
            padding: 56px;
            background:
              linear-gradient(135deg, rgba(255, 122, 0, 0.18), rgba(0, 0, 0, 0.4)),
              #080808;
            border-right: 1px solid rgba(255, 122, 0, 0.16);
          }

          .auth-pro-badge {
            display: inline-flex;
            background: rgba(255, 122, 0, 0.14);
            color: #ff7a00;
            border: 1px solid rgba(255, 122, 0, 0.35);
            padding: 10px 16px;
            border-radius: 999px;
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin-bottom: 24px;
          }

          .auth-pro-info h1 {
            color: #ffffff;
            font-size: clamp(36px, 5vw, 58px);
            line-height: 1;
            margin-bottom: 18px;
            letter-spacing: -0.04em;
          }

          .auth-pro-info p {
            color: #c9c9c9;
            font-size: 17px;
            line-height: 1.7;
            max-width: 430px;
          }

          .auth-pro-points {
            display: grid;
            gap: 16px;
            margin-top: 34px;
          }

          .auth-pro-point {
            display: flex;
            align-items: center;
            gap: 14px;
            color: #eeeeee;
            font-weight: 800;
          }

          .auth-pro-point span {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background: #ff7a00;
            color: #000000;
            display: grid;
            place-items: center;
            font-weight: 1000;
          }

          .auth-pro-card {
            padding: 56px;
            background: #0b0b0b;
          }

          .auth-pro-card-header {
            margin-bottom: 30px;
          }

          .auth-pro-card-header p {
            color: #ff7a00;
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            margin-bottom: 10px;
          }

          .auth-pro-card-header h2 {
            color: #ffffff;
            font-size: 38px;
            margin-bottom: 8px;
            letter-spacing: -0.03em;
          }

          .auth-pro-card-header span {
            color: #a9a9a9;
            font-size: 15px;
          }

          .auth-pro-message {
            padding: 14px 16px;
            border-radius: 14px;
            margin-bottom: 20px;
            font-weight: 800;
            border: 1px solid rgba(34, 197, 94, 0.35);
            background: rgba(34, 197, 94, 0.1);
            color: #22c55e;
          }

          .auth-pro-message.error {
            border-color: rgba(255, 70, 70, 0.4);
            background: rgba(255, 70, 70, 0.1);
            color: #ff5c5c;
          }

          .auth-pro-form {
            display: grid;
            gap: 20px;
          }

          .auth-pro-form label {
            color: #ffffff;
            font-weight: 900;
            display: grid;
            gap: 10px;
          }

          .auth-pro-form input,
          .auth-pro-form select {
            width: 100%;
            height: 56px;
            background: #151515;
            color: #ffffff;
            border: 1px solid #2d2d2d;
            border-radius: 16px;
            padding: 0 18px;
            font-size: 16px;
            outline: none;
            transition: 0.2s ease;
          }

          .auth-pro-form input:focus,
          .auth-pro-form select:focus {
            border-color: #ff7a00;
            box-shadow: 0 0 0 4px rgba(255, 122, 0, 0.12);
          }

          .password-field {
            position: relative;
            width: 100%;
          }

          .password-field input {
            padding-right: 72px;
          }

          .password-toggle {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            width: 54px;
            height: 40px;
            border: none;
            border-radius: 12px;
            background: rgba(255, 122, 0, 0.16);
            color: #ff7a00;
            font-size: 13px;
            font-weight: 1000;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 5;
          }

          .password-toggle:hover {
            background: #ff7a00;
            color: #000000;
          }

          .auth-pro-submit {
            height: 58px;
            border: none;
            border-radius: 16px;
            background: #ff7a00;
            color: #000000;
            font-size: 17px;
            font-weight: 1000;
            cursor: pointer;
            transition: 0.2s ease;
            margin-top: 4px;
          }

          .auth-pro-switch {
            margin-top: 24px;
            color: #bdbdbd;
            text-align: center;
          }

          .auth-pro-switch a {
            color: #ff7a00;
            font-weight: 900;
            text-decoration: none;
          }

          @media (max-width: 900px) {
            .auth-pro-shell {
              grid-template-columns: 1fr;
            }

            .auth-pro-info {
              border-right: none;
              border-bottom: 1px solid rgba(255, 122, 0, 0.16);
              padding: 38px;
            }

            .auth-pro-card {
              padding: 38px;
            }
          }
        `}
      </style>

      <main className="auth-pro-page">
        <section className="auth-pro-shell">
          <div className="auth-pro-info">
            <div className="auth-pro-badge">WorkSync Portal</div>

            <h1>Welcome back.</h1>

            <p>
              Login with your correct role to access your assigned WorkSync
              dashboard.
            </p>

            <div className="auth-pro-points">
              <div className="auth-pro-point">
                <span>1</span>
                Admin manages platform users and settings
              </div>

              <div className="auth-pro-point">
                <span>2</span>
                HR manages onboarding and internships
              </div>

              <div className="auth-pro-point">
                <span>3</span>
                Interns track training and certificates
              </div>
            </div>
          </div>

          <div className="auth-pro-card">
            <div className="auth-pro-card-header">
              <p>Secure Login</p>
              <h2>Login</h2>
              <span>Enter your role and credentials to continue.</span>
            </div>

            {message && (
              <div
                className={`auth-pro-message ${
                  messageType === "error" ? "error" : ""
                }`}
              >
                {message}
              </div>
            )}

            <form className="auth-pro-form" onSubmit={handleLogin}>
              <label>
                Role
                <select
                  name="role"
                  value={formData.role}
                  onChange={updateField}
                  required
                >
                  <option value="">Select your role</option>
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
                  value={formData.email}
                  onChange={updateField}
                  placeholder="Enter your email"
                  required
                />
              </label>

              <label>
                Password
                <div className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={updateField}
                    placeholder="Enter your password"
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={togglePassword}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              <button className="auth-pro-submit" type="submit" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            <p className="auth-pro-switch">
              Do not have an account? <Link to="/register">Create account</Link>
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

export default LoginPage;