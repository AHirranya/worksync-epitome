// Client/src/pages/UnauthorizedPage.jsx

import { Link } from "react-router-dom";

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

function UnauthorizedPage() {
  const storedUser = safeParseUser();

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