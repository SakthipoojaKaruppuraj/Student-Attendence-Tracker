import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "../styles/OrgAdminLogin.css";

function OrgAdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please enter management username and password");
      return;
    }

    try {
      setLoading(true);

      const apiUrl = import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/api/org-admin/login`
        : "/api/org-admin/login";

      let response;
      try {
        response = await axios.post(apiUrl, { username, password });
      } catch (err) {
        if (!import.meta.env.VITE_API_URL && err.code === "ERR_NETWORK") {
          response = await axios.post("http://localhost:5001/api/org-admin/login", {
            username,
            password,
          });
        } else {
          throw err;
        }
      }

      // Store JWT token and admin info specifically for org admin
      localStorage.setItem("adminToken", response.data.token);
      localStorage.setItem("orgAdminToken", response.data.token);
      localStorage.setItem("admin", JSON.stringify(response.data.admin));

      // Navigate to Management Dashboard
      navigate("/org-admin/dashboard");
    } catch (error) {
      if (error.code === "ERR_NETWORK" || !error.response) {
        setError(
          "Cannot connect to server. Please make sure the backend server is running on http://localhost:5001"
        );
      } else {
        setError(
          error.response?.data?.message || "Management authentication failed."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="org-login-container">
      <div className="org-login-card">
        <div className="org-login-header">
          <div className="org-badge">
            👑 Restrict Access Area
          </div>
          <h1>Management Portal</h1>
          <p>Organisation Admin Authentication</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="org-form-group">
            <label>Management Username</label>
            <input
              type="text"
              placeholder="Enter org admin username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="org-form-group">
            <label>Management Password</label>
            <input
              type="password"
              placeholder="Enter org admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && <div className="org-error-message">{error}</div>}

          <button
            type="submit"
            className="org-login-button"
            disabled={loading}
          >
            {loading ? "Authenticating..." : "Authorize Management Access"}
          </button>

          <div className="org-security-notice">
            🔒 <strong>Strict Control Notice:</strong> This portal is exclusively for System Administrators and Management. Unauthorized access attempts are monitored and recorded.
          </div>
        </form>
      </div>
    </div>
  );
}

export default OrgAdminLogin;
