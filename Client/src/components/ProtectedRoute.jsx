// Client/src/components/ProtectedRoute.jsx

import { Navigate } from "react-router-dom";

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

function getDashboardPath(role) {
  const cleanRole = String(role || "").toLowerCase();

  if (cleanRole === "admin") return "/admin-dashboard";
  if (cleanRole === "hr") return "/hr-dashboard";
  if (cleanRole === "mentor") return "/mentor-dashboard";
  if (cleanRole === "intern") return "/intern-dashboard";

  return "/login";
}

function ProtectedRoute({ user, loading, allowedRoles, children }) {
  const storedUser = safeParseUser();
  const token = localStorage.getItem("worksync_token");

  const activeUser = user || storedUser;

  if (loading) {
    return (
      <main className="dashboard-page">
        <section className="panel">
          <div className="route-loading-box">
            <div className="route-loader"></div>
            <h3>Checking session</h3>
            <p>Please wait while we verify your login session.</p>
          </div>
        </section>
      </main>
    );
  }

  if (!token || token === "undefined" || token === "null" || !activeUser) {
    localStorage.removeItem("worksync_user");
    localStorage.removeItem("worksync_token");
    localStorage.removeItem("worksync_manual_logout");

    return <Navigate to="/login" replace />;
  }

  const userRole = String(activeUser.role || "").toLowerCase();

  const cleanAllowedRoles = Array.isArray(allowedRoles)
    ? allowedRoles.map((role) => String(role).toLowerCase())
    : [];

  if (cleanAllowedRoles.length > 0 && !cleanAllowedRoles.includes(userRole)) {
    return <Navigate to={getDashboardPath(userRole)} replace />;
  }

  return children;
}

export default ProtectedRoute;