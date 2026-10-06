const express = require("express");
const prisma = require("../config/db");

const router = express.Router();

// --------------------------------------------------
// GET STUDENTS
// --------------------------------------------------

router.get("/students", async (req, res) => {
  try {
    const { domain } = req.query;

    let rawStudents = await prisma.student.findMany({
      orderBy: { studentName: "asc" },
    });

    if (domain && domain !== "All" && domain !== "all") {
      const cleanDomain = domain.toLowerCase().trim();
      rawStudents = rawStudents.filter((s) => {
        const sVertical = (s.soiLabVertical || "").toLowerCase().trim();
        const sDept = (s.department || "").toLowerCase().trim();
        return (
          sVertical.includes(cleanDomain) ||
          sDept.includes(cleanDomain) ||
          cleanDomain.includes(sVertical) ||
          cleanDomain.includes(sDept)
        );
      });
    }

    const students = rawStudents.map((student) => ({
      student_id: student.rollNumber,
      name: student.studentName,
      year: student.year || "3rd Year",
      domain: student.soiLabVertical || student.department || "",
    }));

    return res.json(students);
  } catch (err) {
    console.error("Error reading students from PostgreSQL:", err);
    return res.status(500).json({ message: "Unable to load students" });
  }
});

// --------------------------------------------------
// GET MASTER ATTENDANCE REPORT
// --------------------------------------------------

router.get("/master-report", async (req, res) => {
  try {
    const { domain } = req.query;

    let masterStudents = await prisma.student.findMany({
      orderBy: { studentName: "asc" },
    });

    if (domain && domain !== "All" && domain !== "all") {
      const cleanDomain = domain.toLowerCase().trim();
      masterStudents = masterStudents.filter((s) => {
        const sVertical = (s.soiLabVertical || "").toLowerCase().trim();
        const sDept = (s.department || "").toLowerCase().trim();
        return (
          sVertical.includes(cleanDomain) ||
          sDept.includes(cleanDomain) ||
          cleanDomain.includes(sVertical) ||
          cleanDomain.includes(sDept)
        );
      });
    }

    const attendanceRecords = await prisma.attendanceRecord.findMany();

    // Unique sorted dates
    const dates = [
      ...new Set(attendanceRecords.map((r) => r.date).filter(Boolean)),
    ].sort();

    // Map student_id -> { date -> record }
    const attendanceMap = {};
    attendanceRecords.forEach((r) => {
      if (!attendanceMap[r.studentId]) {
        attendanceMap[r.studentId] = {};
      }
      attendanceMap[r.studentId][r.date] = r;
    });

    const reportRows = masterStudents.map((student, index) => {
      const studentId = student.rollNumber;

      const rowData = {
        s_no: student.sNo || String(index + 1),
        student_name: student.studentName || "",
        register_number: student.registerNumber || "",
        roll_number: student.rollNumber || "",
        department: student.department || "",
        section: student.section || "",
        gender: student.gender || "",
        year: student.year || "",
        soi_lab_vertical: student.soiLabVertical || "",
        kite_email: student.kiteEmail || "",
        soi_email: student.soiEmail || "",
        remarks: student.remarks || "",
      };

      dates.forEach((d) => {
        const record = attendanceMap[studentId]?.[d];

        let statusText = "-";
        if (record) {
          if (record.status === "H" || (record.status && record.status.startsWith("H:"))) {
            const reason = record.remarks || (record.status.includes(":") ? record.status.split(":")[1].trim() : "");
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

router.get("/", async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ message: "Date is required" });
  }

  try {
    const attendance = await prisma.attendanceRecord.findMany({
      where: { date },
    });

    const formatted = attendance.map((r) => ({
      date: r.date,
      student_id: r.studentId,
      student_name: r.studentName,
      year: r.year,
      status: r.status,
      remarks: r.remarks || "",
    }));

    return res.json(formatted);
  } catch (error) {
    console.error("Error reading attendance:", error);
    return res.status(500).json({ message: "Unable to read attendance" });
  }
});

// --------------------------------------------------
// SAVE ATTENDANCE
// --------------------------------------------------

router.post("/", async (req, res) => {
  const { date, attendance } = req.body;

  if (!date || !Array.isArray(attendance)) {
    return res.status(400).json({ message: "Invalid attendance data" });
  }

  try {
    for (const student of attendance) {
      if (!student.student_id) continue;

      // Ensure student exists in DB or create stub
      const studentExists = await prisma.student.findUnique({
        where: { rollNumber: student.student_id },
      });

      if (!studentExists) {
        await prisma.student.create({
          data: {
            rollNumber: student.student_id,
            studentName: student.student_name || "Unknown",
            department: "General",
            year: student.year || "3rd Year",
          },
        });
      }

      await prisma.attendanceRecord.upsert({
        where: {
          date_studentId: {
            date,
            studentId: student.student_id,
          },
        },
        update: {
          status: student.status,
          remarks: student.remarks || student.reason || null,
          studentName: student.student_name || "Unknown",
          year: student.year || "3rd Year",
        },
        create: {
          date,
          studentId: student.student_id,
          studentName: student.student_name || "Unknown",
          year: student.year || "3rd Year",
          status: student.status,
          remarks: student.remarks || student.reason || null,
        },
      });
    }

    return res.json({ message: "Attendance updated successfully" });
  } catch (error) {
    console.error("Save attendance error:", error);
    return res.status(500).json({ message: "Unable to save attendance" });
  }
});

module.exports = router;