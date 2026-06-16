// Client/src/components/ProtectedRoute.jsx

import { Navigate } from "react-router-dom";

function ProtectedRoute({ user, loading, allowedRoles, children }) {
  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-header">
          <h1>Checking Access</h1>
          <p>Please wait while we verify your account...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;