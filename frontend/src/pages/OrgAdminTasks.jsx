import { useEffect, useState } from "react";
import axios from "axios";
import OrgAdminSidebar from "../components/OrgAdminSidebar";
import "../styles/AdminManagement.css";

function OrgAdminTasks() {
  const [summaries, setSummaries] = useState([]);
  const [selectedYear, setSelectedYear] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    return `${baseUrl}/api/org-admin${endpoint}`;
  };

  const fetchTasksSummary = async (targetYear = selectedYear) => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get(
        getApiUrl(`/tasks-summary?year=${encodeURIComponent(targetYear)}`),
        getAuthHeaders()
      );
      if (response.data.success) {
        setSummaries(response.data.domainSummaries || []);
      }
    } catch (err) {
      console.error("Error loading domain task summary:", err);
      setError(
        err.response?.data?.message || "Failed to load domain task report."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksSummary(selectedYear);
  }, [selectedYear]);

  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  const totalSystemTasks = summaries.reduce((acc, s) => acc + s.totalTasks, 0);
  const totalCompleted = summaries.reduce((acc, s) => acc + s.approvedCount, 0);
  const totalOnReview = summaries.reduce((acc, s) => acc + s.pendingReviewCount, 0);
  const totalYetToComplete = summaries.reduce((acc, s) => acc + s.yetToCompleteCount, 0);

  return (
    <div className="dashboard-layout">
      <OrgAdminSidebar />

      <main className="admin-mgmt-page">
        {/* HEADER */}
        <div className="admin-mgmt-header">
          <div>
            <h1>📝 Domain Tasks Report</h1>
            <p>
              Domain-wise task completion analytics & progress report for Management oversight.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              className="create-admin-btn"
              onClick={() => fetchTasksSummary(selectedYear)}
              disabled={loading}
              style={{ padding: "8px 14px", fontSize: "13px" }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* YEAR FILTER TOGGLE BUTTONS */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px",
            background: "#ffffff",
            padding: "10px 16px",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: "700", color: "#334155" }}>
            🎓 Academic Year Filter:
          </span>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => handleYearChange("All")}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                border: "none",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                background: selectedYear === "All" ? "#7c3aed" : "#f1f5f9",
                color: selectedYear === "All" ? "#ffffff" : "#475569",
                boxShadow:
                  selectedYear === "All"
                    ? "0 4px 12px rgba(124, 58, 237, 0.3)"
                    : "none",
              }}
            >
              🌐 All Batches
            </button>

            <button
              onClick={() => handleYearChange("2nd Year")}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                border: "none",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                background: selectedYear === "2nd Year" ? "#2563eb" : "#f1f5f9",
                color: selectedYear === "2nd Year" ? "#ffffff" : "#475569",
                boxShadow:
                  selectedYear === "2nd Year"
                    ? "0 4px 12px rgba(37, 99, 235, 0.3)"
                    : "none",
              }}
            >
              📘 2nd Year Students
            </button>

            <button
              onClick={() => handleYearChange("3rd Year")}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                border: "none",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                background: selectedYear === "3rd Year" ? "#059669" : "#f1f5f9",
                color: selectedYear === "3rd Year" ? "#ffffff" : "#475569",
                boxShadow:
                  selectedYear === "3rd Year"
                    ? "0 4px 12px rgba(5, 150, 105, 0.3)"
                    : "none",
              }}
            >
              📗 3rd Year Students
            </button>
          </div>
        </div>

        {error && <div className="error-message">⚠ {error}</div>}

        {/* METRICS SUMMARY */}
        <div className="admin-mgmt-stats">
          <div className="stat-card">
            <div className="stat-icon">📌</div>
            <div>
              <span>System Tasks ({selectedYear})</span>
              <strong>{loading ? "..." : totalSystemTasks}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div>
              <span>Total Completed</span>
              <strong>{loading ? "..." : totalCompleted}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🔍</div>
            <div>
              <span>On Review</span>
              <strong>{loading ? "..." : totalOnReview}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div>
              <span>Yet to Complete</span>
              <strong>{loading ? "..." : totalYetToComplete}</strong>
            </div>
          </div>
        </div>

        {/* DOMAIN CARDS GRID */}
        <div style={{ marginTop: "20px" }}>
          <h2 style={{ fontSize: "20px", color: "#0f172a", marginBottom: "16px", fontWeight: "700" }}>
            🏢 Domain-Wise Task Analytics ({selectedYear})
          </h2>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              Loading domain task reports...
            </div>
          ) : summaries.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              No domain task data available for {selectedYear}.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: "20px",
              }}
            >
              {summaries.map((item) => {
                const totalExpected = item.totalTasks * item.totalStudents;
                const completionPct =
                  totalExpected > 0
                    ? Math.round((item.approvedCount / totalExpected) * 100)
                    : item.approvedCount > 0
                    ? 100
                    : 0;

                return (
                  <div
                    key={item.domain}
                    style={{
                      background: "#ffffff",
                      borderRadius: "16px",
                      padding: "24px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 14px rgba(0, 0, 0, 0.04)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      {/* CARD HEADER */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "14px",
                        }}
                      >
                        <h3
                          style={{
                            fontSize: "16.5px",
                            fontWeight: "700",
                            color: "#0f172a",
                            lineHeight: "1.3",
                          }}
                        >
                          {item.domain}
                        </h3>
                      </div>

                      {/* ADMIN SUB-TAG */}
                      <div
                        style={{
                          marginBottom: "18px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "#f1f5f9",
                          padding: "4px 10px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "#475569",
                          fontWeight: "600",
                        }}
                      >
                        👤 Sub-Admin:{" "}
                        <span style={{ color: "#4f46e5", fontWeight: "700" }}>
                          {item.username !== "-" ? `@${item.username}` : item.adminName}
                        </span>
                      </div>

                      {/* STATS LIST */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "10px",
                          marginBottom: "20px",
                        }}
                      >
                        <div
                          style={{
                            background: "#f8fafc",
                            padding: "10px 12px",
                            borderRadius: "10px",
                            border: "1px solid #f1f5f9",
                          }}
                        >
                          <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                            Total Tasks
                          </span>
                          <strong style={{ fontSize: "16px", color: "#0f172a" }}>
                            📌 {item.totalTasks}
                          </strong>
                        </div>

                        <div
                          style={{
                            background: "#f8fafc",
                            padding: "10px 12px",
                            borderRadius: "10px",
                            border: "1px solid #f1f5f9",
                          }}
                        >
                          <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                            Enrolled Students
                          </span>
                          <strong style={{ fontSize: "16px", color: "#0f172a" }}>
                            👥 {item.totalStudents}
                          </strong>
                        </div>

                        <div
                          style={{
                            background: "#ecfdf5",
                            padding: "10px 12px",
                            borderRadius: "10px",
                            border: "1px solid #a7f3d0",
                          }}
                        >
                          <span style={{ fontSize: "11px", color: "#047857", display: "block" }}>
                            Completed
                          </span>
                          <strong style={{ fontSize: "16px", color: "#065f46" }}>
                            ✅ {item.approvedCount}
                          </strong>
                        </div>

                        <div
                          style={{
                            background: "#fffbeb",
                            padding: "10px 12px",
                            borderRadius: "10px",
                            border: "1px solid #fde68a",
                          }}
                        >
                          <span style={{ fontSize: "11px", color: "#b45309", display: "block" }}>
                            On Review
                          </span>
                          <strong style={{ fontSize: "16px", color: "#92400e" }}>
                            🔍 {item.pendingReviewCount}
                          </strong>
                        </div>

                        <div
                          style={{
                            gridColumn: "span 2",
                            background: "#fef2f2",
                            padding: "10px 12px",
                            borderRadius: "10px",
                            border: "1px solid #fecaca",
                          }}
                        >
                          <span style={{ fontSize: "11px", color: "#b91c1c", display: "block" }}>
                            Yet to Complete
                          </span>
                          <strong style={{ fontSize: "16px", color: "#991b1b" }}>
                            ⏳ {item.yetToCompleteCount}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* PROGRESS BAR */}
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#64748b",
                          marginBottom: "6px",
                        }}
                      >
                        <span>Completion Rate</span>
                        <span>{completionPct}%</span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: "8px",
                          background: "#e2e8f0",
                          borderRadius: "4px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${completionPct}%`,
                            height: "100%",
                            background: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
                            borderRadius: "4px",
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default OrgAdminTasks;
