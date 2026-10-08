import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import OrgAdminSidebar from "../components/OrgAdminSidebar";
import "../styles/AdminManagement.css";

function OrgAdminDashboard() {
  const [stats, setStats] = useState({
    totalAdmins: 0,
    domainAdmins: 0,
    totalStudents: 0,
  });
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => {
    const token =
      localStorage.getItem("orgAdminToken") ||
      localStorage.getItem("adminToken");
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const getApiUrl = (endpoint) => {
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
    return `${baseUrl}/api${endpoint}`;
  };

  useEffect(() => {
    const loadOverviewData = async () => {
      try {
        setLoading(true);
        const [adminsRes, studentsRes] = await Promise.all([
          axios.get(getApiUrl("/org-admin/admins"), getAuthHeaders()).catch(() => null),
          axios.get(getApiUrl("/students/all")).catch(() => null),
        ]);

        let adminCount = 0;
        let domainCount = 0;
        if (adminsRes?.data?.success) {
          adminCount = adminsRes.data.admins.length;
          domainCount = adminsRes.data.admins.filter(
            (a) => a.role === "domain_admin"
          ).length;
        }

        let studentCount = 0;
        if (studentsRes?.data?.students) {
          studentCount = studentsRes.data.students.length;
        } else if (studentsRes?.data?.length) {
          studentCount = studentsRes.data.length;
        }

        setStats({
          totalAdmins: adminCount,
          domainAdmins: domainCount,
          totalStudents: studentCount,
        });
      } catch (err) {
        console.error("Error loading management overview:", err);
      } finally {
        setLoading(false);
      }
    };

    loadOverviewData();
  }, []);

  return (
    <div className="dashboard-layout">
      <OrgAdminSidebar />

      <main className="admin-mgmt-page">
        {/* HEADER */}
        <div className="admin-mgmt-header">
          <div>
            <h1>👑 Management Portal</h1>
            <p>Central System Control & Organisation Administration</p>
          </div>
        </div>

        {/* METRICS */}
        <div className="admin-mgmt-stats">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div>
              <span>Total System Admins</span>
              <strong>{loading ? "..." : stats.totalAdmins}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🛡️</div>
            <div>
              <span>Domain Sub-Admins</span>
              <strong>{loading ? "..." : stats.domainAdmins}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🎓</div>
            <div>
              <span>Master Students</span>
              <strong>{loading ? "..." : stats.totalStudents}</strong>
            </div>
          </div>
        </div>

        {/* QUICK MANAGEMENT MODULES */}
        <div className="table-container" style={{ padding: "28px" }}>
          <h2>⚡ System Control Modules</h2>
          <p style={{ color: "#64748b", marginBottom: "20px", fontSize: "14px" }}>
            Select a management workspace to execute administrative actions:
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            <div
              style={{
                background: "#f8fafc",
                padding: "24px",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
              }}
            >
              <h3 style={{ fontSize: "18px", color: "#0f172a", marginBottom: "8px" }}>
                🛡️ Admin Accounts
              </h3>
              <p style={{ color: "#64748b", fontSize: "13.5px", marginBottom: "16px" }}>
                Create, inspect, and remove domain sub-admin accounts and manage vertical lab permissions.
              </p>
              <Link
                to="/org-admin/manage-admins"
                style={{
                  display: "inline-block",
                  background: "#7c3aed",
                  color: "#fff",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                Open Admin Management →
              </Link>
            </div>

            <div
              style={{
                background: "#f8fafc",
                padding: "24px",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
              }}
            >
              <h3 style={{ fontSize: "18px", color: "#0f172a", marginBottom: "8px" }}>
                📂 Master Student Data
              </h3>
              <p style={{ color: "#64748b", fontSize: "13.5px", marginBottom: "16px" }}>
                Upload Excel/CSV sheets to append or replace student master records across all departments.
              </p>
              <Link
                to="/org-admin/students"
                style={{
                  display: "inline-block",
                  background: "#4f46e5",
                  color: "#fff",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                Upload Master Sheets →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default OrgAdminDashboard;
