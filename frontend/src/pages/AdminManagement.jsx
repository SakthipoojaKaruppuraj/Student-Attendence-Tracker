import { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "../styles/AdminManagement.css";

const API_BASE = "http://localhost:5001/api";

const DOMAIN_OPTIONS = [
  "BW - Blockchain and Web3.0 Lab",
  "Cyber Security",
  "Cloud",
  "Full Stack",
  "Generative AI",
  "Mobile App Development",
  "DevOps & Systems",
  "General",
];

function AdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    domain: DOMAIN_OPTIONS[0],
    customDomain: "",
  });

  const fetchAdmins = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admins`);
      if (response.data.success) {
        setAdmins(response.data.admins);
      }
    } catch (err) {
      console.error("Error fetching admins:", err);
      setError("Unable to load admin accounts.");
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const targetDomain =
      formData.domain === "Other"
        ? formData.customDomain.trim()
        : formData.domain;

    if (!targetDomain) {
      setError("Please specify a domain.");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/admins`, {
        name: formData.name,
        username: formData.username,
        password: formData.password,
        domain: targetDomain,
        role: "domain_admin",
      });

      if (response.data.success) {
        setMessage(`Admin account for "${formData.name}" created successfully.`);
        setFormData({
          name: "",
          username: "",
          password: "",
          domain: DOMAIN_OPTIONS[0],
          customDomain: "",
        });
        setShowModal(false);
        fetchAdmins();
      }
    } catch (err) {
      console.error("Create admin error:", err);
      setError(
        err.response?.data?.message || "Failed to create admin account."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = async (adminId, adminName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete admin account "${adminName}"?`
      )
    ) {
      return;
    }

    try {
      const response = await axios.delete(`${API_BASE}/admins/${adminId}`);
      if (response.data.success) {
        setMessage(`Admin account "${adminName}" deleted successfully.`);
        fetchAdmins();
      }
    } catch (err) {
      console.error("Delete admin error:", err);
      setError(err.response?.data?.message || "Failed to delete admin.");
    }
  };

  const domainAdminsCount = admins.filter(
    (a) => a.role === "domain_admin"
  ).length;

  const uniqueDomainsCount = new Set(
    admins.map((a) => a.domain).filter((d) => d && d !== "All")
  ).size;

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="admin-mgmt-page">
        {/* HEADER */}
        <div className="admin-mgmt-header">
          <div>
            <h1>🛡️ Admin Management</h1>
            <p>
              Manage domain sub-admins and assign lab domain permissions.
            </p>
          </div>

          <button
            className="create-admin-btn"
            onClick={() => {
              setShowModal(true);
              setMessage("");
              setError("");
            }}
          >
            + Add Domain Admin
          </button>
        </div>

        {/* NOTIFICATIONS */}
        {message && <div className="success-message">✓ {message}</div>}
        {error && <div className="error-message">⚠ {error}</div>}

        {/* METRICS */}
        <div className="admin-mgmt-stats">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div>
              <span>Total Admins</span>
              <strong>{admins.length}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🛡️</div>
            <div>
              <span>Domain Admins</span>
              <strong>{domainAdminsCount}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🏢</div>
            <div>
              <span>Managed Domains</span>
              <strong>{uniqueDomainsCount}</strong>
            </div>
          </div>
        </div>

        {/* ADMINS TABLE */}
        <div className="table-container">
          <h2>Domain Admin Accounts</h2>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Admin ID</th>
                <th>Name</th>
                <th>Username</th>
                <th>Assigned Domain</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.admin_id || admin.username}>
                  <td>
                    <code>{admin.admin_id || "ADM"}</code>
                  </td>
                  <td>
                    <strong>{admin.name || admin.username}</strong>
                  </td>
                  <td>{admin.username}</td>
                  <td>
                    <span
                      className={`domain-tag ${
                        admin.domain === "All" ? "tag-all" : "tag-domain"
                      }`}
                    >
                      {admin.domain === "All"
                        ? "👑 All Domains (Master)"
                        : `📍 ${admin.domain}`}
                    </span>
                  </td>
                  <td>
                    <span className="role-tag">{admin.role}</span>
                  </td>
                  <td>
                    {admin.role !== "org_admin" ? (
                      <button
                        className="delete-admin-btn"
                        onClick={() =>
                          handleDeleteAdmin(
                            admin.admin_id,
                            admin.name || admin.username
                          )
                        }
                      >
                        Delete
                      </button>
                    ) : (
                      <span className="protected-text">Primary Master</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CREATE ADMIN MODAL */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-header">
                <h2>➕ Create Domain Admin</h2>
                <button
                  className="close-modal-btn"
                  onClick={() => setShowModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateAdmin}>
                {error && <div className="error-message" style={{ marginBottom: "15px" }}>⚠ {error}</div>}
                {message && <div className="success-message" style={{ marginBottom: "15px" }}>✓ {message}</div>}

                <div className="form-group">
                  <label>Admin Name *</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g. Blockchain Admin"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    name="username"
                    placeholder="e.g. bw_admin"
                    value={formData.username}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    name="password"
                    placeholder="Set admin password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Assigned Domain / Vertical *</label>
                  <select
                    name="domain"
                    value={formData.domain}
                    onChange={handleChange}
                    required
                  >
                    {DOMAIN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                    <option value="Other">Other (Custom Domain)...</option>
                  </select>
                </div>

                {formData.domain === "Other" && (
                  <div className="form-group">
                    <label>Custom Domain Name *</label>
                    <input
                      type="text"
                      name="customDomain"
                      placeholder="Enter custom lab or domain name"
                      value={formData.customDomain}
                      onChange={handleChange}
                      required
                    />
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={loading}
                  >
                    {loading ? "Creating..." : "Create Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminManagement;
