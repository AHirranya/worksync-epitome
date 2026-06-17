// Client/src/components/ProtectedRoute.jsx

import { Navigate } from "react-router-dom";

function ProtectedRoute({ user, loading, allowedRoles, children }) {
  const storedUser = JSON.parse(localStorage.getItem("worksync_user") || "null");
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

  if (!token || !activeUser) {
    return <Navigate to="/session-expired" replace />;
  }

  const userRole = String(activeUser.role || "").toLowerCase();

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

export default ProtectedRoute;