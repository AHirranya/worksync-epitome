// Client/src/pages/NotFoundPage.jsx

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

function NotFoundPage() {
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