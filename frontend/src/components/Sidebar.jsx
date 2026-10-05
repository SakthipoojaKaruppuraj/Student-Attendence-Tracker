import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles/Sidebar.css";

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("admin");
    navigate("/admin/login");
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>SMS Tracker</h2>
        <p>Admin Portal</p>
      </div>

      <nav className="sidebar-nav">

        {/* Dashboard */}
        <Link
          to="/admin/dashboard"
          className={`sidebar-link ${
            location.pathname === "/admin/dashboard"
              ? "active"
              : ""
          }`}
        >
          📊 Dashboard
        </Link>

        {/* Attendance */}
        <Link
          to="/admin/attendance"
          className={`sidebar-link ${
            location.pathname === "/admin/attendance"
              ? "active"
              : ""
          }`}
        >
          📅 Attendance
        </Link>

        <Link
          to="/admin/students"
          className={`sidebar-link ${
            location.pathname === "/admin/students"
              ? "active"
              : ""
          }`}
>
  👥 Student Data
</Link>

        {/* Everyday Tasks */}
        <Link
          to="/admin/tasks"
          className={`sidebar-link ${
            location.pathname === "/admin/tasks"
              ? "active"
              : ""
          }`}
        >
          📝 Everyday Tasks
        </Link>

        {/* Projects - Coming Later */}
        <Link
          to="/admin/projects"
          className={`sidebar-link ${
            location.pathname === "/admin/projects"
              ? "active"
              : ""
          }`}
        >
          📋 Projects
        </Link>

        {/* Reports - Coming Later */}
        <Link
          to="/admin/reports"
          className={`sidebar-link ${
            location.pathname === "/admin/reports"
              ? "active"
              : ""
          }`}
        >
          📈 Reports
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="sidebar-link"
          style={{
            background: "none",
            border: "none",
            width: "100%",
            textAlign: "left",
            cursor: "pointer",
            marginTop: "20px",
            color: "#f87171",
          }}
        >
          🚪 Logout
        </button>

      </nav>
    </aside>
  );
}

export default Sidebar;