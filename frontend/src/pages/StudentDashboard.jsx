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

  const formatDateDDMMM = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const parts = dateStr.trim().split("-");
      if (parts.length === 3 && parts[0].length === 4) {
        const year = parts[0];
        const monthIdx = parseInt(parts[1], 10) - 1;
        const day = parts[2].padStart(2, "0");
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        if (monthIdx >= 0 && monthIdx < 12) {
          return `${day}-${months[monthIdx]}-${year}`;
        }
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  const getDayName = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const parts = dateStr.trim().split("-");
      if (parts.length === 3 && parts[0].length === 4) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return days[d.getDay()];
      }
      return "-";
    } catch (e) {
      return "-";
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const getAttendanceDateBounds = (records) => {
    if (!records || records.length === 0) {
      return { minDateStr: "2026-08-03", maxDateStr: "2026-11-29" };
    }
    let minDateStr = records[0].date;
    let maxDateStr = records[0].date;

    records.forEach((r) => {
      if (r.date) {
        if (r.date < minDateStr) minDateStr = r.date;
        if (r.date > maxDateStr) maxDateStr = r.date;
      }
    });

    return { minDateStr, maxDateStr };
  };

  const generateFullAttendanceList = (records) => {
    if (!records || records.length === 0) return [];

    const recordMap = new Map();
    records.forEach((r) => {
      if (r.date) recordMap.set(r.date.trim(), r);
    });

    const { minDateStr, maxDateStr } = getAttendanceDateBounds(records);
    const minParts = minDateStr.split("-");
    const maxParts = maxDateStr.split("-");

    const minDate = new Date(parseInt(minParts[0], 10), parseInt(minParts[1], 10) - 1, parseInt(minParts[2], 10));
    const maxDate = new Date(parseInt(maxParts[0], 10), parseInt(maxParts[1], 10) - 1, parseInt(maxParts[2], 10));

    const fullList = [];
    const current = new Date(minDate);

    while (current <= maxDate) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, "0");
      const d = String(current.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;

      if (recordMap.has(dateStr)) {
        fullList.push(recordMap.get(dateStr));
      } else {
        const isSunday = current.getDay() === 0;
        fullList.push({
          id: `gen-${dateStr}`,
          date: dateStr,
          status: isSunday ? "H" : "NT",
          remarks: isSunday ? "Sunday" : "-",
        });
      }

      current.setDate(current.getDate() + 1);
    }

    fullList.sort((a, b) => (a.date < b.date ? 1 : -1));
    return fullList;
  };

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
          <div className="attendance-printable-area">
            {/* Top PDF Export Button Bar */}
            <div className="attendance-export-bar">
              <button
                className="btn-export-pdf"
                onClick={handleExportPDF}
                title="Download / Export PDF Report"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9.5 15.5H8V10H9.5C10.3 10 11 10.7 11 11.5V14C11 14.8 10.3 15.5 9.5 15.5ZM13.5 15.5H12V10H13.5C14.3 10 15 10.7 15 11.5V14C15 14.8 14.3 15.5 13.5 15.5ZM17.5 11.5H16V13H17.5V14.25H16V15.5H14.75V10H17.5V11.5Z"/>
                </svg>
              </button>
            </div>

            {/* Top 4 Metric Cards */}
            <div className="attendance-metric-grid">
              <div className="attendance-card present">
                <div className="card-metric-label">PRESENT (HOURS)</div>
                <div className="card-metric-value">
                  {(stats?.presentDays || 0) * 7 || 0}
                </div>
              </div>

              <div className="attendance-card absent">
                <div className="card-metric-label">ABSENT (HOURS)</div>
                <div className="card-metric-value">
                  {(stats?.absentDays || 0) * 7 || 0}
                </div>
              </div>

              <div className="attendance-card od">
                <div className="card-metric-label">OD (HOURS)</div>
                <div className="card-metric-value">
                  {(stats?.odDays || 0) * 7 || 0}
                </div>
              </div>

              <div className="attendance-card ml">
                <div className="card-metric-label">ML (HOURS)</div>
                <div className="card-metric-value">
                  {(stats?.mlDays || 0) * 7 || 0}
                </div>
              </div>
            </div>

            {/* Sub-Summary Banner Box */}
            <div className="attendance-summary-banner">
              <div className="summary-banner-col">
                <div className="banner-val">
                  {formatDateDDMMM(getAttendanceDateBounds(attendanceRecords).minDateStr)}
                </div>
                <div className="banner-lbl">OPEN DATE</div>
              </div>

              <div className="summary-banner-col">
                <div className="banner-val">
                  {formatDateDDMMM(getAttendanceDateBounds(attendanceRecords).maxDateStr)}
                </div>
                <div className="banner-lbl">CLOSE DATE</div>
              </div>

              <div className="summary-banner-col">
                <div className="banner-val">
                  {((stats?.presentDays || 0) + (stats?.odDays || 0)) * 7 || 0}
                </div>
                <div className="banner-lbl">WORKED (HOURS)</div>
              </div>

              <div className="summary-banner-col">
                <div className="banner-val">{stats?.attendancePercentage ?? 0}%</div>
                <div className="banner-lbl">ATTENDANCE(%)</div>
              </div>
            </div>

            {/* Status Legend Row */}
            <div className="attendance-legend-bar">
              <span className="legend-item p">P: Present</span>
              <span className="legend-item a">A: Absent</span>
              <span className="legend-item nt">NT: Attendance Not Taken</span>
              <span className="legend-item od">OD: On Duty</span>
              <span className="legend-item ml">ML: Medical Leave</span>
            </div>

            {/* Detailed Data Table */}
            <div className="attendance-table-container">
              {attendanceRecords.length === 0 ? (
                <p style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "0.95rem" }}>
                  No attendance records logged yet for your profile.
                </p>
              ) : (
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th className="col-index">#</th>
                      <th className="col-date">Date</th>
                      <th className="col-day">Day</th>
                      <th className="col-desc">Description</th>
                      <th className="col-daytype">Day Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generateFullAttendanceList(attendanceRecords).map((rec, idx) => {
                      const dayName = getDayName(rec.date);
                      const isSunday = dayName === "Sun";
                      const isHoliday = rec.status === "H" || isSunday;
                      const description = rec.remarks || (isSunday ? "Sunday" : "-");
                      const dayType = isHoliday
                        ? rec.remarks && rec.remarks !== "-"
                          ? `Holiday (${rec.remarks})`
                          : "Holiday"
                        : rec.status === "P"
                        ? "Present (P)"
                        : rec.status === "A"
                        ? "Absent (A)"
                        : rec.status === "OD"
                        ? "On Duty (OD)"
                        : rec.status === "ML"
                        ? "Medical Leave (ML)"
                        : rec.status === "NT"
                        ? "Attendance Not Taken"
                        : rec.status || "Present";

                      const statusClass = isHoliday
                        ? "holiday"
                        : String(rec.status || "").toLowerCase();

                      return (
                        <tr key={rec.id || idx}>
                          <td className="col-index">{idx + 1}</td>
                          <td className="col-date">{formatDateDDMMM(rec.date)}</td>
                          <td className="col-day">{dayName}</td>
                          <td className="col-desc">{description}</td>
                          <td className="col-daytype">
                            <span className={`status-pill-badge ${statusClass}`}>
                              {dayType}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
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
