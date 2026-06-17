// Client/src/App.jsx

import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import api from "./api/api";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

import AdminDashboard from "./pages/AdminDashboard";
import HRDashboard from "./pages/HRDashboard";
import InternDashboard from "./pages/InternDashboard";
import MentorDashboard from "./pages/MentorDashboard";

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
    localStorage.removeItem("worksync_manual_logout");
    return null;
  }
}

function App() {
  const location = useLocation();

  const [user, setUser] = useState(() => safeParseUser());
  const [loading, setLoading] = useState(true);

  const getDashboardPath = (role) => {
    const cleanRole = String(role || "").toLowerCase();

    if (cleanRole === "admin") return "/admin-dashboard";
    if (cleanRole === "hr") return "/hr-dashboard";
    if (cleanRole === "mentor") return "/mentor-dashboard";
    if (cleanRole === "intern") return "/intern-dashboard";

    return "/";
  };

  const clearSession = () => {
    localStorage.removeItem("worksync_user");
    localStorage.removeItem("worksync_token");
    localStorage.removeItem("worksync_manual_logout");

    setUser(null);
    window.dispatchEvent(new Event("worksync-auth-cleared"));
  };

  const loadLoggedInUser = async () => {
    try {
      const token = localStorage.getItem("worksync_token");

      if (!token || token === "undefined" || token === "null") {
        clearSession();
        setLoading(false);
        return;
      }

      const res = await api.get("/auth/me");
      const loggedInUser = res.data.user;

      if (loggedInUser) {
        localStorage.setItem("worksync_user", JSON.stringify(loggedInUser));
        setUser(loggedInUser);

        const roleDashboard = getDashboardPath(loggedInUser.role);

        if (
          String(loggedInUser.role).toLowerCase() === "mentor" &&
          window.location.pathname === "/hr-dashboard"
        ) {
          window.location.replace("/mentor-dashboard");
        }

        if (
          String(loggedInUser.role).toLowerCase() === "hr" &&
          window.location.pathname === "/mentor-dashboard"
        ) {
          window.location.replace("/hr-dashboard");
        }

        if (
          String(loggedInUser.role).toLowerCase() === "intern" &&
          (window.location.pathname === "/hr-dashboard" ||
            window.location.pathname === "/mentor-dashboard" ||
            window.location.pathname === "/admin-dashboard")
        ) {
          window.location.replace(roleDashboard);
        }
      } else {
        clearSession();
      }
    } catch (error) {
      clearSession();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    window.location.replace("/login");
  };

  const handleLoginSuccess = (loggedInUser, token) => {
    localStorage.removeItem("worksync_manual_logout");

    if (token) {
      localStorage.setItem("worksync_token", token);
    }

    if (loggedInUser) {
      localStorage.setItem("worksync_user", JSON.stringify(loggedInUser));
      setUser(loggedInUser);

      const path = getDashboardPath(loggedInUser.role);
      window.location.replace(path);
    }
  };

  useEffect(() => {
    loadLoggedInUser();

    const handleAuthCleared = () => {
      setUser(null);
    };

    window.addEventListener("worksync-auth-cleared", handleAuthCleared);

    return () => {
      window.removeEventListener("worksync-auth-cleared", handleAuthCleared);
    };
  }, []);

  const publicPages = [
    "/login",
    "/register",
    "/session-expired",
    "/unauthorized",
  ];

  const navbarUser = publicPages.includes(location.pathname) ? null : user;

  return (
    <>
      <Navbar user={navbarUser} onLogout={handleLogout} logout={handleLogout} />

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
              allowedRoles={["hr"]}
            >
              <HRDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mentor-dashboard"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              allowedRoles={["mentor"]}
            >
              <MentorDashboard />
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