// Client/src/App.jsx

import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import api from "./api/api";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import HomePage from "./pages/HomePage";
import ApplyPage from "./pages/ApplyPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminDashboard from "./pages/AdminDashboard";
import HRDashboard from "./pages/HRDashboard";
import InternDashboard from "./pages/InternDashboard";

function DashboardRedirect({ user, loading }) {
  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-header">
          <h1>Loading Dashboard</h1>
          <p>Please wait...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "admin") {
    return <Navigate to="/admin-dashboard" replace />;
  }

  if (["hr", "mentor"].includes(user.role)) {
    return <Navigate to="/hr-dashboard" replace />;
  }

  if (user.role === "intern") {
    return <Navigate to="/intern-dashboard" replace />;
  }

  return <Navigate to="/" replace />;
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const loadLoggedUser = async () => {
    setAuthLoading(true);

    try {
      const res = await api.get("/auth/me");

      setUser(res.data.user);
      localStorage.setItem("worksync_user", JSON.stringify(res.data.user));
    } catch (error) {
      setUser(null);
      localStorage.removeItem("worksync_user");
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    loadLoggedUser();
  }, []);

  return (
    <>
      <Navbar user={user} setUser={setUser} />

      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route path="/apply" element={<ApplyPage />} />

        <Route path="/login" element={<LoginPage setUser={setUser} />} />

        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/dashboard"
          element={<DashboardRedirect user={user} loading={authLoading} />}
        />

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute
              user={user}
              loading={authLoading}
              allowedRoles={["admin"]}
            >
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute
              user={user}
              loading={authLoading}
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
              loading={authLoading}
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
              loading={authLoading}
              allowedRoles={["intern"]}
            >
              <InternDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;