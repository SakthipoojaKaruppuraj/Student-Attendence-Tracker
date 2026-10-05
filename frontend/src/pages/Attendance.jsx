import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import "../styles/Attendance.css";

const API_BASE = "http://localhost:5001/api";

function Attendance() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [year, setYear] = useState("2");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(false);

  // ------------------------------------------
  // AUTH CHECK
  // ------------------------------------------
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      navigate("/admin/login");
    }
  }, [navigate]);

  // ------------------------------------------
  // LOAD STUDENTS
  // ------------------------------------------
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await axios.get(`${API_BASE}/attendance/students`);
        setStudents(response.data);
      } catch (error) {
        console.error("Unable to load students:", error);
      }
    };

    fetchStudents();
  }, []);

  // ------------------------------------------
  // LOAD ATTENDANCE FOR SELECTED DATE
  // ------------------------------------------
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const response = await axios.get(
          `${API_BASE}/attendance?date=${date}`
        );

        const attendanceData = {};
        response.data.forEach((item) => {
          attendanceData[item.student_id] = item.status;
        });

        setAttendance(attendanceData);
      } catch (error) {
        console.error("Unable to load attendance:", error);
      }
    };

    fetchAttendance();
  }, [date]);

  // ------------------------------------------
  // FILTER STUDENTS
  // ------------------------------------------
  const filteredStudents = students.filter((student) => {
    const studentYear = String(
      student.year || student.Year || student.YEAR || ""
    ).toLowerCase();

    const name =
      student.name || student.student_name || student.Name || "";

    const matchesYear =
      studentYear.includes(year === "2" ? "2" : "3") ||
      studentYear.includes(year === "2" ? "second" : "third");

    const matchesSearch = name
      .toLowerCase()
      .includes(search.toLowerCase());

    return matchesYear && matchesSearch;
  });

  // ------------------------------------------
  // MARK ATTENDANCE
  // ------------------------------------------
  const markAttendance = (studentId, status) => {
    setAttendance((previous) => ({
      ...previous,
      [studentId]: status,
    }));
  };

  // ------------------------------------------
  // MARK ALL PRESENT
  // ------------------------------------------
  const markAllPresent = () => {
    const updated = { ...attendance };

    filteredStudents.forEach((student) => {
      const studentId =
        student.student_id || student.id || student.ID || student.roll_no;
      updated[studentId] = "P";
    });

    setAttendance(updated);
  };

  // ------------------------------------------
  // SAVE ATTENDANCE
  // ------------------------------------------
  const saveAttendance = async () => {
    try {
      setLoading(true);

      const data = filteredStudents.map((student) => {
        const studentId =
          student.student_id || student.id || student.ID || student.roll_no;

        const name =
          student.name || student.student_name || student.Name || "";

        const studentYear = student.year || student.Year || "";

        return {
          student_id: studentId,
          student_name: name,
          year: studentYear,
          status: attendance[studentId] || "A",
        };
      });

      await axios.post(`${API_BASE}/attendance`, {
        date,
        attendance: data,
      });

      alert("Attendance updated successfully!");
    } catch (error) {
      console.error(error);
      alert("Unable to update attendance.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------
  // DOWNLOAD CSV
  // ------------------------------------------
  const downloadCSV = () => {
    const rows = filteredStudents.map((student) => {
      const studentId =
        student.student_id || student.id || student.ID || student.roll_no;

      const name =
        student.name || student.student_name || student.Name || "";

      const studentYear = student.year || student.Year || "";

      return {
        date,
        student_id: studentId,
        student_name: name,
        year: studentYear,
        status: attendance[studentId] || "A",
      };
    });

    const header = "Date,Student ID,Student Name,Year,Status";

    const csvRows = rows.map((row) =>
      [
        row.date,
        row.student_id,
        `"${row.student_name}"`,
        row.year,
        row.status,
      ].join(",")
    );

    const csvContent = [header, ...csvRows].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `attendance_${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="attendance-page">
        <div className="attendance-header">
          <div>
            <h1>Attendance</h1>
            <p>Manage daily student attendance</p>
          </div>

          <div className="date-container">
            <label>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {/* YEAR TABS */}
        <div className="year-tabs">
          <button
            className={
              year === "2" ? "year-tab active" : "year-tab"
            }
            onClick={() => setYear("2")}
          >
            2nd Year
          </button>

          <button
            className={
              year === "3" ? "year-tab active" : "year-tab"
            }
            onClick={() => setYear("3")}
          >
            3rd Year
          </button>
        </div>

        {/* SEARCH + ACTIONS */}
        <div className="attendance-toolbar">
          <input
            type="text"
            placeholder="Search student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            className="present-all-btn"
            onClick={markAllPresent}
          >
            Mark All Present
          </button>

          <button
            className="save-btn"
            onClick={saveAttendance}
            disabled={loading}
          >
            {loading ? "Updating..." : "Update Attendance"}
          </button>

          <button
            className="download-btn"
            onClick={downloadCSV}
          >
            Download CSV
          </button>
        </div>

        {/* TABLE */}
        <div className="attendance-table-container">
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Student</th>
                <th>Domain</th>
                <th>Attendance</th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center", padding: "20px" }}>
                    No students found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, index) => {
                  const studentId =
                    student.student_id ||
                    student.id ||
                    student.ID ||
                    student.roll_no;

                  const name =
                    student.name ||
                    student.student_name ||
                    student.Name ||
                    "Unknown";

                  const domain =
                    student.domain || student.Domain || "-";

                  return (
                    <tr key={studentId}>
                      <td>{index + 1}</td>
                      <td>
                        <button
                          className="student-name"
                          onClick={() => setSelectedStudent(student)}
                        >
                          {name}
                        </button>
                      </td>
                      <td>{domain}</td>
                      <td>
                        <div className="status-buttons">
                          <button
                            className={
                              attendance[studentId] === "P"
                                ? "status present selected"
                                : "status present"
                            }
                            onClick={() => markAttendance(studentId, "P")}
                          >
                            P
                          </button>

                          <button
                            className={
                              attendance[studentId] === "A"
                                ? "status absent selected"
                                : "status absent"
                            }
                            onClick={() => markAttendance(studentId, "A")}
                          >
                            A
                          </button>

                          <button
                            className={
                              attendance[studentId] === "OD"
                                ? "status od selected"
                                : "status od"
                            }
                            onClick={() => markAttendance(studentId, "OD")}
                          >
                            OD
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* STUDENT DETAILS MODAL */}
      {selectedStudent && (
        <div className="modal-overlay">
          <div className="student-modal">
            <div className="modal-header">
              <h2>Student Details</h2>
              <button onClick={() => setSelectedStudent(null)}>×</button>
            </div>

            <div className="student-details">
              {Object.entries(selectedStudent).map(([key, value]) => (
                <div className="detail-row" key={key}>
                  <span>{key}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Attendance;