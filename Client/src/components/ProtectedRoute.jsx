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
    return null;
  }
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
    return <Navigate to="/session-expired" replace />;
  }

  const userRole = String(activeUser.role || "").toLowerCase();

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

export default ProtectedRoute;