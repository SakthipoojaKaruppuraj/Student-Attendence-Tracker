import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "../styles/StudentData.css";

const API_URL = "http://localhost:5001";

function StudentData() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch =
    searchParams.get("search") ||
    searchParams.get("register_number") ||
    "";

  const [selectedFile, setSelectedFile] = useState(null);
  const [students, setStudents] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [uploadedAt, setUploadedAt] = useState(null);
  const [originalFileName, setOriginalFileName] = useState("");

  const [search, setSearch] = useState(initialSearch);
  const [selectedStudentModal, setSelectedStudentModal] = useState(null);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Fetch existing student data
  const fetchStudents = async () => {
    try {
      setFetching(true);

      const response = await axios.get(
        `${API_URL}/api/students`
      );

      if (response.data.success) {
        const studentList = response.data.students || [];
        setStudents(studentList);
        setTotalStudents(response.data.totalStudents || 0);
        setUploadedAt(response.data.uploadedAt || null);
        setOriginalFileName(
          response.data.originalFileName || ""
        );

        if (initialSearch && studentList.length > 0) {
          const q = initialSearch.toLowerCase();
          const target = studentList.find(
            (s) =>
              (s.register_number || "").toLowerCase() === q ||
              (s.roll_number || "").toLowerCase() === q ||
              (s.student_name || "").toLowerCase().includes(q)
          );

          if (target) {
            setSelectedStudentModal(target);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch students:", err);

      setError(
        "Unable to load student data. Make sure the backend is running."
      );
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // File selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];

    setMessage("");
    setError("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const allowedExtensions = [
      ".xlsx",
      ".xls",
      ".csv",
    ];

    const fileName = file.name.toLowerCase();

    const isValid = allowedExtensions.some(
      (extension) => fileName.endsWith(extension)
    );

    if (!isValid) {
      setSelectedFile(null);

      setError(
        "Please select an XLSX, XLS or CSV file."
      );

      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setSelectedFile(null);

      setError(
        "File size must be less than 10 MB."
      );

      return;
    }

    setSelectedFile(file);
  };

  // Upload file
  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file first.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setError("");

      const formData = new FormData();

      formData.append("file", selectedFile);

      const response = await axios.post(
        `${API_URL}/api/students/upload`,
        formData
      );

      if (response.data.success) {
        setMessage(
          `Student data uploaded successfully. ${response.data.totalStudents} students loaded.`
        );

        setSelectedFile(null);

        await fetchStudents();
      }
    } catch (err) {
      console.error("Upload error:", err);

      const backendMessage =
        err.response?.data?.message;

      setError(
        backendMessage ||
          "Failed to upload student data."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "Not available";

    return new Date(date).toLocaleString();
  };

  const filteredStudents = students.filter((student) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (student.student_name || "").toLowerCase().includes(q) ||
      (student.register_number || "").toLowerCase().includes(q) ||
      (student.roll_number || "").toLowerCase().includes(q) ||
      (student.department || "").toLowerCase().includes(q) ||
      (student.soi_lab_vertical || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="admin-layout">
      <Sidebar />

      <main className="student-data-page">

        {/* Header */}
        <div className="student-page-header">
          <div>
            <h1>Student Data</h1>

            <p>
              Upload and manage the master student
              database.
            </p>
          </div>
        </div>

        {/* Upload Section */}
        <section className="student-upload-card">

          <div className="section-heading">
            <div>
              <h2>Upload Student Data</h2>

              <p>
                Upload an Excel or CSV file containing
                the student master data.
              </p>
            </div>
          </div>

          <div className="upload-area">

            <div className="upload-icon">
              📂
            </div>

            <h3>
              Select Student Data File
            </h3>

            <p>
              Supported formats: XLSX, XLS, CSV
            </p>

            <p className="upload-limit">
              Maximum file size: 10 MB
            </p>

            <label
              htmlFor="student-file"
              className="choose-file-button"
            >
              Choose File
            </label>

            <input
              id="student-file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              hidden
            />

            {selectedFile && (
              <div className="selected-file">
                <span>📄</span>

                <div>
                  <strong>
                    {selectedFile.name}
                  </strong>

                  <small>
                    {(
                      selectedFile.size /
                      1024
                    ).toFixed(1)}{" "}
                    KB
                  </small>
                </div>
              </div>
            )}

            <button
              className="upload-button"
              onClick={handleUpload}
              disabled={
                !selectedFile || loading
              }
            >
              {loading
                ? "Uploading..."
                : "Upload Student Data"}
            </button>

          </div>

          {/* Messages */}
          {message && (
            <div className="success-message">
              ✓ {message}
            </div>
          )}

          {error && (
            <div className="error-message">
              ⚠ {error}
            </div>
          )}

        </section>

        {/* Statistics */}
        <section className="student-stat-grid">

          <div className="student-stat-card">
            <div className="stat-icon">
              👥
            </div>

            <div>
              <span>
                Total Students
              </span>

              <strong>
                {totalStudents}
              </strong>
            </div>
          </div>

          <div className="student-stat-card">
            <div className="stat-icon">
              📚
            </div>

            <div>
              <span>
                Current Year
              </span>

              <strong>
                {students.length > 0
                  ? students[0].year ||
                    "Not specified"
                  : "-"}
              </strong>
            </div>
          </div>

          <div className="student-stat-card">
            <div className="stat-icon">
              📁
            </div>

            <div>
              <span>
                Last Uploaded File
              </span>

              <strong className="file-stat">
                {originalFileName || "-"}
              </strong>
            </div>
          </div>

        </section>

        {/* Student List */}
        <section className="student-list-card">

          <div className="student-list-header" style={{ flexWrap: "wrap", gap: "15px" }}>

            <div>
              <h2>
                Student Master Data
              </h2>

              <p>
                {uploadedAt
                  ? `Last updated: ${formatDate(
                      uploadedAt
                    )}`
                  : "No student data uploaded yet."}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="text"
                placeholder="🔍 Search name, reg no, roll no..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: "9px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  width: "280px",
                  fontSize: "13px",
                }}
              />

              <div className="student-count">
                {filteredStudents.length} / {totalStudents} Students
              </div>
            </div>

          </div>

          {fetching ? (
            <div className="loading-state">
              Loading student data...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                👥
              </div>

              <h3>
                No Student Data Found
              </h3>

              <p>
                {search
                  ? "No students match your search criteria."
                  : "Upload your student Excel or CSV file to populate the master database."}
              </p>
            </div>
          ) : (
            <div className="student-table-wrapper">

              <table className="student-table">

                <thead>
                  <tr>
                    <th>S.No.</th>
                    <th>Student Name</th>
                    <th>Register Number</th>
                    <th>Roll Number</th>
                    <th>Department</th>
                    <th>Section</th>
                    <th>Gender</th>
                    <th>Year</th>
                    <th>SoI Lab Vertical</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.map(
                    (student, index) => (
                      <tr
                        key={
                          student.register_number ||
                          index
                        }
                      >
                        <td>
                          {student.s_no ||
                            index + 1}
                        </td>

                        <td>
                          <button
                            onClick={() => {
                              const sId =
                                student.register_number ||
                                student.roll_number ||
                                student.student_name;
                              navigate(
                                `/admin/students/${encodeURIComponent(sId)}`
                              );
                            }}
                            style={{
                              border: "none",
                              background: "none",
                              color: "#2563eb",
                              fontWeight: "600",
                              cursor: "pointer",
                              padding: 0,
                              textAlign: "left",
                            }}
                            title="Click to view dedicated student profile"
                          >
                            {student.student_name}
                          </button>
                        </td>

                        <td>
                          {
                            student.register_number
                          }
                        </td>

                        <td>
                          {student.roll_number}
                        </td>

                        <td>
                          {student.department}
                        </td>

                        <td>
                          {student.section ||
                            "-"}
                        </td>

                        <td>
                          {student.gender ||
                            "-"}
                        </td>

                        <td>
                          {student.year ||
                            "-"}
                        </td>

                        <td>
                          {student.soi_lab_vertical ||
                            "-"}
                        </td>

                        <td>
                          <button
                            onClick={() => {
                              const sId =
                                student.register_number ||
                                student.roll_number ||
                                student.student_name;
                              navigate(
                                `/admin/students/${encodeURIComponent(sId)}`
                              );
                            }}
                            style={{
                              padding: "5px 10px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              background: "#f8fafc",
                              color: "#334155",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "500",
                            }}
                          >
                            View Full Details
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>

              </table>

            </div>
          )}

        </section>

      </main>

      {/* FULL STUDENT MASTER DETAILS MODAL */}
      {selectedStudentModal && (
        <div className="modal-overlay">
          <div className="student-modal" style={{ width: "650px", maxWidth: "90vw" }}>
            <div className="modal-header">
              <h2>🎓 Student Master Record</h2>
              <button onClick={() => setSelectedStudentModal(null)}>×</button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "14px",
                padding: "10px 0",
              }}
            >
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                <small style={{ color: "#64748b" }}>Student Name</small>
                <strong style={{ display: "block", fontSize: "16px", color: "#1e293b", marginTop: "3px" }}>
                  {selectedStudentModal.student_name}
                </strong>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                <small style={{ color: "#64748b" }}>Register Number</small>
                <strong style={{ display: "block", fontSize: "15px", color: "#2563eb", marginTop: "3px" }}>
                  {selectedStudentModal.register_number}
                </strong>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                <small style={{ color: "#64748b" }}>Roll Number</small>
                <strong style={{ display: "block", fontSize: "15px", color: "#334155", marginTop: "3px" }}>
                  {selectedStudentModal.roll_number}
                </strong>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                <small style={{ color: "#64748b" }}>Department</small>
                <strong style={{ display: "block", fontSize: "14px", color: "#334155", marginTop: "3px" }}>
                  {selectedStudentModal.department}
                </strong>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                <small style={{ color: "#64748b" }}>Section</small>
                <strong style={{ display: "block", fontSize: "14px", color: "#334155", marginTop: "3px" }}>
                  {selectedStudentModal.section || "-"}
                </strong>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                <small style={{ color: "#64748b" }}>Gender</small>
                <strong style={{ display: "block", fontSize: "14px", color: "#334155", marginTop: "3px" }}>
                  {selectedStudentModal.gender || "-"}
                </strong>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                <small style={{ color: "#64748b" }}>Year</small>
                <strong style={{ display: "block", fontSize: "14px", color: "#334155", marginTop: "3px" }}>
                  {selectedStudentModal.year || "-"}
                </strong>
              </div>

              <div style={{ background: "#eff6ff", padding: "12px", borderRadius: "8px" }}>
                <small style={{ color: "#1d4ed8" }}>SoI Lab Vertical</small>
                <strong style={{ display: "block", fontSize: "14px", color: "#1e40af", marginTop: "3px" }}>
                  {selectedStudentModal.soi_lab_vertical || "-"}
                </strong>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", gridColumn: "span 2" }}>
                <small style={{ color: "#64748b" }}>KITE Email ID</small>
                <strong style={{ display: "block", fontSize: "14px", color: "#2563eb", marginTop: "3px" }}>
                  {selectedStudentModal.kite_email || "-"}
                </strong>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", gridColumn: "span 2" }}>
                <small style={{ color: "#64748b" }}>SoI Email ID</small>
                <strong style={{ display: "block", fontSize: "14px", color: "#2563eb", marginTop: "3px" }}>
                  {selectedStudentModal.soi_email || "-"}
                </strong>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", gridColumn: "span 2" }}>
                <small style={{ color: "#64748b" }}>Remarks</small>
                <strong style={{ display: "block", fontSize: "14px", color: "#334155", marginTop: "3px" }}>
                  {selectedStudentModal.remarks || "-"}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentData;