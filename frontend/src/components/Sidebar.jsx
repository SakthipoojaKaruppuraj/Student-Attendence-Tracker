import { Link, useLocation, useNavigate } from "react-router-dom";
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

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("admin");
    navigate("/admin/login");
  };

  const isOrgAdmin = admin?.role === "org_admin";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>SMS Tracker</h2>
        <div className="sidebar-role-badge">
          {isOrgAdmin ? (
            <span className="badge-org">👑 Organisation Admin</span>
          ) : (
            <span className="badge-domain">
              📍 {admin?.domain || "Domain Admin"}
            </span>
          )}
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

        {/* Organisation Admin Exclusive: Manage Admins */}
        {isOrgAdmin && (
          <Link
            to="/admin/manage-admins"
            className={`sidebar-link ${
              location.pathname === "/admin/manage-admins" ? "active" : ""
            }`}
          >
            🛡️ Manage Admins
          </Link>
        )}

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
          🚪 Logout ({admin?.name || admin?.username || "Admin"})
        </button>
      </nav>
    </aside>
  );
}

export default Sidebar;