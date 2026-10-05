import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "../styles/AdminDashboard.css";

function AdminDashboard() {
  const [admin, setAdmin] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const adminData = localStorage.getItem("admin");

    if (!token || !adminData) {
      navigate("/admin/login");
      return;
    }

    try {
      setAdmin(JSON.parse(adminData));
    } catch {
      localStorage.clear();
      navigate("/admin/login");
    }
  }, [navigate]);

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-content-page">
        <header className="dashboard-header-simple">
          <div className="header-brand">
            <h1>Dashboard Overview</h1>
            <span className="badge">Admin Portal</span>
          </div>
          <div className="user-profile">
            <span>
              Welcome, <strong>{admin?.username || "Admin"}</strong> ({admin?.role || "admin"})
            </span>
          </div>
        </header>

        <div className="welcome-banner">
          <p>Logged in successfully as Administrator.</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <h3>System Status</h3>
            <p className="status-online">Online & Active</p>
          </div>
          <div className="stat-card">
            <h3>Admin User</h3>
            <p>{admin?.username || "admin"}</p>
          </div>
          <div className="stat-card">
            <h3>Role</h3>
            <p>{admin?.role || "admin"}</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
