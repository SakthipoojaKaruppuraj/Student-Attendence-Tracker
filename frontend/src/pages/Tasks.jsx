import { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "../styles/Tasks.css";

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/tasks`
  : "http://localhost:5001/api/tasks";

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    domain: "",
    year: "",
    due_date: "",
    allowed_proof_types: ["github_url", "image", "video", "pdf"],
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Submissions Modal State
  const [selectedTask, setSelectedTask] = useState(null);
  const [submissionStats, setSubmissionStats] = useState(null);
  const [submittedStudents, setSubmittedStudents] = useState([]);
  const [notSubmittedStudents, setNotSubmittedStudents] = useState([]);
  const [modalTab, setModalTab] = useState("submitted"); // "submitted" or "not_submitted"
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState({});
  const [reviewingId, setReviewingId] = useState(null);

  // -----------------------------------------
  // LOAD TASKS
  // -----------------------------------------

  const fetchTasks = async () => {
    try {
      const adminData = localStorage.getItem("admin");
      let domainParam = "";
      if (adminData) {
        try {
          const parsed = JSON.parse(adminData);
          if (parsed.role === "domain_admin" && parsed.domain && parsed.domain !== "All") {
            domainParam = `?domain=${encodeURIComponent(parsed.domain)}`;
          }
        } catch (e) {}
      }

      const response = await axios.get(`${API_URL}${domainParam}`);

      if (response.data.success) {
        setTasks(response.data.tasks);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
      setError("Unable to load tasks.");
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // -----------------------------------------
  // FETCH SUBMISSIONS & NOT SUBMITTED STUDENTS
  // -----------------------------------------

  const fetchSubmissions = async (task) => {
    setSelectedTask(task);
    setLoadingSubmissions(true);
    setModalTab("submitted");
    try {
      const res = await axios.get(`${API_URL}/${task.task_id}/submissions`);
      if (res.data.success) {
        setSubmissionStats(res.data.stats);
        setSubmittedStudents(res.data.submitted_students || []);
        setNotSubmittedStudents(res.data.not_submitted_students || []);
      }
    } catch (err) {
      console.error("Error fetching submissions:", err);
      alert("Failed to load submission tracking data.");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // -----------------------------------------
  // REVIEW SUBMISSION (APPROVE / REJECT)
  // -----------------------------------------

  const handleReview = async (submissionId, status) => {
    try {
      setReviewingId(submissionId);
      const feedback = reviewFeedback[submissionId] || "";

      const res = await axios.put(`${API_URL}/submissions/${submissionId}/review`, {
        status,
        admin_feedback: feedback,
      });

      if (res.data.success) {
        setSubmittedStudents((prev) =>
          prev.map((s) =>
            s.submission_id === submissionId
              ? { ...s, status, admin_feedback: feedback }
              : s
          )
        );
        fetchTasks(); // refresh card counters
      }
    } catch (err) {
      console.error("Error reviewing submission:", err);
      alert("Failed to update submission status.");
    } finally {
      setReviewingId(null);
    }
  };

  // -----------------------------------------
  // EXPORT PROOF DATABASE (ZIP DOWNLOAD)
  // -----------------------------------------

  const handleExportProofsZip = () => {
    window.open(`${API_URL}/export/proofs-zip`, "_blank");
  };

  // -----------------------------------------
  // FORM HANDLING & CREATE TASK
  // -----------------------------------------

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const adminData = localStorage.getItem("admin");
      let createdBy = "admin";
      if (adminData) {
        const admin = JSON.parse(adminData);
        createdBy = admin.username || "admin";
      }

      const response = await axios.post(API_URL, {
        ...formData,
        created_by: createdBy,
      });

      if (response.data.success) {
        setMessage("Task created successfully.");
        setFormData({
          title: "",
          description: "",
          domain: "",
          year: "",
          due_date: "",
          allowed_proof_types: ["github_url", "image", "video", "pdf"],
        });
        setShowForm(false);
        fetchTasks();
      }
    } catch (error) {
      console.error("Create task error:", error);
      setError(error.response?.data?.message || "Unable to create task.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (taskId) => {
    const confirmed = window.confirm("Are you sure you want to delete this task?");
    if (!confirmed) return;

    try {
      await axios.delete(`${API_URL}/${taskId}`);
      setMessage("Task deleted successfully.");
      fetchTasks();
    } catch (error) {
      console.error("Delete task error:", error);
      setError("Unable to delete task.");
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title?.toLowerCase().includes(search.toLowerCase()) ||
      task.description?.toLowerCase().includes(search.toLowerCase());
    const matchesDomain = domainFilter === "All" || task.domain === domainFilter;
    const matchesYear = yearFilter === "All" || task.year === yearFilter;
    return matchesSearch && matchesDomain && matchesYear;
  });

  const totalTasks = tasks.length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="tasks-page">
        {/* HEADER */}
        <div className="tasks-header">
          <div>
            <h1>Everyday Tasks & Submission Progress</h1>
            <p>Track domain student completion rates, review submissions, and export proof database.</p>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              className="create-task-button"
              style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
              onClick={handleExportProofsZip}
            >
              📦 Export Proof DB (ZIP)
            </button>
            <button
              className="create-task-button"
              onClick={() => {
                setShowForm(!showForm);
                setMessage("");
                setError("");
              }}
            >
              {showForm ? "✕ Close" : "+ Create Task"}
            </button>
          </div>
        </div>

        {/* MESSAGES */}
        {message && <div className="success-message">✓ {message}</div>}
        {error && <div className="error-message">⚠ {error}</div>}

        {/* STATISTICS */}
        <div className="task-statistics">
          <div className="task-stat-card">
            <div className="stat-icon">📋</div>
            <div>
              <span>Total Active Tasks</span>
              <strong>{totalTasks}</strong>
            </div>
          </div>
        </div>

        {/* CREATE TASK FORM */}
        {showForm && (
          <div className="task-form-card">
            <h2>Create New Task</h2>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label>Task Title *</label>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g. Build React Attendance Component"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  rows="3"
                  placeholder="Enter task instructions..."
                  value={formData.description}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-row" style={{ display: "flex", gap: "16px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Domain / Lab Vertical *</label>
                  <input
                    type="text"
                    name="domain"
                    placeholder="e.g. AD - AI and Data Science Lab or All"
                    value={formData.domain}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Academic Year *</label>
                  <select name="year" value={formData.year} onChange={handleChange} required>
                    <option value="">Select Year</option>
                    <option value="All">All Years</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Due Date *</label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? "Creating..." : "Publish Task"}
              </button>
            </form>
          </div>
        )}

        {/* TASK LIST WITH DETAILED DOMAIN METRICS */}
        <div className="tasks-card" style={{ marginTop: "24px" }}>
          <h2>Task List ({filteredTasks.length})</h2>

          {filteredTasks.length === 0 ? (
            <div className="empty-tasks">
              <div className="empty-icon">📋</div>
              <h3>No tasks found</h3>
            </div>
          ) : (
            <div className="task-list">
              {filteredTasks.map((task) => {
                const dueDate = new Date(task.due_date);
                const isOverdue = dueDate < today;
                const analytics = task.analytics || {
                  total_domain_students: 0,
                  submitted_count: 0,
                  not_submitted_count: 0,
                  approved_count: 0,
                };

                return (
                  <div className="task-item" key={task.task_id} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div className="task-title-row">
                          <h3>{task.title}</h3>
                          <span className={isOverdue ? "task-status overdue" : "task-status open"}>
                            {isOverdue ? "Overdue" : "Open"}
                          </span>
                        </div>
                        <p className="task-description" style={{ margin: "6px 0 10px 0" }}>{task.description}</p>
                      </div>

                      <div className="task-actions" style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="view-button"
                          style={{ background: "#6366f1", color: "#fff", whiteSpace: "nowrap" }}
                          onClick={() => fetchSubmissions(task)}
                        >
                          📥 Track & Review Submissions
                        </button>
                        <button className="delete-button" onClick={() => handleDelete(task.task_id)}>
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Progress Summary Cards Bar */}
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        background: "#f8fafc",
                        padding: "10px 16px",
                        borderRadius: "10px",
                        border: "1px solid #e2e8f0",
                        fontSize: "0.85rem",
                        fontWeight: "600",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ color: "#475569" }}>🏢 Domain: {task.domain} ({task.year})</span>
                      <span style={{ color: "#3b82f6" }}>👥 Total Students: {analytics.total_domain_students}</span>
                      <span style={{ color: "#10b981" }}>✅ Submitted: {analytics.submitted_count}</span>
                      <span style={{ color: "#ef4444" }}>⏳ Not Submitted: {analytics.not_submitted_count}</span>
                      <span style={{ color: "#059669" }}>🟢 Approved: {analytics.approved_count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* SUBMISSIONS & NOT-SUBMITTED PROGRESS TRACKING MODAL */}
      {selectedTask && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "28px",
              width: "100%",
              maxWidth: "850px",
              maxHeight: "88vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              color: "#0f172a",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.35rem" }}>Task Progress: {selectedTask.title}</h2>
                <span style={{ color: "#64748b", fontSize: "0.875rem" }}>
                  Domain: {selectedTask.domain} | Year: {selectedTask.year}
                </span>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                style={{ background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            {/* Header Statistics Summary Grid */}
            {submissionStats && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "12px",
                  marginBottom: "20px",
                }}
              >
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px", borderRadius: "10px", textAlign: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Domain Students</span>
                  <strong style={{ fontSize: "1.4rem", color: "#1e293b" }}>{submissionStats.total_students}</strong>
                </div>

                <div style={{ background: "#dcfce7", border: "1px solid #bbf7d0", padding: "12px", borderRadius: "10px", textAlign: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "#15803d", display: "block" }}>Submitted</span>
                  <strong style={{ fontSize: "1.4rem", color: "#15803d" }}>{submissionStats.submitted_count}</strong>
                </div>

                <div style={{ background: "#fee2e2", border: "1px solid #fecaca", padding: "12px", borderRadius: "10px", textAlign: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "#b91c1c", display: "block" }}>Not Submitted</span>
                  <strong style={{ fontSize: "1.4rem", color: "#b91c1c" }}>{submissionStats.not_submitted_count}</strong>
                </div>

                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", padding: "12px", borderRadius: "10px", textAlign: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "#166534", display: "block" }}>Approved</span>
                  <strong style={{ fontSize: "1.4rem", color: "#166534" }}>{submissionStats.approved_count}</strong>
                </div>

                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px", borderRadius: "10px", textAlign: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "#1e40af", display: "block" }}>Pending Review</span>
                  <strong style={{ fontSize: "1.4rem", color: "#1e40af" }}>{submissionStats.pending_review_count}</strong>
                </div>
              </div>
            )}

            {/* Modal Tabs: Submitted vs Not Submitted */}
            <div style={{ display: "flex", gap: "12px", borderBottom: "2px solid #e2e8f0", marginBottom: "20px" }}>
              <button
                type="button"
                onClick={() => setModalTab("submitted")}
                style={{
                  padding: "10px 18px",
                  background: "transparent",
                  border: "none",
                  borderBottom: modalTab === "submitted" ? "3px solid #6366f1" : "3px solid transparent",
                  color: modalTab === "submitted" ? "#6366f1" : "#64748b",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                ✅ Submitted ({submittedStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setModalTab("not_submitted")}
                style={{
                  padding: "10px 18px",
                  background: "transparent",
                  border: "none",
                  borderBottom: modalTab === "not_submitted" ? "3px solid #ef4444" : "3px solid transparent",
                  color: modalTab === "not_submitted" ? "#ef4444" : "#64748b",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                ⏳ Not Submitted ({notSubmittedStudents.length})
              </button>
            </div>

            {loadingSubmissions ? (
              <p style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>Loading submission data...</p>
            ) : modalTab === "submitted" ? (
              /* TAB 1: SUBMITTED STUDENTS REVIEW */
              submittedStudents.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", background: "#f8fafc", borderRadius: "12px" }}>
                  <p style={{ color: "#64748b", margin: 0 }}>No submissions received yet for this task.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {submittedStudents.map((sub) => (
                    <div
                      key={sub.submission_id}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        padding: "18px",
                        background: "#f8fafc",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <div>
                          <strong style={{ fontSize: "1.05rem", color: "#0f172a" }}>{sub.student_name}</strong>{" "}
                          <span style={{ color: "#64748b", fontSize: "0.85rem" }}>({sub.student_id})</span>
                        </div>
                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: "20px",
                            fontSize: "0.8rem",
                            fontWeight: "bold",
                            background: sub.status === "Approved" ? "#dcfce7" : sub.status === "Rejected" ? "#fee2e2" : "#dbeafe",
                            color: sub.status === "Approved" ? "#15803d" : sub.status === "Rejected" ? "#b91c1c" : "#1d4ed8",
                          }}
                        >
                          {sub.status}
                        </span>
                      </div>

                      <p style={{ margin: "4px 0 10px 0", fontSize: "0.9rem", color: "#334155" }}>
                        🔗 <strong>GitHub URL:</strong>{" "}
                        <a href={sub.github_url} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                          {sub.github_url}
                        </a>
                      </p>

                      {sub.comment && (
                        <p style={{ margin: "4px 0 10px 0", fontSize: "0.85rem", color: "#475569" }}>
                          💬 <strong>Student Notes:</strong> {sub.comment}
                        </p>
                      )}

                      {/* Admin Review Action Form */}
                      <div style={{ marginTop: "12px", background: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", marginBottom: "4px", fontWeight: "600" }}>
                          Admin Review Feedback
                        </label>
                        <input
                          type="text"
                          placeholder="Add feedback for student..."
                          value={reviewFeedback[sub.submission_id] ?? (sub.admin_feedback || "")}
                          onChange={(e) =>
                            setReviewFeedback((prev) => ({ ...prev, [sub.submission_id]: e.target.value }))
                          }
                          style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", marginBottom: "10px" }}
                        />

                        <div style={{ display: "flex", gap: "10px" }}>
                          <button
                            type="button"
                            disabled={reviewingId === sub.submission_id}
                            onClick={() => handleReview(sub.submission_id, "Approved")}
                            style={{
                              flex: 1,
                              padding: "8px",
                              background: "#10b981",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              fontWeight: "bold",
                              cursor: "pointer",
                            }}
                          >
                            ✅ Approve Assignment
                          </button>
                          <button
                            type="button"
                            disabled={reviewingId === sub.submission_id}
                            onClick={() => handleReview(sub.submission_id, "Rejected")}
                            style={{
                              flex: 1,
                              padding: "8px",
                              background: "#ef4444",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              fontWeight: "bold",
                              cursor: "pointer",
                            }}
                          >
                            ❌ Reject / Request Revision
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* TAB 2: NOT SUBMITTED STUDENTS LIST */
              notSubmittedStudents.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", background: "#dcfce7", borderRadius: "12px", color: "#15803d" }}>
                  🎉 <strong>100% Submission Rate!</strong> All {submissionStats?.total_students} domain students have submitted this task!
                </div>
              ) : (
                <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "10px 16px", fontSize: "0.85rem", color: "#64748b" }}>#</th>
                        <th style={{ padding: "10px 16px", fontSize: "0.85rem", color: "#64748b" }}>Roll No</th>
                        <th style={{ padding: "10px 16px", fontSize: "0.85rem", color: "#64748b" }}>Student Name</th>
                        <th style={{ padding: "10px 16px", fontSize: "0.85rem", color: "#64748b" }}>Department</th>
                        <th style={{ padding: "10px 16px", fontSize: "0.85rem", color: "#64748b" }}>KITE Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notSubmittedStudents.map((st, index) => (
                        <tr key={st.student_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 16px", fontSize: "0.9rem", color: "#64748b" }}>{index + 1}</td>
                          <td style={{ padding: "10px 16px", fontSize: "0.9rem", fontWeight: "bold", color: "#0f172a" }}>{st.student_id}</td>
                          <td style={{ padding: "10px 16px", fontSize: "0.9rem", color: "#1e293b" }}>{st.student_name}</td>
                          <td style={{ padding: "10px 16px", fontSize: "0.85rem", color: "#475569" }}>{st.department}</td>
                          <td style={{ padding: "10px 16px", fontSize: "0.85rem", color: "#2563eb" }}>{st.kite_email || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Tasks;