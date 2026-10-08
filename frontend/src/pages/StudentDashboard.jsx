import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import StudentSidebar from "../components/StudentSidebar";
import "../styles/StudentDashboard.css";

function StudentDashboard() {
  const [studentData, setStudentData] = useState(null);
  const [stats, setStats] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState("attendance"); // "attendance", "tasks", "profile", "security"
  const [loading, setLoading] = useState(true);

  // Task Submission Modal State
  const [selectedTask, setSelectedTask] = useState(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [comment, setComment] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState("");

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState({ type: "", text: "" });
  const [changingPwd, setChangingPwd] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      if (tabParam === "profile" || tabParam === "security") {
        setActiveTab("profile");
      } else if (tabParam === "tasks") {
        setActiveTab("tasks");
      } else if (tabParam === "attendance") {
        setActiveTab("attendance");
      }
    }
  }, [location.search]);

  useEffect(() => {
    const token = localStorage.getItem("studentToken");
    const storedStudent = localStorage.getItem("student");

    if (!token || !storedStudent) {
      navigate("/student/login");
      return;
    }

    try {
      const parsed = JSON.parse(storedStudent);
      setStudentData(parsed);
      fetchProgress(parsed.rollNumber);
    } catch {
      navigate("/student/login");
    }
  }, [navigate]);

  const getApiUrl = (path) => {
    const base = import.meta.env.VITE_API_URL || "";
    return `${base}${path}`;
  };

  const fetchProgress = async (rollNumber) => {
    try {
      setLoading(true);

      let res;
      try {
        res = await axios.get(getApiUrl(`/api/student-auth/me/progress?rollNumber=${rollNumber}`));
      } catch (err) {
        try {
          res = await axios.get(`http://localhost:5001/api/student-auth/me/progress?rollNumber=${rollNumber}`);
        } catch (err2) {
          console.error("Failed to fetch student progress:", err2);
        }
      }

      if (res && res.data && res.data.success) {
        setStudentData(res.data.student || studentData);
        setStats(res.data.stats || { attendancePercentage: 0, totalDays: 0, presentDays: 0, absentDays: 0, odDays: 0, totalAssignedTasks: 0, completedTasks: 0, pendingTasks: 0 });
        setAttendanceRecords(res.data.attendanceRecords || []);
        setTasks(res.data.tasks || []);
      }
    } catch (err) {
      console.error("Error loading student dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("studentToken");
    localStorage.removeItem("student");
    navigate("/student/login");
  };

  // Handle Submit Task Work
  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    if (!githubUrl) {
      alert("Please enter your GitHub repository or commit URL.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitSuccess("");

      const formData = new FormData();
      formData.append("student_id", studentData.rollNumber);
      formData.append("github_url", githubUrl);
      formData.append("comment", comment || "");
      if (proofFile) {
        formData.append("proof", proofFile);
      }

      const url = getApiUrl(`/api/tasks/${selectedTask.task_id}/submit`);
      let res;
      try {
        res = await axios.post(url, formData);
      } catch (err) {
        if (!import.meta.env.VITE_API_URL && err.code === "ERR_NETWORK") {
          res = await axios.post(`http://localhost:5001/api/tasks/${selectedTask.task_id}/submit`, formData);
        } else {
          throw err;
        }
      }

      if (res.data.success) {
        setSubmitSuccess("Task submitted successfully!");
        setTimeout(() => {
          setSelectedTask(null);
          setGithubUrl("");
          setComment("");
          setProofFile(null);
          setSubmitSuccess("");
          fetchProgress(studentData.rollNumber);
        }, 1500);
      }
    } catch (err) {
      console.error("Task submission error:", err);
      alert(err.response?.data?.message || "Failed to submit task.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMsg({ type: "", text: "" });

    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: "error", text: "New passwords do not match." });
      return;
    }

    if (newPassword.length < 4) {
      setPwdMsg({ type: "error", text: "New password must be at least 4 characters long." });
      return;
    }

    try {
      setChangingPwd(true);
      const url = getApiUrl("/api/student-auth/change-password");
      let res;
      try {
        res = await axios.post(url, {
          rollNumber: studentData.rollNumber,
          currentPassword,
          newPassword,
        });
      } catch (err) {
        if (!import.meta.env.VITE_API_URL && err.code === "ERR_NETWORK") {
          res = await axios.post("http://localhost:5001/api/student-auth/change-password", {
            rollNumber: studentData.rollNumber,
            currentPassword,
            newPassword,
          });
        } else {
          throw err;
        }
      }

      if (res.data.success) {
        setPwdMsg({ type: "success", text: "Password changed successfully! Next login will require your new password." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        fetchProgress(studentData.rollNumber);
      }
    } catch (err) {
      setPwdMsg({ type: "error", text: err.response?.data?.message || "Failed to change password." });
    } finally {
      setChangingPwd(false);
    }
  };

  if (loading) {
    return (
      <div className="student-dashboard-container" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <p style={{ fontSize: "1.2rem", color: "#475569", fontWeight: "600" }}>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="student-dashboard-container with-sidebar">
      {/* Student Sidebar */}
      <StudentSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Body */}
      <main className="dashboard-content">
        {/* Header Title Banner */}
        <div className="student-header-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid #e2e8f0" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "24px", color: "#0f172a", fontWeight: "800" }}>
              Welcome, {studentData?.studentName}
            </h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>
              {studentData?.rollNumber} • {studentData?.department} ({studentData?.year})
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <span className="badge-tag" style={{ background: "#dbeafe", color: "#1d4ed8", padding: "6px 14px", borderRadius: "20px", fontWeight: "700", fontSize: "13px" }}>
              📍 {studentData?.soiLabVertical || studentData?.department}
            </span>
          </div>
        </div>

        {/* Warning Banner if password is still default */}
        {studentData?.isDefaultPassword && (
          <div className="warning-banner">
            <div>
              <strong>🔒 Security Reminder:</strong> You are currently using your default password (<code>Kitesoi@123</code>).
            </div>
            <button onClick={() => setActiveTab("profile")}>Change Password Now</button>
          </div>
        )}

        {/* TAB 1: ATTENDANCE */}
        {activeTab === "attendance" && (
          <>
            {/* KPI Grid */}
            <div className="kpi-grid">
              <div className={`kpi-card ${(stats?.attendancePercentage || 0) >= 75 ? "green" : "amber"}`}>
                <div className="kpi-title">Overall Attendance</div>
                <div className="kpi-value">{stats?.attendancePercentage ?? 0}%</div>
                <div className="kpi-subtext">
                  {(stats?.presentDays || 0) + (stats?.odDays || 0)} of {stats?.totalDays || 0} Sessions Attended
                </div>
              </div>

              <div className="kpi-card green">
                <div className="kpi-title">Present & OD Days</div>
                <div className="kpi-value">{(stats?.presentDays || 0) + (stats?.odDays || 0)}</div>
                <div className="kpi-subtext">
                  {stats?.presentDays || 0} Present | {stats?.odDays || 0} On-Duty
                </div>
              </div>

              <div className="kpi-card purple">
                <div className="kpi-title">Tasks Completed</div>
                <div className="kpi-value">
                  {stats?.completedTasks || 0} / {stats?.totalAssignedTasks || 0}
                </div>
                <div className="kpi-subtext">
                  {stats?.pendingTasks || 0} Tasks Pending Submission
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-title">Department & Vertical</div>
                <div className="kpi-value" style={{ fontSize: "1.3rem", paddingTop: "6px" }}>
                  {studentData?.soiLabVertical || studentData?.department || "General"}
                </div>
                <div className="kpi-subtext">{studentData?.department} ({studentData?.section || "A"})</div>
              </div>
            </div>

            <div className="data-table-wrapper">
              {attendanceRecords.length === 0 ? (
                <p style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "0.95rem" }}>
                  No attendance records logged yet for your profile.
                </p>
              ) : (
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map((rec) => (
                      <tr key={rec.id}>
                        <td><strong>{rec.date}</strong></td>
                        <td>
                          <span className={`status-badge ${String(rec.status || "").toLowerCase()}`}>
                            {rec.status === "P"
                              ? "Present (P)"
                              : rec.status === "A"
                              ? "Absent (A)"
                              : rec.status === "OD"
                              ? "On-Duty (OD)"
                              : rec.status === "ML"
                              ? "Medical Leave (ML)"
                              : rec.status || "Present"}
                          </span>
                        </td>
                        <td style={{ color: "#64748b" }}>{rec.remarks || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* TAB 2: TASKS & SUBMISSIONS */}
        {activeTab === "tasks" && (
          <div className="tasks-grid">
            {tasks.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "#64748b", background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                No tasks currently assigned for your domain/year.
              </div>
            ) : (
              tasks.map((t) => {
                const sub = t.submission;
                return (
                  <div className="task-card" key={t.task_id}>
                    <div>
                      <div className="task-card-header">
                        <span className="badge-tag">{t.domain}</span>
                        {sub ? (
                          <span className={`status-badge ${sub.status === "Approved" ? "p" : sub.status === "Rejected" ? "a" : "od"}`}>
                            {sub.status}
                          </span>
                        ) : (
                          <span className="status-badge a">Not Submitted</span>
                        )}
                      </div>
                      <h3 className="task-title">{t.title}</h3>
                      <p className="task-desc">{t.description}</p>
                      <p style={{ fontSize: "0.825rem", color: "#64748b", marginBottom: "16px", fontWeight: "500" }}>
                        📅 Due Date: {t.due_date || "N/A"}
                      </p>

                      {sub && (
                        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}>
                          <p style={{ fontSize: "0.85rem", color: "#334155", margin: "0 0 4px 0" }}>
                            🔗 <strong>Submitted Link:</strong> <a href={sub.github_url} target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontWeight: "600" }}>{sub.github_url}</a>
                          </p>
                          {sub.admin_feedback && (
                            <p style={{ fontSize: "0.85rem", color: "#d97706", margin: "6px 0 0 0", fontWeight: "500" }}>
                              💬 <strong>Admin Feedback:</strong> {sub.admin_feedback}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      className="submit-task-btn"
                      onClick={() => {
                        setSelectedTask(t);
                        setGithubUrl(sub?.github_url || "");
                        setComment(sub?.comment || "");
                      }}
                    >
                      {sub ? "Update Submission ✏️" : "Submit Task Proof 🚀"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: PROFILE & SECURITY */}
        {(activeTab === "profile" || activeTab === "security") && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", maxWidth: "900px", margin: "0 auto" }}>
            {/* Student Profile Overview Card */}
            <div className="data-table-wrapper" style={{ padding: "28px" }}>
              <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#0f172a" }}>👤 Student Profile Details</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px", color: "#334155" }}>
                <div><strong>Student Name:</strong> {studentData?.studentName}</div>
                <div><strong>Roll Number:</strong> {studentData?.rollNumber}</div>
                <div><strong>Register Number:</strong> {studentData?.registerNumber || "-"}</div>
                <div><strong>Department:</strong> {studentData?.department}</div>
                <div><strong>Section:</strong> {studentData?.section || "A"}</div>
                <div><strong>Academic Year:</strong> {studentData?.year}</div>
                <div><strong>SoI Lab Vertical:</strong> {studentData?.soiLabVertical || "General"}</div>
                <div><strong>KITE Email:</strong> {studentData?.kiteEmail || "-"}</div>
                <div><strong>SoI Email:</strong> {studentData?.soiEmail || "-"}</div>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="data-table-wrapper" style={{ padding: "28px" }}>
              <h3 style={{ marginTop: 0, marginBottom: "8px", color: "#0f172a" }}>🔒 Security Settings</h3>
              <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "20px" }}>
                Update your account login password.
              </p>

            {pwdMsg.text && (
              <div
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  background: pwdMsg.type === "error" ? "#fee2e2" : "#dcfce7",
                  color: pwdMsg.type === "error" ? "#b91c1c" : "#15803d",
                  border: `1px solid ${pwdMsg.type === "error" ? "#fecaca" : "#bbf7d0"}`,
                  fontWeight: "500",
                }}
              >
                {pwdMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", color: "#334155", fontWeight: "600" }}>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password (e.g. Kitesoi@123)"
                  required
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", fontSize: "0.95rem" }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", color: "#334155", fontWeight: "600" }}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", fontSize: "0.95rem" }}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "6px", color: "#334155", fontWeight: "600" }}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", fontSize: "0.95rem" }}
                />
              </div>

              <button
                type="submit"
                disabled={changingPwd}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                  color: "#ffffff",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
                }}
              >
                {changingPwd ? "Updating Password..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
        )}
      </main>

      {/* TASK SUBMISSION MODAL */}
      {selectedTask && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginTop: 0, color: "#0f172a" }}>Submit Task: {selectedTask.title}</h3>
            <p style={{ color: "#475569", fontSize: "0.9rem", marginBottom: "20px" }}>{selectedTask.description}</p>

            {submitSuccess && (
              <p style={{ color: "#15803d", background: "#dcfce7", border: "1px solid #bbf7d0", padding: "10px", borderRadius: "8px", fontWeight: "500" }}>
                {submitSuccess}
              </p>
            )}

            <form onSubmit={handleTaskSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", color: "#334155", fontWeight: "600" }}>
                  GitHub Repository / Commit Link *
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/username/repository"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", fontSize: "0.95rem" }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", color: "#334155", fontWeight: "600" }}>
                  Submission Notes / Comment (Optional)
                </label>
                <textarea
                  rows="3"
                  placeholder="Describe your implementation or details..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", fontSize: "0.95rem" }}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  style={{ flex: 1, padding: "10px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#475569", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 1, padding: "10px", background: "#4f46e5", border: "none", color: "#ffffff", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)" }}
                >
                  {submitting ? "Submitting..." : "Submit Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;
