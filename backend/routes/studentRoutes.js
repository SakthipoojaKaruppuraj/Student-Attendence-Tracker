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
    fileSize: 100 * 1024 * 1024, // 100 MB
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

const nameAliases = [
  "Student Name", "StudentName", "Name", "Student", "Name of Student",
  "Name of the Student", "Student_Name", "FullName", "Full Name"
];
const regAliases = [
  "Register Number", "RegisterNo", "Reg No", "Reg.No", "Register No",
  "Registration Number", "Reg_No", "RegNo.", "Register_No", "Registration No"
];
const rollAliases = [
  "Roll Number", "RollNo", "Roll No", "Roll.No", "Roll_Number",
  "Roll", "RollNo.", "Roll_No"
];
const deptAliases = [
  "Department", "Dept", "Branch", "Degree & Branch", "Course"
];
const secAliases = [
  "Section", "Sec", "Sec."
];
const genderAliases = [
  "Gender", "Sex"
];
const kiteEmailAliases = [
  "KITE Email ID", "KITE Email", "Email ID", "Email", "Official Email",
  "Mail ID", "KITE Email Address"
];
const soiEmailAliases = [
  "SoI Email ID", "SoI Email", "SOI Email ID", "SOI Email"
];
const verticalAliases = [
  "SoI Lab Vertical", "Lab Vertical", "Vertical", "Domain", "Lab",
  "School Choosed", "School", "Lab / Vertical"
];
const remarkAliases = [
  "Remarks", "Remark", "Notes", "Note"
];
const yearAliases = [
  "Year", "Student Year", "Academic Year", "Year of Study"
];

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

function parseSheetRowsSmart(worksheet) {
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  if (!rawRows || !rawRows.length) return [];

  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(rawRows.length, 6); i++) {
    const row = rawRows[i].map((c) =>
      String(c).toLowerCase().replace(/[^a-z0-9]/g, "")
    );
    const matchesHeader = row.some(
      (cell) =>
        cell.includes("studentname") ||
        cell.includes("registernumber") ||
        cell.includes("rollnumber") ||
        cell.includes("regno") ||
        cell.includes("rollno") ||
        cell === "name" ||
        cell === "student" ||
        cell === "department" ||
        cell === "dept"
    );
    if (matchesHeader) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex !== -1) {
    const headers = rawRows[headerRowIndex].map((h) => String(h).trim());
    const dataRows = [];
    for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
      const rowArr = rawRows[i];
      if (!rowArr || !rowArr.length) continue;
      const rowObj = {};
      headers.forEach((h, colIdx) => {
        if (h) rowObj[h] = rowArr[colIdx] !== undefined ? String(rowArr[colIdx]).trim() : "";
      });
      dataRows.push(rowObj);
    }
    return dataRows;
  }

  // Headerless mode: Auto-detect positional columns by cell pattern
  const positionalRows = [];
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || !row.length) continue;

    const strCells = row.map((c) => String(c).trim());
    if (strCells.every((c) => c === "")) continue;

    let s_no = "", student_name = "", register_number = "", roll_number = "", department = "";
    let section = "", mobile = "", kite_email = "", soi_email = "", soi_lab_vertical = "", remarks = "";

    strCells.forEach((val, idx) => {
      if (!val) return;
      if (val.includes("@soi")) {
        soi_email = val;
      } else if (val.includes("@kgkite.ac.in") || val.includes("@")) {
        kite_email = val;
      } else if (/^\d{10,12}[A-Za-z0-9]+$/i.test(val) || /^7117\d+/i.test(val)) {
        register_number = val;
      } else if (/^\d{2}[A-Z]{3,4}\d+$/i.test(val)) {
        roll_number = val;
      } else if (/B\.Tech|B\.E|B\.Sc|M\.Tech|M\.E|AI & DS|CSE|ECE|IT|MECH|CSBS|CYS/i.test(val)) {
        department = val;
      } else if (/^AD -|^BW -|^CD -|^CS -|^DMA -|^EI -|^FW -|^SOAL$|^SOP$/i.test(val)) {
        soi_lab_vertical = val;
      } else if (/^[A-C]$|^Only one section$/i.test(val)) {
        section = val;
      } else if (!student_name && /^[A-Za-z\s\.\']{2,40}$/.test(val) && !/present|absent|total|sunday|add on/i.test(val)) {
        student_name = val;
      } else if (idx === 0 && /^\d+$/.test(val)) {
        s_no = val;
      }
    });

    if (student_name || register_number || roll_number) {
      positionalRows.push({
        "S.No.": s_no,
        "Student Name": student_name,
        "Register Number": register_number,
        "Roll Number": roll_number,
        "Department": department,
        "Section": section,
        "KITE Email ID": kite_email,
        "SoI Email ID": soi_email,
        "SoI Lab Vertical": soi_lab_vertical,
        "Remarks": remarks
      });
    }
  }
  return positionalRows;
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
         READ EXCEL / CSV (ALL SHEETS WITH SMART PARSING)
      --------------------------------------------- */

      const workbook = XLSX.readFile(filePath);
      let allRows = [];

      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) return;
        const rows = parseSheetRowsSmart(worksheet);
        allRows.push(...rows);
      });

      if (!allRows.length) {
        return res.status(400).json({
          success: false,
          message: "The uploaded file is empty.",
        });
      }

      /* ---------------------------------------------
         PARSE & CLEAN STUDENT DATA
      --------------------------------------------- */

      const parsedStudents = allRows
        .map((row, index) => {
          const student_name = findColumnValue(row, nameAliases);
          const register_number = findColumnValue(row, regAliases);
          const roll_number = findColumnValue(row, rollAliases);
          const department = findColumnValue(row, deptAliases);
          const section = findColumnValue(row, secAliases);
          const gender = findColumnValue(row, genderAliases);
          const kite_email = findColumnValue(row, kiteEmailAliases);
          const soi_email = findColumnValue(row, soiEmailAliases);
          const soi_lab_vertical = findColumnValue(row, verticalAliases);
          const remarks = findColumnValue(row, remarkAliases);
          const yearRaw = findColumnValue(row, yearAliases);
          let year = "3rd Year";
          if (yearRaw) {
            if (yearRaw.includes("3") || yearRaw.toLowerCase().includes("third")) {
              year = "3rd Year";
            } else {
              year = yearRaw;
            }
          }

          const s_no =
            findColumnValue(row, [
              "S.No.", "SNo", "S.No", "Sl No", "Serial No", "S. No.", "S No"
            ]) || String(index + 1);

          // Strict Validation: Ignore empty, summary, or unknown student rows
          const invalidSummaryRegex =
            /no\s*\.\s*of|present|absent|total|working\s*days|summary|count|sl\s*no|s\.\s*no|unknown/i;

          if (!student_name || student_name.trim().length < 2) {
            return null; // A valid student record MUST have a real student name
          }

          if (
            invalidSummaryRegex.test(student_name) ||
            invalidSummaryRegex.test(register_number) ||
            invalidSummaryRegex.test(roll_number)
          ) {
            return null; // Ignore footer/summary rows
          }

          const finalRegNo = register_number || roll_number || "";
          const finalRollNo = roll_number || register_number || finalRegNo;

          return {
            s_no,
            student_name: student_name.trim(),
            register_number: finalRegNo.trim(),
            roll_number: finalRollNo.trim(),
            department: department || "General",
            section: section ? section.trim() : "",
            gender: gender ? gender.trim() : "",
            kite_email: kite_email ? kite_email.trim() : "",
            soi_email: soi_email ? soi_email.trim() : "",
            soi_lab_vertical: soi_lab_vertical ? soi_lab_vertical.trim() : "",
            remarks: remarks ? remarks.trim() : "",
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

      // Deduplicate parsed students within the current uploaded file
      const uniqueUploadedStudents = [];
      parsedStudents.forEach((st) => {
        const regKey = (st.register_number || "").toLowerCase().trim();
        const rollKey = (st.roll_number || "").toLowerCase().trim();
        const nameKey = (st.student_name || "").toLowerCase().trim();

        const existing = uniqueUploadedStudents.find((u) => {
          const uReg = (u.register_number || "").toLowerCase().trim();
          const uRoll = (u.roll_number || "").toLowerCase().trim();
          const uName = (u.student_name || "").toLowerCase().trim();
          return (
            (regKey && uReg && regKey === uReg) ||
            (rollKey && uRoll && rollKey === uRoll) ||
            (nameKey && uName && nameKey === uName)
          );
        });

        if (existing) {
          Object.keys(st).forEach((key) => {
            if (st[key] && !existing[key]) {
              existing[key] = st[key];
            }
          });
        } else {
          uniqueUploadedStudents.push(st);
        }
      });

      const dataDir = path.join(__dirname, "../data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      /* ---------------------------------------------
         SAVE / MERGE MASTER STUDENT DATA
      --------------------------------------------- */

      const masterFilePath = path.join(dataDir, "master_student_data.json");
      let existingStudents = [];
      let existingHistory = [];

      if (fs.existsSync(masterFilePath)) {
        try {
          const existingData = JSON.parse(
            fs.readFileSync(masterFilePath, "utf8")
          );
          existingStudents = existingData.students || [];
          existingHistory = existingData.history || [];
        } catch (e) {
          console.error("Error reading existing master_student_data.json:", e);
        }
      }

      // Check upload mode (replace/overwrite vs merge/append)
      const uploadMode = (req.body.mode || req.query.mode || "replace").toLowerCase();
      let mergedStudents = [];

      if (uploadMode === "replace" || uploadMode === "overwrite") {
        // Clear old data and strictly use new uploaded sheet data
        mergedStudents = [...uniqueUploadedStudents];
      } else {
        // Merge unique uploaded students into existing master list
        mergedStudents = [...existingStudents];
        uniqueUploadedStudents.forEach((newStudent) => {
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
            const cleanUpdates = {};
            Object.keys(newStudent).forEach((key) => {
              if (
                newStudent[key] !== "" &&
                newStudent[key] !== null &&
                newStudent[key] !== undefined
              ) {
                cleanUpdates[key] = newStudent[key];
              }
            });
            mergedStudents[existingIndex] = {
              ...mergedStudents[existingIndex],
              ...cleanUpdates,
            };
          } else {
            mergedStudents.push(newStudent);
          }
        });
      }

      // Ensure sequential s_no index
      const students = mergedStudents.map((s, idx) => ({
        ...s,
        s_no: String(idx + 1),
      }));

      // History item
      const newHistoryItem = {
        id: `file_${Date.now()}`,
        originalFileName: req.file.originalname,
        uploadedAt: new Date().toISOString(),
        totalStudents: uniqueUploadedStudents.length,
        mode: uploadMode,
        sheets: workbook.SheetNames || [],
      };

      const history =
        uploadMode === "replace" || uploadMode === "overwrite"
          ? [newHistoryItem]
          : [newHistoryItem, ...existingHistory];

      fs.writeFileSync(
        masterFilePath,
        JSON.stringify(
          {
            uploadedAt: new Date().toISOString(),
            originalFileName: req.file.originalname,
            totalStudents: students.length,
            history,
            students,
          },
          null,
          2
        )
      );

      /* ---------------------------------------------
         EXTRACT & MERGE ATTENDANCE DATES FROM FILE
      --------------------------------------------- */

      const extractedAttendanceCount = extractAndSaveAttendanceFromRows(allRows);

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
    const { domain } = req.query;

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

    let students = data.students || [];

    if (domain && domain !== "All" && domain !== "all") {
      const cleanDomain = domain.toLowerCase().trim();
      students = students.filter((s) => {
        const sVertical = (s.soi_lab_vertical || "").toLowerCase().trim();
        const sDept = (s.department || "").toLowerCase().trim();
        return (
          sVertical.includes(cleanDomain) ||
          sDept.includes(cleanDomain) ||
          cleanDomain.includes(sVertical) ||
          cleanDomain.includes(sDept)
        );
      });
    }

    return res.status(200).json({
      success: true,
      students,
      totalStudents: students.length,
      uploadedAt: data.uploadedAt || null,
      originalFileName: data.originalFileName || null,
      history: data.history || [],
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
   DELETE /api/students (CLEAR ALL DATA)
========================================================= */

router.delete("/", (req, res) => {
  try {
    const masterFilePath = path.join(
      __dirname,
      "../data/master_student_data.json"
    );

    if (fs.existsSync(masterFilePath)) {
      fs.writeFileSync(
        masterFilePath,
        JSON.stringify(
          {
            uploadedAt: null,
            originalFileName: null,
            totalStudents: 0,
            history: [],
            students: [],
          },
          null,
          2
        )
      );
    }

    return res.status(200).json({
      success: true,
      message: "All student data cleared successfully.",
    });
  } catch (error) {
    console.error("Clear students error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear student data.",
    });
  }
});

/* =========================================================
   DELETE /api/students/history/:id
========================================================= */

router.delete("/history/:id", (req, res) => {
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
    let history = data.history || [];
    history = history.filter((h) => h.id !== id);

    data.history = history;
    if (history.length === 0) {
      data.students = [];
      data.totalStudents = 0;
      data.originalFileName = null;
      data.uploadedAt = null;
    } else {
      data.originalFileName = history[0].originalFileName;
      data.uploadedAt = history[0].uploadedAt;
    }

    fs.writeFileSync(masterFilePath, JSON.stringify(data, null, 2));

    return res.status(200).json({
      success: true,
      message: "Selected file data sheet record removed.",
      history: data.history,
      totalStudents: data.students.length,
    });
  } catch (error) {
    console.error("Delete history item error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove sheet record.",
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