const express = require("express");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const router = express.Router();

const studentsFile = path.join(
  __dirname,
  "../data/students.csv"
);

const attendanceFile = path.join(
  __dirname,
  "../data/attendance.csv"
);

// --------------------------------------------------
// GET STUDENTS
// --------------------------------------------------

router.get("/students", (req, res) => {
  const masterFilePath = path.join(__dirname, "../data/master_student_data.json");

  if (fs.existsSync(masterFilePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(masterFilePath, "utf8"));

      const students = (data.students || []).map((student) => ({
        student_id:
          student.roll_number ||
          student.register_number ||
          student.s_no,

        name: student.student_name,

        year: student.year || "3rd Year",

        domain:
          student.soi_lab_vertical ||
          student.department ||
          "",
      }));

      return res.json(students);
    } catch (err) {
      console.error("Error reading master_student_data.json:", err);
    }
  }

  if (!fs.existsSync(studentsFile)) {
    return res.json([]);
  }

  const students = [];

  fs.createReadStream(studentsFile)
    .pipe(csv())
    .on("data", (row) => {
      students.push(row);
    })
    .on("end", () => {
      res.json(students);
    })
    .on("error", (error) => {
      console.error("Error reading students CSV:", error);

      res.status(500).json({
        message: "Unable to read students CSV",
      });
    });
});

// --------------------------------------------------
// GET MASTER ATTENDANCE REPORT
// --------------------------------------------------

router.get("/master-report", (req, res) => {
  try {
    const masterFilePath = path.join(
      __dirname,
      "../data/master_student_data.json"
    );

    let masterStudents = [];

    if (fs.existsSync(masterFilePath)) {
      const data = JSON.parse(
        fs.readFileSync(masterFilePath, "utf8")
      );
      masterStudents = data.students || [];
    } else if (fs.existsSync(studentsFile)) {
      const fileContent = fs.readFileSync(studentsFile, "utf8");
      const lines = fileContent.split(/\r?\n/).filter((l) => l.trim() !== "");
      if (lines.length > 1) {
        const headers = lines[0].split(",").map((h) => h.trim());
        masterStudents = lines.slice(1).map((line, idx) => {
          const values = line.split(",").map((v) => v.trim());
          return {
            s_no: String(idx + 1),
            student_name: values[1] || "",
            register_number: values[0] || "",
            roll_number: values[0] || "",
            department: values[3] || "",
            year: values[2] || "3rd Year",
          };
        });
      }
    }

    let attendanceRecords = [];

    if (fs.existsSync(attendanceFile)) {
      const fileContent = fs.readFileSync(attendanceFile, "utf8");
      const lines = fileContent.split(/\r?\n/).filter((l) => l.trim() !== "");
      if (lines.length > 1) {
        const headers = lines[0].split(",").map((h) => h.trim());
        attendanceRecords = lines.slice(1).map((line) => {
          const values = line.split(",").map((v) => v.trim());
          const row = {};
          headers.forEach((h, i) => {
            row[h] = values[i] || "";
          });
          return row;
        });
      }
    }

    // Unique sorted dates
    const dates = [
      ...new Set(
        attendanceRecords.map((r) => r.date).filter(Boolean)
      ),
    ].sort();

    // Map student_id -> { date -> { status, remarks } }
    const attendanceMap = {};
    attendanceRecords.forEach((r) => {
      if (!attendanceMap[r.student_id]) {
        attendanceMap[r.student_id] = {};
      }
      attendanceMap[r.student_id][r.date] = r;
    });

    const reportRows = masterStudents.map((student, index) => {
      const studentId =
        student.roll_number ||
        student.register_number ||
        student.s_no;

      const rowData = {
        s_no: student.s_no || String(index + 1),
        student_name: student.student_name || "",
        register_number: student.register_number || "",
        roll_number: student.roll_number || "",
        department: student.department || "",
        section: student.section || "",
        gender: student.gender || "",
        year: student.year || "",
        soi_lab_vertical: student.soi_lab_vertical || "",
        kite_email: student.kite_email || "",
        soi_email: student.soi_email || "",
        remarks: student.remarks || "",
      };

      dates.forEach((d) => {
        const record =
          attendanceMap[studentId]?.[d] ||
          attendanceMap[student.register_number]?.[d] ||
          attendanceMap[student.roll_number]?.[d];

        let statusText = "-";
        if (record) {
          if (record.status === "H" || (record.status && record.status.startsWith("H:"))) {
            const reason = record.remarks || record.reason || (record.status.includes(":") ? record.status.split(":")[1].trim() : "");
            statusText = reason ? `H (${reason})` : "Holiday";
          } else {
            statusText = record.status;
          }
        }

        rowData[d] = statusText;
      });

      return rowData;
    });

    return res.json({
      success: true,
      dates,
      students: reportRows,
    });
  } catch (error) {
    console.error("Master report error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate master attendance report.",
    });
  }
});

// --------------------------------------------------
// GET ATTENDANCE FOR A DATE
// --------------------------------------------------

router.get("/", (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({
      message: "Date is required",
    });
  }

  if (!fs.existsSync(attendanceFile)) {
    return res.json([]);
  }

  const attendance = [];

  fs.createReadStream(attendanceFile)
    .pipe(csv())
    .on("data", (row) => {
      if (row.date === date) {
        attendance.push(row);
      }
    })
    .on("end", () => {
      res.json(attendance);
    })
    .on("error", (error) => {
      console.error("Error reading attendance CSV:", error);

      res.status(500).json({
        message: "Unable to read attendance",
      });
    });
});

// --------------------------------------------------
// SAVE ATTENDANCE
// --------------------------------------------------

router.post("/", (req, res) => {
  const { date, attendance } = req.body;

  if (!date || !Array.isArray(attendance)) {
    return res.status(400).json({
      message: "Invalid attendance data",
    });
  }

  try {
    let existingRows = [];

    // Read existing attendance
    if (fs.existsSync(attendanceFile)) {
      const fileContent = fs.readFileSync(
        attendanceFile,
        "utf8"
      );

      const lines = fileContent
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "");

      if (lines.length > 1) {
        const headers = lines[0].split(",").map((h) => h.trim());

        existingRows = lines.slice(1).map((line) => {
          const values = line.split(",").map((v) => v.trim());

          const row = {};

          headers.forEach((header, index) => {
            row[header] = values[index] || "";
          });

          return row;
        });
      }
    }

    // Merge / append new attendance for this date
    attendance.forEach((student) => {
      const existingIndex = existingRows.findIndex(
        (row) =>
          row.date === date &&
          String(row.student_id || "").trim() === String(student.student_id || "").trim()
      );

      const record = {
        date,
        student_id: student.student_id,
        student_name: student.student_name,
        year: student.year,
        status: student.status,
        remarks: student.remarks || student.reason || "",
      };

      if (existingIndex !== -1) {
        existingRows[existingIndex] = record;
      } else {
        existingRows.push(record);
      }
    });

    // CSV header
    const csvLines = [
      "date,student_id,student_name,year,status,remarks",
    ];

    existingRows.forEach((row) => {
      csvLines.push(
        [
          row.date || "",
          row.student_id || "",
          row.student_name || "",
          row.year || "",
          row.status || "",
          row.remarks || "",
        ].join(",")
      );
    });

    fs.writeFileSync(
      attendanceFile,
      csvLines.join("\n")
    );

    res.json({
      message: "Attendance updated successfully",
    });

  } catch (error) {
    console.error("Save attendance error:", error);

    res.status(500).json({
      message: "Unable to save attendance",
    });
  }
});

module.exports = router;