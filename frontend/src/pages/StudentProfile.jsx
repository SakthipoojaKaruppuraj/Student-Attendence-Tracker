import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "../styles/StudentProfile.css";

const API_URL = "http://localhost:5001";

function StudentProfile() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        setLoading(true);

        const response = await axios.get(
          `${API_URL}/api/students/${encodeURIComponent(studentId)}`
        );

        if (response.data.success) {
          setStudent(response.data.student);
        } else {
          setError("Student record not found.");
        }
      } catch (err) {
        console.error("Error loading student profile:", err);

        // Fallback search from full list
        try {
          const listRes = await axios.get(`${API_URL}/api/students`);
          if (listRes.data.success) {
            const list = listRes.data.students || [];
            const query = (studentId || "").toLowerCase();

            const found = list.find(
              (s) =>
                (s.register_number || "").toLowerCase() === query ||
                (s.roll_number || "").toLowerCase() === query ||
                (s.student_name || "").toLowerCase().includes(query)
            );

            if (found) {
              setStudent(found);
              setError("");
            } else {
              setError("Student record not found.");
            }
          }
        } catch (e) {
          setError("Unable to load student record.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [studentId]);

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="student-profile-page">

        {/* Back Navigation Bar */}
        <div className="profile-top-bar">
          <button
            className="back-btn"
            onClick={() => navigate(-1)}
            title="Go back to previous page"
          >
            ← Back
          </button>

          <span className="page-breadcrumb">
            Student Profile / {student?.student_name || studentId}
          </span>
        </div>

        {loading ? (
          <div className="profile-loading-card">
            <div className="spinner">⏳</div>
            <p>Loading student profile...</p>
          </div>
        ) : error || !student ? (
          <div className="profile-error-card">
            <h2>Student Not Found</h2>
            <p>{error || "No student record found for this identifier."}</p>
            <button className="back-btn" onClick={() => navigate(-1)}>
              ← Go Back
            </button>
          </div>
        ) : (
          <div className="profile-container">

            {/* Header Hero Banner */}
            <div className="profile-hero-card">
              <div className="profile-avatar">
                {student.student_name
                  ? student.student_name.charAt(0).toUpperCase()
                  : "🎓"}
              </div>

              <div className="profile-hero-info">
                <h1>{student.student_name}</h1>

                <div className="profile-pills">
                  <span className="pill reg-pill">
                    Reg: {student.register_number}
                  </span>

                  <span className="pill roll-pill">
                    Roll: {student.roll_number}
                  </span>

                  <span className="pill dept-pill">
                    {student.department}
                  </span>

                  <span className="pill year-pill">
                    {student.year || "3rd Year"}
                  </span>
                </div>
              </div>
            </div>

            {/* Master Details Cards */}
            <div className="profile-sections-grid">

              {/* Personal Information */}
              <div className="info-card">
                <h3>📋 Academic & Personal Details</h3>

                <div className="info-grid">

                  <div className="info-item">
                    <label>S.No</label>
                    <span>{student.s_no || "-"}</span>
                  </div>

                  <div className="info-item">
                    <label>Full Name</label>
                    <span className="bold-value">{student.student_name}</span>
                  </div>

                  <div className="info-item">
                    <label>Register Number</label>
                    <span className="blue-value">{student.register_number}</span>
                  </div>

                  <div className="info-item">
                    <label>Roll Number</label>
                    <span>{student.roll_number}</span>
                  </div>

                  <div className="info-item">
                    <label>Department</label>
                    <span>{student.department}</span>
                  </div>

                  <div className="info-item">
                    <label>Section</label>
                    <span>{student.section || "-"}</span>
                  </div>

                  <div className="info-item">
                    <label>Gender</label>
                    <span>{student.gender || "-"}</span>
                  </div>

                  <div className="info-item">
                    <label>Year of Study</label>
                    <span>{student.year || "-"}</span>
                  </div>

                </div>
              </div>

              {/* SoI & Contact Information */}
              <div className="info-card">
                <h3>🚀 SoI Lab & Contact Info</h3>

                <div className="info-grid">

                  <div className="info-item full-width">
                    <label>SoI Lab Vertical</label>
                    <span className="teal-badge">
                      {student.soi_lab_vertical || "-"}
                    </span>
                  </div>

                  <div className="info-item full-width">
                    <label>KITE Email ID</label>
                    <span className="email-link">
                      {student.kite_email || "-"}
                    </span>
                  </div>

                  <div className="info-item full-width">
                    <label>SoI Email ID</label>
                    <span className="email-link">
                      {student.soi_email || "-"}
                    </span>
                  </div>

                  <div className="info-item full-width">
                    <label>Remarks</label>
                    <span>{student.remarks || "No additional remarks"}</span>
                  </div>

                </div>
              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}

export default StudentProfile;
