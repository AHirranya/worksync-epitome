// Client/src/pages/UnauthorizedPage.jsx

import { Link } from "react-router-dom";

function UnauthorizedPage() {
  const storedUser = JSON.parse(localStorage.getItem("worksync_user") || "null");

  const getDashboardPath = () => {
    const role = String(storedUser?.role || "").toLowerCase();

    if (role === "admin") return "/admin-dashboard";
    if (role === "hr" || role === "mentor") return "/hr-dashboard";
    if (role === "intern") return "/intern-dashboard";

    return "/login";
  };

  return (
    <main className="error-page-wrapper">
      <section className="error-page-card">
        <div className="error-code warning">403</div>

        <h1>Access Denied</h1>

        <p>
          You do not have permission to access this page. Please use the
          dashboard assigned to your role.
        </p>

        <div className="error-page-actions">
          <Link to={getDashboardPath()} className="small-btn">
            Go to My Dashboard
          </Link>

          <Link to="/" className="outline-small-btn">
            Go Home
          </Link>
        </div>
      </section>
    </main>
  );
}

export default UnauthorizedPage;