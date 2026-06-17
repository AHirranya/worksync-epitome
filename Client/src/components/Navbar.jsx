// Client/src/components/Navbar.jsx

import { Link, NavLink, useNavigate } from "react-router-dom";
import api from "../api/api";

function Navbar({ user, setUser }) {
  const navigate = useNavigate();

  const role = String(user?.role || "").toLowerCase();

  const isAdmin = role === "admin";
  const isHR = role === "hr" || role === "mentor";
  const isIntern = role === "intern";

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.log("Logout API failed:", error.response?.data || error.message);
    }

    localStorage.removeItem("worksync_user");
    localStorage.removeItem("worksync_token");

    if (setUser) {
      setUser(null);
    }

    navigate("/login");
  };

  return (
    <header className="navbar">
      <Link to="/" className="brand-logo">
        <span className="brand-icon">WS</span>
        <span className="brand-name">
          Work<span>Sync</span>
        </span>
      </Link>

      <nav className="nav-links">
        <NavLink to="/">Home</NavLink>

        {!user && <NavLink to="/apply">Apply</NavLink>}

        {isAdmin && <NavLink to="/admin-dashboard">Admin Dashboard</NavLink>}

        {isHR && <NavLink to="/hr-dashboard">HR Dashboard</NavLink>}

        {isIntern && <NavLink to="/intern-dashboard">Intern Dashboard</NavLink>}

        {!user && <NavLink to="/login">Login</NavLink>}

        {!user && <NavLink to="/register">Register</NavLink>}

        {user && (
          <button type="button" className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        )}
      </nav>
    </header>
  );
}

export default Navbar;