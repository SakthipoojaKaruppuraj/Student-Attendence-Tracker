import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "../styles/AdminLogin.css";

function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isOrgAdminRedirect, setIsOrgAdminRedirect] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsOrgAdminRedirect(false);

    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }

    try {
      setLoading(true);

      const apiUrl = import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/api/admin/login`
        : "/api/admin/login";
      let response;
      try {
        response = await axios.post(apiUrl, { username, password });
      } catch (err) {
        if (!import.meta.env.VITE_API_URL && err.code === "ERR_NETWORK") {
          response = await axios.post("http://localhost:5001/api/admin/login", {
            username,
            password,
          });
        } else {
          throw err;
        }
      }

      // Store JWT token
      localStorage.setItem("adminToken", response.data.token);

      // Store admin information
      localStorage.setItem("admin", JSON.stringify(response.data.admin));

      // Navigate to dashboard
      navigate("/admin/dashboard");
    } catch (error) {
      if (error.response?.data?.isOrgAdmin) {
        setIsOrgAdminRedirect(true);
        setError(error.response.data.message);
      } else if (error.code === "ERR_NETWORK" || !error.response) {
        setError(
          "Cannot connect to server. Please make sure the backend server is running on http://localhost:5001"
        );
      } else {
        setError(
          error.response?.data?.message || "Login failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: "460px" }}>
        {/* Role Toggle Header */}
        <div className="role-switcher">
          <Link to="/student/login" className="role-tab-btn inactive">
            🎓 Student Portal
          </Link>
          <button type="button" className="role-tab-btn active">
            🔑 Admin Login
          </button>
        </div>

        <div className="login-header">
          <h1>Admin Login</h1>
          <p>Student Management System</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter your domain admin username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
              {isOrgAdminRedirect && (
                <div style={{ marginTop: "10px" }}>
                  <Link
                    to="/org-admin/login"
                    style={{
                      display: "inline-block",
                      background: "#7c3aed",
                      color: "#fff",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    Go to Management Portal →
                  </Link>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="credentials-hint">
            <p>
              <strong>Domain Admin Portal</strong>
            </p>
            <p style={{ marginTop: "4px", fontSize: "12px", color: "#64748b" }}>
              Management accounts must use the 👑 Management Portal.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;