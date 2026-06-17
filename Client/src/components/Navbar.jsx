// Client/src/components/Navbar.jsx

import { Link, useLocation } from "react-router-dom";

function Navbar({ user, onLogout, logout }) {
  const location = useLocation();

  const activeUser = user || null;

  const getDashboardPath = () => {
    const role = String(activeUser?.role || "").toLowerCase();

    if (role === "admin") return "/admin-dashboard";
    if (role === "hr") return "/hr-dashboard";
    if (role === "mentor") return "/mentor-dashboard";
    if (role === "intern") return "/intern-dashboard";

    return "/login";
  };

  const getDashboardLabel = () => {
    const role = String(activeUser?.role || "").toLowerCase();

    if (role === "admin") return "Admin Dashboard";
    if (role === "hr") return "HR Dashboard";
    if (role === "mentor") return "Mentor Dashboard";
    if (role === "intern") return "Intern Dashboard";

    return "Dashboard";
  };

  const handleLogoutClick = () => {
    localStorage.removeItem("worksync_user");
    localStorage.removeItem("worksync_token");
    localStorage.removeItem("worksync_manual_logout");

    window.dispatchEvent(new Event("worksync-auth-cleared"));

    if (typeof onLogout === "function") {
      onLogout();
      return;
    }

    if (typeof logout === "function") {
      logout();
      return;
    }

    window.location.replace("/login");
  };

  const publicPages = [
    "/login",
    "/register",
    "/session-expired",
    "/unauthorized",
  ];

  const isPublicPage = publicPages.includes(location.pathname);

  return (
    <nav className="navbar">
      <Link to="/" className="brand-logo">
        <span className="brand-icon">WS</span>
        <span className="brand-name">
          Work<span>Sync</span>
        </span>
      </Link>

      <div className="nav-links">
        <Link to="/">Home</Link>

        {!activeUser && (
          <>
            <Link to="/login">Login</Link>
            {!isPublicPage && <Link to="/register">Register</Link>}
          </>
        )}

        {activeUser && !isPublicPage && (
          <>
            <Link to={getDashboardPath()}>{getDashboardLabel()}</Link>

            <button
              type="button"
              className="nav-logout-btn"
              onClick={handleLogoutClick}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;