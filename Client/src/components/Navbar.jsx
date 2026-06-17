// Client/src/components/Navbar.jsx

import { Link, useLocation, useNavigate } from "react-router-dom";

function Navbar({ user, onLogout, logout }) {
  const location = useLocation();
  const navigate = useNavigate();

  const activeUser = user || null;

  const getDashboardPath = () => {
    const role = String(activeUser?.role || "").toLowerCase();

    if (role === "admin") return "/admin-dashboard";
    if (role === "hr" || role === "mentor") return "/hr-dashboard";
    if (role === "intern") return "/intern-dashboard";

    return "/login";
  };

  const getDashboardLabel = () => {
    const role = String(activeUser?.role || "").toLowerCase();

    if (role === "admin") return "Admin Dashboard";
    if (role === "hr" || role === "mentor") return "HR Dashboard";
    if (role === "intern") return "Intern Dashboard";

    return "Dashboard";
  };

  const handleLogoutClick = () => {
    localStorage.setItem("worksync_manual_logout", "true");
    localStorage.removeItem("worksync_user");
    localStorage.removeItem("worksync_token");

    if (typeof onLogout === "function") {
      onLogout();
      return;
    }

    if (typeof logout === "function") {
      logout();
      return;
    }

    navigate("/login", { replace: true });
  };

  const hideUserLinks =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/session-expired" ||
    location.pathname === "/unauthorized";

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

        {!activeUser && !hideUserLinks && (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}

        {activeUser && !hideUserLinks && (
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

        {hideUserLinks && (
          <>
            <Link to="/login">Login</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;