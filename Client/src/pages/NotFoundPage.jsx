// Client/src/pages/NotFoundPage.jsx

import { Link } from "react-router-dom";

function NotFoundPage() {
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
        <div className="error-code">404</div>

        <h1>Page Not Found</h1>

        <p>
          The page you are looking for does not exist or may have been moved.
        </p>

        <div className="error-page-actions">
          <Link to="/" className="small-btn">
            Go Home
          </Link>

          <Link to={getDashboardPath()} className="outline-small-btn">
            Go to Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}

export default NotFoundPage;    