import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles/OrgAdminSidebar.css";

function OrgAdminSidebar() {
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
    localStorage.removeItem("orgAdminToken");
    localStorage.removeItem("admin");
    navigate("/org-admin/login");
  };

  return (
    <aside className="org-sidebar">
      <div className="org-sidebar-logo">
        <h2>SMS Management</h2>
        <div className="org-sidebar-role-badge">
          <span className="badge-org">👑 Organisation Admin</span>
        </div>
      </div>

      <nav className="org-sidebar-nav">
        {/* Management Dashboard */}
        <Link
          to="/org-admin/dashboard"
          className={`org-sidebar-link ${
            location.pathname === "/org-admin/dashboard" ? "active" : ""
          }`}
        >
          📊 Overview
        </Link>

        {/* Manage Admins */}
        <Link
          to="/org-admin/manage-admins"
          className={`org-sidebar-link ${
            location.pathname === "/org-admin/manage-admins" ? "active" : ""
          }`}
        >
          🛡️ Manage Admins
        </Link>

        {/* Master Student Data */}
        <Link
          to="/org-admin/students"
          className={`org-sidebar-link ${
            location.pathname === "/org-admin/students" || location.pathname === "/org-admin/master-data" ? "active" : ""
          }`}
        >
          👥 Master Student Data
        </Link>

        {/* Everyday Tasks */}
        <Link
          to="/org-admin/tasks"
          className={`org-sidebar-link ${
            location.pathname === "/org-admin/tasks" ? "active" : ""
          }`}
        >
          📝 Everyday Tasks
        </Link>

        {/* News & Events */}
        <Link
          to="/org-admin/news-events"
          className={`org-sidebar-link ${
            location.pathname === "/org-admin/news-events" ? "active" : ""
          }`}
        >
          📢 News & Events
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="org-sidebar-link logout-btn"
          style={{
            background: "none",
            border: "none",
            width: "100%",
            textAlign: "left",
            cursor: "pointer",
            marginTop: "24px",
          }}
        >
          🚪 Logout ({admin?.name || admin?.username || "Org Admin"})
        </button>
      </nav>
    </aside>
  );
}

export default OrgAdminSidebar;
