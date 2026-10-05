import { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "../styles/StudentData.css";

const API_URL = "http://localhost:5001";

function StudentData() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [students, setStudents] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [uploadedAt, setUploadedAt] = useState(null);
  const [originalFileName, setOriginalFileName] = useState("");

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
        setStudents(response.data.students || []);
        setTotalStudents(response.data.totalStudents || 0);
        setUploadedAt(response.data.uploadedAt || null);
        setOriginalFileName(
          response.data.originalFileName || ""
        );
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

          <div className="student-list-header">

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

            <div className="student-count">
              {totalStudents} Students
            </div>

          </div>

          {fetching ? (
            <div className="loading-state">
              Loading student data...
            </div>
          ) : students.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                👥
              </div>

              <h3>
                No Student Data Available
              </h3>

              <p>
                Upload your student Excel or CSV file
                to populate the master database.
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
                  </tr>
                </thead>

                <tbody>
                  {students.map(
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

                        <td className="student-name">
                          {student.student_name}
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
                      </tr>
                    )
                  )}
                </tbody>

              </table>

            </div>
          )}

        </section>

      </main>
    </div>
  );
}

export default StudentData;