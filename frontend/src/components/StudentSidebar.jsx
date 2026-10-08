import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles/StudentSidebar.css";

function StudentSidebar({ activeTab, setActiveTab }) {
  const location = useLocation();
  const navigate = useNavigate();

  const studentData = localStorage.getItem("student");
  let student = null;
  if (studentData) {
    try {
      student = JSON.parse(studentData);
    } catch (e) {
      student = null;
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("studentToken");
    localStorage.removeItem("student");
    navigate("/student/login");
  };

  const handleTabClick = (tabName) => {
    if (location.pathname !== "/student/dashboard") {
      navigate(`/student/dashboard?tab=${tabName}`);
    } else if (setActiveTab) {
      setActiveTab(tabName);
    }
  };

  return (
    <aside className="student-sidebar">
      <div className="student-sidebar-logo">
        <h2 className="student-name-title">🎓 {student?.studentName || "Student Portal"}</h2>
        <div className="student-sidebar-badge">
          <span className="badge-student">
            {student?.rollNumber || "Roll No"}
          </span>
          <span className="badge-year">{student?.year || "3rd Year"}</span>
        </div>
      </div>

      <nav className="student-sidebar-nav">
        {/* Attendance */}
        <button
          onClick={() => handleTabClick("attendance")}
          className={`student-sidebar-link ${
            location.pathname === "/student/dashboard" && activeTab === "attendance" ? "active" : ""
          }`}
        >
          📊 Attendance History
        </button>

        {/* Everyday Tasks */}
        <button
          onClick={() => handleTabClick("tasks")}
          className={`student-sidebar-link ${
            location.pathname === "/student/dashboard" && activeTab === "tasks" ? "active" : ""
          }`}
        >
          📋 Everyday Tasks
        </button>

        {/* News & Events */}
        <Link
          to="/student/news-events"
          className={`student-sidebar-link ${
            location.pathname === "/student/news-events" ? "active" : ""
          }`}
        >
          📢 News & Events
        </Link>

        {/* Profile & Security */}
        <button
          onClick={() => handleTabClick("profile")}
          className={`student-sidebar-link ${
            location.pathname === "/student/dashboard" && activeTab === "profile" ? "active" : ""
          }`}
        >
          👤 Profile & Settings
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="student-sidebar-link logout-btn"
        >
          🚪 Logout ({typeof student?.studentName === "string" ? student.studentName.split(" ")[0] : "Student"})
        </button>
      </nav>
    </aside>
  );
}

export default StudentSidebar;
