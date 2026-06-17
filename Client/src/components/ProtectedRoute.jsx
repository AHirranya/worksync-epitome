// Client/src/components/ProtectedRoute.jsx

import { Navigate } from "react-router-dom";
import LoadingState from "./LoadingState";
import ErrorState from "./ErrorState";

function ProtectedRoute({ user, loading, allowedRoles, children }) {
  if (loading) {
    return (
      <main className="dashboard-page">
        <section className="panel">
          <LoadingState
            title="Checking session"
            message="Please wait while we verify your login session."
          />
        </section>
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
        <section className="panel">
          <ErrorState
            title="Access Denied"
            message="You do not have permission to access this dashboard."
          />
        </section>
      </main>
    );
  }

  return children;
}

export default ProtectedRoute;