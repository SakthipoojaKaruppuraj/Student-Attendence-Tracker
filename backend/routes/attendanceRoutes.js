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
        const headers = lines[0].split(",").map(h => h.trim());

        existingRows = lines.slice(1).map((line) => {
          const values = line.split(",").map(v => v.trim());

          const row = {};

          headers.forEach((header, index) => {
            row[header] = values[index] || "";
          });

          return row;
        });
      }
    }

    // Remove previous attendance for this date
    existingRows = existingRows.filter(
      (row) => row.date !== date
    );

    // Add new attendance
    attendance.forEach((student) => {
      existingRows.push({
        date,
        student_id: student.student_id,
        student_name: student.student_name,
        year: student.year,
        status: student.status,
      });
    });

    // CSV header
    const csvLines = [
      "date,student_id,student_name,year,status",
    ];

    existingRows.forEach((row) => {
      csvLines.push(
        [
          row.date || "",
          row.student_id || "",
          row.student_name || "",
          row.year || "",
          row.status || "",
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