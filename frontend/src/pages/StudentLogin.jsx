import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "../styles/AdminLogin.css";

function StudentLogin() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!identifier || !password) {
      setError("Please enter your Roll Number / Email and Password");
      return;
    }

    try {
      setLoading(true);

      const getApiUrl = (endpoint) => {
        const base = import.meta.env.VITE_API_URL || "";
        return `${base}/api/student-auth/${endpoint}`;
      };

      let response;
      try {
        response = await axios.post(getApiUrl("login"), { identifier, password });
      } catch (err) {
        if (!import.meta.env.VITE_API_URL && err.code === "ERR_NETWORK") {
          response = await axios.post("http://localhost:5001/api/student-auth/login", { identifier, password });
        } else {
          throw err;
        }
      }

      if (response.data.success) {
        localStorage.setItem("studentToken", response.data.token);
        localStorage.setItem("student", JSON.stringify(response.data.student));
        navigate("/student/dashboard");
      }
    } catch (err) {
      if (err.code === "ERR_NETWORK" || !err.response) {
        setError("Cannot connect to server. Please verify backend is running on port 5001.");
      } else {
        setError(err.response?.data?.message || "Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: "440px" }}>
        
        {/* Role Toggle Header */}
        <div className="role-switcher">
          <button type="button" className="role-tab-btn active">
            🎓 Student Portal
          </button>
          <Link to="/admin/login" className="role-tab-btn inactive">
            🔑 Admin Login
          </Link>
        </div>

        <div className="login-header">
          <h1>Student Login</h1>
          <p>Access your Attendance & Task Progress</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Roll Number or Email</label>
            <input
              type="text"
              placeholder="e.g. 24UAD105 or student@kite.ac.in"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoFocus
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

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Logging in..." : "Login to Student Portal"}
          </button>

          <div className="credentials-hint">
            <p><strong>💡 Student Login Credentials:</strong></p>
            <p>Username / Roll No: <code>24UCS105</code> (or your Roll Number / Email)</p>
            <p>Default Password: <code>Kitesoi@123</code></p>
            <p style={{ marginTop: "6px", fontSize: "0.8rem", color: "#94a3b8" }}>
              * Initial password for all students is <strong>Kitesoi@123</strong>. You can change your password after logging in.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StudentLogin;
