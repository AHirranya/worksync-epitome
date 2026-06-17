// Client/src/components/ProtectedRoute.jsx

import { Navigate } from "react-router-dom";

function ProtectedRoute({ user, loading, allowedRoles, children }) {
  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-header">
          <h1>Loading</h1>
          <p>Checking your login session...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = String(user.role || "").toLowerCase();

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-header">
          <h1>Access Denied</h1>
          <p>You do not have permission to access this dashboard.</p>
        </div>
      </main>
    );
  }

  return children;
}

export default ProtectedRoute;