import { Link, useLocation, useNavigate } from "react-router-dom";
import OrgAdminSidebar from "./OrgAdminSidebar";
import "../styles/Sidebar.css";

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const adminData = localStorage.getItem("admin");
  let admin = null;
  if (adminData) {
    try {
      admin = JSON.parse(adminData);
    } catch (e) {
      admin = null;
    }
  }

  if (admin?.role === "org_admin") {
    return <OrgAdminSidebar />;
  }

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("admin");
    navigate("/admin/login");
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>SMS Tracker</h2>
        <div className="sidebar-role-badge">
          <span className="badge-domain">
            📍 {admin?.domain || "Domain Admin"}
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {/* Dashboard */}
        <Link
          to="/admin/dashboard"
          className={`sidebar-link ${
            location.pathname === "/admin/dashboard" ? "active" : ""
          }`}
        >
          📊 Dashboard
        </Link>

        {/* Attendance */}
        <Link
          to="/admin/attendance"
          className={`sidebar-link ${
            location.pathname === "/admin/attendance" ? "active" : ""
          }`}
        >
          📅 Attendance
        </Link>

        {/* Student Data */}
        <Link
          to="/admin/students"
          className={`sidebar-link ${
            location.pathname === "/admin/students" ? "active" : ""
          }`}
        >
          👥 Student Data
        </Link>

        {/* Everyday Tasks */}
        <Link
          to="/admin/tasks"
          className={`sidebar-link ${
            location.pathname === "/admin/tasks" ? "active" : ""
          }`}
        >
          📝 Everyday Tasks
        </Link>

        {/* News & Events */}
        <Link
          to="/admin/news-events"
          className={`sidebar-link ${
            location.pathname === "/admin/news-events" ? "active" : ""
          }`}
        >
          📢 News & Events
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="sidebar-link logout-btn"
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
          🚪 Logout ({admin?.name || admin?.username || "Domain Admin"})
        </button>
      </nav>
    </aside>
  );
}

export default Sidebar;