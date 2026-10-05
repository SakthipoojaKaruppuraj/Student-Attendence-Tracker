const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const router = express.Router();

/* =========================================================
   UPLOAD CONFIGURATION
========================================================= */

const uploadDir = path.join(__dirname, "../uploads/student-data");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);

    cb(
      null,
      `student_data_${Date.now()}${extension}`
    );
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = [
    ".xlsx",
    ".xls",
    ".csv",
  ];

  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  if (allowedExtensions.includes(extension)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only XLSX, XLS and CSV files are allowed."
      )
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

/* =========================================================
   REQUIRED STUDENT COLUMNS
========================================================= */

const requiredColumns = [
  "Student Name",
  "Register Number",
  "Roll Number",
  "Department",
];

/* =========================================================
   HELPER
========================================================= */

function cleanValue(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
}

function findColumnValue(row, possibleNames) {
  if (!row) return "";
  const keys = Object.keys(row);
  for (const name of possibleNames) {
    const target = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const key of keys) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (normalizedKey === target) {
        return cleanValue(row[key]);
      }
    }
  }
  return "";
}

const monthMap = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
};

function parseDateHeader(header) {
  if (!header || typeof header !== "string") return null;
  const str = header.trim();

  const matchNamed = str.match(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\s*(\d{1,2})[\-\/\s]([A-Za-z]{3})(?:[\-\/\s](\d{2,4}))?$/i);
  if (matchNamed) {
    const day = String(matchNamed[1]).padStart(2, "0");
    const month = monthMap[matchNamed[2].toLowerCase()];
    let year = matchNamed[3];
    if (!year) {
      year = "2026";
    } else if (year.length === 2) {
      year = "20" + year;
    }
    if (month) return `${year}-${month}-${day}`;
  }

  const matchYMD = str.match(/^(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})$/);
  if (matchYMD) {
    return `${matchYMD[1]}-${String(matchYMD[2]).padStart(2, "0")}-${String(matchYMD[3]).padStart(2, "0")}`;
  }

  const matchDMY = str.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})$/);
  if (matchDMY) {
    return `${matchDMY[3]}-${String(matchDMY[2]).padStart(2, "0")}-${String(matchDMY[1]).padStart(2, "0")}`;
  }

  return null;
}

function extractAndSaveAttendanceFromRows(rows) {
  if (!rows || !rows.length) return 0;

  const attendanceFile = path.join(__dirname, "../data/attendance.csv");

  let existingRows = [];
  if (fs.existsSync(attendanceFile)) {
    const fileContent = fs.readFileSync(attendanceFile, "utf8");
    const lines = fileContent.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length > 1) {
      const headers = lines[0].split(",").map((h) => h.trim());
      existingRows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const row = {};
        headers.forEach((h, i) => {
          row[h] = values[i] || "";
        });
        return row;
      });
    }
  }

  const firstRow = rows[0];
  const dateColumns = [];
  Object.keys(firstRow).forEach((key) => {
    const parsedDate = parseDateHeader(key);
    if (parsedDate) {
      dateColumns.push({ colKey: key, date: parsedDate });
    }
  });

  if (!dateColumns.length) {
    return 0;
  }

  let extractedCount = 0;

  rows.forEach((row, index) => {
    const student_name = findColumnValue(row, [
      "Student Name", "StudentName", "Name", "Student"
    ]) || "Unknown";

    const register_number = findColumnValue(row, [
      "Register Number", "RegisterNo", "Reg No", "Reg.No", "Register No"
    ]);

    const roll_number = findColumnValue(row, [
      "Roll Number", "RollNo", "Roll No", "Roll.No", "Roll_Number", "Roll"
    ]);

    const year = findColumnValue(row, ["Year", "Student Year"]) || "3rd Year";
    const student_id = roll_number || register_number || `STU${String(index + 1).padStart(3, "0")}`;

    dateColumns.forEach(({ colKey, date }) => {
      const rawVal = cleanValue(row[colKey]);
      if (!rawVal) return;

      let status = "P";
      let remarks = "";

      const lowerVal = rawVal.toLowerCase();
      if (lowerVal === "p" || lowerVal === "present") {
        status = "P";
      } else if (lowerVal === "a" || lowerVal === "ab" || lowerVal === "absent") {
        status = "A";
      } else if (lowerVal === "od" || lowerVal === "on duty" || lowerVal === "onduty") {
        status = "OD";
      } else if (lowerVal === "l" || lowerVal === "late") {
        status = "L";
      } else {
        status = "H";
        remarks = rawVal;
      }

      const existingIndex = existingRows.findIndex(
        (r) => r.date === date && String(r.student_id).trim() === String(student_id).trim()
      );

      const record = {
        date,
        student_id,
        student_name,
        year,
        status,
        remarks,
      };

      if (existingIndex !== -1) {
        existingRows[existingIndex] = record;
      } else {
        existingRows.push(record);
      }
      extractedCount++;
    });
  });

  const csvLines = ["date,student_id,student_name,year,status,remarks"];
  existingRows.forEach((r) => {
    csvLines.push(
      [
        r.date || "",
        r.student_id || "",
        r.student_name || "",
        r.year || "",
        r.status || "",
        r.remarks || "",
      ].join(",")
    );
  });

  const dataDir = path.join(__dirname, "../data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(attendanceFile, csvLines.join("\n"));
  return extractedCount;
}

/* =========================================================
   POST /api/students/upload
========================================================= */

router.post(
  "/upload",
  upload.single("file"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please upload a student data file.",
        });
      }

      const filePath = req.file.path;

      /* ---------------------------------------------
         READ EXCEL / CSV
      --------------------------------------------- */

      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
      });

      if (!rows.length) {
        return res.status(400).json({
          success: false,
          message: "The uploaded file is empty.",
        });
      }

      /* ---------------------------------------------
         PARSE & CLEAN STUDENT DATA
      --------------------------------------------- */

      const parsedStudents = rows
        .map((row, index) => {
          const student_name = findColumnValue(row, [
            "Student Name",
            "StudentName",
            "Name",
            "Student",
          ]);

          const register_number = findColumnValue(row, [
            "Register Number",
            "RegisterNo",
            "Reg No",
            "Reg.No",
            "Register No",
            "Registration Number",
          ]);

          const roll_number = findColumnValue(row, [
            "Roll Number",
            "RollNo",
            "Roll No",
            "Roll.No",
            "Roll_Number",
            "Roll",
          ]);

          const department = findColumnValue(row, [
            "Department",
            "Dept",
            "Branch",
          ]);

          const section = findColumnValue(row, ["Section", "Sec"]);
          const gender = findColumnValue(row, ["Gender", "Sex"]);
          const kite_email = findColumnValue(row, [
            "KITE Email ID",
            "KITE Email",
            "Email ID",
            "Email",
          ]);
          const soi_email = findColumnValue(row, [
            "SoI Email ID",
            "SoI Email",
          ]);
          const soi_lab_vertical = findColumnValue(row, [
            "SoI Lab Vertical",
            "Lab Vertical",
            "Vertical",
            "Domain",
          ]);
          const remarks = findColumnValue(row, ["Remarks", "Remark"]);
          const year =
            findColumnValue(row, ["Year", "Student Year"]) || "3rd Year";
          const s_no =
            findColumnValue(row, [
              "S.No.",
              "SNo",
              "S.No",
              "Sl No",
              "Serial No",
            ]) || String(index + 1);

          if (!student_name && !register_number && !roll_number) {
            return null; // Ignore blank/empty rows
          }

          const finalRegNo =
            register_number ||
            roll_number ||
            `STU${String(index + 1).padStart(3, "0")}`;
          const finalRollNo = roll_number || register_number || finalRegNo;

          return {
            s_no,
            student_name: student_name || "Unknown Student",
            register_number: finalRegNo,
            roll_number: finalRollNo,
            department: department || "General",
            section,
            gender,
            kite_email,
            soi_email,
            soi_lab_vertical,
            remarks,
            year,
          };
        })
        .filter(Boolean);

      if (!parsedStudents.length) {
        return res.status(400).json({
          success: false,
          message:
            "No valid student records found in the uploaded file.",
        });
      }

      const dataDir = path.join(
        __dirname,
        "../data"
      );

      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, {
          recursive: true,
        });
      }

      /* ---------------------------------------------
         SAVE / MERGE MASTER STUDENT DATA
      --------------------------------------------- */

      const masterFilePath = path.join(
        dataDir,
        "master_student_data.json"
      );

      let existingStudents = [];

      if (fs.existsSync(masterFilePath)) {
        try {
          const existingData = JSON.parse(
            fs.readFileSync(masterFilePath, "utf8")
          );
          existingStudents = existingData.students || [];
        } catch (e) {
          console.error("Error reading existing master_student_data.json:", e);
        }
      }

      // Merge new parsed students into existing master list
      const mergedStudents = [...existingStudents];

      parsedStudents.forEach((newStudent) => {
        const newReg = (newStudent.register_number || "").toLowerCase().trim();
        const newRoll = (newStudent.roll_number || "").toLowerCase().trim();
        const newName = (newStudent.student_name || "").toLowerCase().trim();

        const existingIndex = mergedStudents.findIndex((s) => {
          const sReg = (s.register_number || "").toLowerCase().trim();
          const sRoll = (s.roll_number || "").toLowerCase().trim();
          const sName = (s.student_name || "").toLowerCase().trim();

          return (
            (newReg && sReg && newReg === sReg) ||
            (newRoll && sRoll && newRoll === sRoll) ||
            (newName && sName && newName === sName)
          );
        });

        if (existingIndex !== -1) {
          // Update existing student with non-empty fields from new upload
          const cleanUpdates = {};
          Object.keys(newStudent).forEach((key) => {
            if (newStudent[key] !== "" && newStudent[key] !== null && newStudent[key] !== undefined) {
              cleanUpdates[key] = newStudent[key];
            }
          });
          mergedStudents[existingIndex] = {
            ...mergedStudents[existingIndex],
            ...cleanUpdates,
          };
        } else {
          // Append new student
          mergedStudents.push(newStudent);
        }
      });

      // Ensure sequential s_no index
      const students = mergedStudents.map((s, idx) => ({
        ...s,
        s_no: String(idx + 1),
      }));

      fs.writeFileSync(
        masterFilePath,
        JSON.stringify(
          {
            uploadedAt:
              new Date().toISOString(),

            originalFileName:
              req.file.originalname,

            totalStudents:
              students.length,

            students,
          },
          null,
          2
        )
      );

      /* ---------------------------------------------
         EXTRACT & MERGE ATTENDANCE DATES FROM FILE
      --------------------------------------------- */

      const extractedAttendanceCount = extractAndSaveAttendanceFromRows(rows);

      /* ---------------------------------------------
         RESPONSE
      --------------------------------------------- */

      return res.status(200).json({
        success: true,

        message:
          "Student data uploaded successfully.",

        totalStudents:
          students.length,

        yearSummary:
          students.reduce(
            (summary, student) => {
              const year =
                student.year ||
                "Unknown";

              summary[year] =
                (summary[year] || 0) + 1;

              return summary;
            },
            {}
          ),

        students,
      });
    } catch (error) {
      console.error(
        "Student upload error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to process the uploaded file.",
        error: error.message,
      });
    }
  }
);

/* =========================================================
   GET /api/students
========================================================= */

router.get("/", (req, res) => {
  try {
    const masterFilePath = path.join(
      __dirname,
      "../data/master_student_data.json"
    );

    if (!fs.existsSync(masterFilePath)) {
      return res.status(200).json({
        success: true,
        students: [],
        totalStudents: 0,
      });
    }

    const data = JSON.parse(
      fs.readFileSync(
        masterFilePath,
        "utf8"
      )
    );

    return res.status(200).json({
      success: true,
      students: data.students || [],
      totalStudents:
        data.students
          ? data.students.length
          : 0,
      uploadedAt:
        data.uploadedAt || null,
      originalFileName:
        data.originalFileName || null,
    });
  } catch (error) {
    console.error(
      "Get students error:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to fetch students.",
    });
  }
});

/* =========================================================
   GET /api/students/:id
========================================================= */

router.get("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const masterFilePath = path.join(
      __dirname,
      "../data/master_student_data.json"
    );

    if (!fs.existsSync(masterFilePath)) {
      return res.status(404).json({
        success: false,
        message: "Student data file not found.",
      });
    }

    const data = JSON.parse(fs.readFileSync(masterFilePath, "utf8"));
    const students = data.students || [];

    const query = id.toLowerCase();

    const student = students.find(
      (s) =>
        (s.register_number || "").toLowerCase() === query ||
        (s.roll_number || "").toLowerCase() === query ||
        (s.s_no || "").toLowerCase() === query ||
        (s.student_name || "").toLowerCase() === query
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      student,
    });
  } catch (error) {
    console.error("Get single student error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student record.",
    });
  }
});

module.exports = router;