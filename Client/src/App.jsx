// Client/src/App.jsx

import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import api from "./api/api";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

import AdminDashboard from "./pages/AdminDashboard";
import HRDashboard from "./pages/HRDashboard";
import InternDashboard from "./pages/InternDashboard";

import NotFoundPage from "./pages/NotFoundPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import SessionExpiredPage from "./pages/SessionExpiredPage";

function safeParseUser() {
  try {
    const storedValue = localStorage.getItem("worksync_user");

    if (!storedValue || storedValue === "undefined" || storedValue === "null") {
      return null;
    }

    return JSON.parse(storedValue);
  } catch (error) {
    localStorage.removeItem("worksync_user");
    localStorage.removeItem("worksync_token");
    return null;
  }
}

function App() {
  const [user, setUser] = useState(() => safeParseUser());
  const [loading, setLoading] = useState(true);

  const getDashboardPath = (role) => {
    const cleanRole = String(role || "").toLowerCase();

    if (cleanRole === "admin") return "/admin-dashboard";
    if (cleanRole === "hr" || cleanRole === "mentor") return "/hr-dashboard";
    if (cleanRole === "intern") return "/intern-dashboard";

    return "/";
  };

  const loadLoggedInUser = async () => {
    try {
      const token = localStorage.getItem("worksync_token");

      if (!token || token === "undefined" || token === "null") {
        localStorage.removeItem("worksync_user");
        localStorage.removeItem("worksync_token");
        setUser(null);
        setLoading(false);
        return;
      }

      const res = await api.get("/auth/me");

      const loggedInUser = res.data.user;

      if (loggedInUser) {
        localStorage.setItem("worksync_user", JSON.stringify(loggedInUser));
        setUser(loggedInUser);
      } else {
        localStorage.removeItem("worksync_user");
        localStorage.removeItem("worksync_token");
        setUser(null);
      }
    } catch (error) {
      localStorage.removeItem("worksync_user");
      localStorage.removeItem("worksync_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      // continue logout even if backend logout fails
    }

    localStorage.removeItem("worksync_user");
    localStorage.removeItem("worksync_token");

    setUser(null);
    window.location.href = "/login";
  };

  const handleLoginSuccess = (loggedInUser, token) => {
    if (token) {
      localStorage.setItem("worksync_token", token);
    }

    if (loggedInUser) {
      localStorage.setItem("worksync_user", JSON.stringify(loggedInUser));
      setUser(loggedInUser);
    }
  };

  useEffect(() => {
    loadLoggedInUser();
  }, []);

  return (
    <>
      <Navbar user={user} onLogout={handleLogout} logout={handleLogout} />

      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={getDashboardPath(user.role)} replace />
            ) : (
              <LoginPage setUser={setUser} onLoginSuccess={handleLoginSuccess} />
            )
          }
        />

        <Route
          path="/register"
          element={
            user ? (
              <Navigate to={getDashboardPath(user.role)} replace />
            ) : (
              <RegisterPage />
            )
          }
        />

        <Route path="/apply" element={<Navigate to="/register" replace />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <Navigate to={getDashboardPath(user?.role)} replace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              allowedRoles={["admin"]}
            >
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hr-dashboard"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              allowedRoles={["hr", "mentor", "admin"]}
            >
              <HRDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/intern-dashboard"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              allowedRoles={["intern"]}
            >
              <InternDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/session-expired" element={<SessionExpiredPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default App;