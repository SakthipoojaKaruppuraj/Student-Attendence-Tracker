import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/AdminLogin.css";

function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }

    try {
      setLoading(true);

      const apiUrl = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/admin/login` : "/api/admin/login";
      let response;
      try {
        response = await axios.post(apiUrl, { username, password });
      } catch (err) {
        if (!import.meta.env.VITE_API_URL && err.code === "ERR_NETWORK") {
          response = await axios.post("http://localhost:5001/api/admin/login", { username, password });
        } else {
          throw err;
        }
      }

      // Store JWT token
      localStorage.setItem("adminToken", response.data.token);

      // Store admin information
      localStorage.setItem(
        "admin",
        JSON.stringify(response.data.admin)
      );

      // Navigate to dashboard
      navigate("/admin/dashboard");

    } catch (error) {
      if (error.code === "ERR_NETWORK" || !error.response) {
        setError(
          "Cannot connect to server. Please make sure the backend server is running on http://localhost:5001"
        );
      } else {
        setError(
          error.response?.data?.message ||
          "Login failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">

      <div className="login-card">

        <div className="login-header">
          <h1>Admin Login</h1>
          <p>Student Management System</p>
        </div>

        <form onSubmit={handleLogin}>

          <div className="form-group">
            <label>Username</label>

            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="error-message">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="credentials-hint">
            <p><strong>Default Credentials:</strong></p>
            <p>Username: <code>admin</code></p>
            <p>Password: <code>Admin@123</code></p>
          </div>

        </form>

      </div>

    </div>
  );
}

export default AdminLogin;