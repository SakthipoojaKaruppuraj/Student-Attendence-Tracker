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

  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayReasonInput, setHolidayReasonInput] = useState("");
  const [currentHolidayReason, setCurrentHolidayReason] = useState("");

  const presetReasons = [
    "IA Exam",
    "Saturday",
    "Sunday",
    "Onam Celebration",
    "Pongal Festival",
    "Institutional Event",
  ];

  // ------------------------------------------
  // AUTH CHECK
  // ------------------------------------------
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      navigate("/admin/login");
    }
  }, [navigate]);

  const getDomainParam = () => {
    const adminData = localStorage.getItem("admin");
    if (adminData) {
      try {
        const parsed = JSON.parse(adminData);
        if (parsed.role === "domain_admin" && parsed.domain && parsed.domain !== "All") {
          return `domain=${encodeURIComponent(parsed.domain)}`;
        }
      } catch (e) {}
    }
    return "";
  };

  // ------------------------------------------
  // LOAD STUDENTS
  // ------------------------------------------
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const domainParam = getDomainParam();
        const url = domainParam
          ? `${API_BASE}/attendance/students?${domainParam}`
          : `${API_BASE}/attendance/students`;
        const response = await axios.get(url);
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
        let detectedReason = "";

        response.data.forEach((item) => {
          attendanceData[item.student_id] = item.status;
          if ((item.status === "H" || item.status?.startsWith("H:")) && (item.remarks || item.reason)) {
            detectedReason = item.remarks || item.reason;
          }
        });

        setAttendance(attendanceData);
        setCurrentHolidayReason(detectedReason);
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
  // CONFIRM DECLARE HOLIDAY
  // ------------------------------------------
  const confirmDeclareHoliday = async (chosenReason) => {
    const reason = (chosenReason || holidayReasonInput).trim();

    if (!reason) {
      alert("Please enter or select a reason for the holiday.");
      return;
    }

    const updated = { ...attendance };

    filteredStudents.forEach((student) => {
      const studentId =
        student.student_id || student.id || student.ID || student.roll_no;
      updated[studentId] = "H";
    });

    setAttendance(updated);
    setCurrentHolidayReason(reason);
    setShowHolidayModal(false);

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
          status: "H",
          remarks: reason,
        };
      });

      await axios.post(`${API_BASE}/attendance`, {
        date,
        attendance: data,
      });

      alert(`Declared ${date} as Holiday (${reason}) successfully!`);
    } catch (err) {
      console.error(err);
      alert("Holiday marked locally. Click Update Attendance to save if offline.");
    } finally {
      setLoading(false);
      setHolidayReasonInput("");
    }
  };

  const isDateHoliday =
    filteredStudents.length > 0 &&
    filteredStudents.every((student) => {
      const studentId =
        student.student_id || student.id || student.ID || student.roll_no;
      return attendance[studentId] === "H";
    });

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

        const status = attendance[studentId] || "A";

        return {
          student_id: studentId,
          student_name: name,
          year: studentYear,
          status,
          remarks: status === "H" ? currentHolidayReason || "Declared Holiday" : "",
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
  // DOWNLOAD SINGLE DAY CSV
  // ------------------------------------------
  const downloadCSV = () => {
    const rows = filteredStudents.map((student) => {
      const studentId =
        student.student_id || student.id || student.ID || student.roll_no;

      const name =
        student.name || student.student_name || student.Name || "";

      const studentYear = student.year || student.Year || "";

      const status = attendance[studentId] || "A";

      return {
        date,
        student_id: studentId,
        student_name: name,
        year: studentYear,
        status: status === "H" && currentHolidayReason ? `H (${currentHolidayReason})` : status,
      };
    });

    const header = "Date,Student ID,Student Name,Year,Status";

    const csvRows = rows.map((row) =>
      [
        row.date,
        row.student_id,
        `"${row.student_name.replace(/"/g, '""')}"`,
        row.year,
        `"${row.status.replace(/"/g, '""')}"`,
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

  // ------------------------------------------
  // DOWNLOAD MASTER ATTENDANCE SHEET
  // ------------------------------------------
  const downloadMasterCSV = async () => {
    try {
      const domainParam = getDomainParam();
      const reportUrl = domainParam
        ? `${API_BASE}/attendance/master-report?${domainParam}`
        : `${API_BASE}/attendance/master-report`;

      const response = await axios.get(reportUrl);

      if (!response.data.success) {
        alert("Failed to generate master report.");
        return;
      }

      const { dates, students: reportRows } = response.data;

      const masterHeaders = [
        "S.No.",
        "Student Name",
        "Register Number",
        "Roll Number",
        "Department",
        "Section",
        "Gender",
        "Year",
        "SoI Lab Vertical",
        "KITE Email ID",
        "SoI Email ID",
        "Remarks",
        ...dates,
      ];

      const csvRows = reportRows.map((row) => {
        const baseValues = [
          row.s_no,
          `"${(row.student_name || "").replace(/"/g, '""')}"`,
          `"${(row.register_number || "").replace(/"/g, '""')}"`,
          `"${(row.roll_number || "").replace(/"/g, '""')}"`,
          `"${(row.department || "").replace(/"/g, '""')}"`,
          `"${(row.section || "").replace(/"/g, '""')}"`,
          `"${(row.gender || "").replace(/"/g, '""')}"`,
          `"${(row.year || "").replace(/"/g, '""')}"`,
          `"${(row.soi_lab_vertical || "").replace(/"/g, '""')}"`,
          `"${(row.kite_email || "").replace(/"/g, '""')}"`,
          `"${(row.soi_email || "").replace(/"/g, '""')}"`,
          `"${(row.remarks || "").replace(/"/g, '""')}"`,
        ];

        const dateStatuses = dates.map((d) => `"${(row[d] || "-").replace(/"/g, '""')}"`);

        return [...baseValues, ...dateStatuses].join(",");
      });

      const csvContent = [masterHeaders.join(","), ...csvRows].join("\n");

      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `master_attendance_report.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading master sheet:", err);
      alert("Unable to download master attendance sheet.");
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="attendance-page">
        <div className="attendance-header">
          <div>
            <h1>Attendance</h1>
            <p>Manage daily student attendance and master records</p>
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

        {/* HOLIDAY BANNER */}
        {isDateHoliday && (
          <div className="holiday-banner">
            <span>🎉</span>
            <div>
              <strong>Declared as Holiday ({date})</strong>
              {currentHolidayReason && (
                <div style={{ marginTop: "4px", fontSize: "14px", fontWeight: "normal" }}>
                  Reason: <em>{currentHolidayReason}</em>
                </div>
              )}
            </div>
          </div>
        )}

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
            className="holiday-btn"
            onClick={() => setShowHolidayModal(true)}
          >
            🎉 Declare Holiday
          </button>

          <button
            className="save-btn"
            onClick={saveAttendance}
            disabled={loading || isDateHoliday}
            title={isDateHoliday ? "Attendance is locked for declared Holiday" : ""}
          >
            {loading ? "Updating..." : "Update Attendance"}
          </button>

          <button
            className="download-master-btn"
            onClick={downloadMasterCSV}
            title="Download Complete Master Attendance Sheet"
          >
            📊 Download Master Sheet
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
                          title="Click to view complete student profile"
                          onClick={() => {
                            const studentQuery =
                              student.register_number ||
                              student.roll_number ||
                              student.student_id ||
                              student.name ||
                              "";

                            navigate(
                              `/admin/students/${encodeURIComponent(
                                studentQuery
                              )}`
                            );
                          }}
                        >
                          {name}
                        </button>
                      </td>
                      <td>{domain}</td>
                      <td>
                        {isDateHoliday ? (
                          <span
                            style={{
                              background: "#fef3c7",
                              color: "#d97706",
                              padding: "6px 12px",
                              borderRadius: "6px",
                              fontWeight: "600",
                              fontSize: "13px",
                              display: "inline-block",
                            }}
                          >
                            🎉 Holiday
                          </span>
                        ) : (
                          <div className="status-buttons">
                            <button
                              className={
                                attendance[studentId] === "P"
                                  ? "status present selected"
                                  : "status present"
                              }
                              onClick={() => markAttendance(studentId, "P")}
                              disabled={isDateHoliday}
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
                              disabled={isDateHoliday}
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
                              disabled={isDateHoliday}
                            >
                              OD
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* DECLARE HOLIDAY MODAL */}
      {showHolidayModal && (
        <div className="modal-overlay">
          <div className="student-modal">
            <div className="modal-header">
              <h2>🎉 Declare Holiday ({date})</h2>
              <button onClick={() => setShowHolidayModal(false)}>×</button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <p style={{ color: "#64748b", marginBottom: "15px", fontSize: "14px" }}>
                Select or enter the reason for declaring a holiday for all students on this date:
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "15px" }}>
                {presetReasons.map((preset) => (
                  <button
                    key={preset}
                    className="preset-reason-btn"
                    style={{
                      padding: "7px 12px",
                      borderRadius: "20px",
                      border: "1px solid #cbd5e1",
                      background: holidayReasonInput === preset ? "#2563eb" : "#f8fafc",
                      color: holidayReasonInput === preset ? "white" : "#334155",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "500",
                    }}
                    onClick={() => {
                      setHolidayReasonInput(preset);
                      confirmDeclareHoliday(preset);
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "14px" }}>
                Custom Holiday Reason:
              </label>

              <input
                type="text"
                placeholder="e.g. Onam Celebration, Special Event..."
                value={holidayReasonInput}
                onChange={(e) => setHolidayReasonInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyRight: "flex-end", gap: "10px" }}>
              <button
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#f1f5f9",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
                onClick={() => setShowHolidayModal(false)}
              >
                Cancel
              </button>

              <button
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#d97706",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
                onClick={() => confirmDeclareHoliday(holidayReasonInput)}
              >
                Confirm Holiday
              </button>
            </div>
          </div>
        </div>
      )}

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