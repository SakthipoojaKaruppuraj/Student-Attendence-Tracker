const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const prisma = require("../config/db");

const router = express.Router();

const uploadDir = path.join(__dirname, "../uploads/student-data");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    cb(null, `student_data_${Date.now()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".xlsx", ".xls", ".csv"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only XLSX, XLS and CSV files are allowed."));
    }
  },
});

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
const deptAliases = ["Department", "Dept", "Branch", "Degree & Branch", "Course"];
const secAliases = ["Section", "Sec", "Sec."];
const genderAliases = ["Gender", "Sex"];
const kiteEmailAliases = ["KITE Email ID", "KITE Email", "Email ID", "Email", "Official Email", "Mail ID"];
const soiEmailAliases = ["SoI Email ID", "SoI Email", "SOI Email ID", "SOI Email"];
const verticalAliases = ["SoI Lab Vertical", "Lab Vertical", "Vertical", "Domain", "Lab", "School Choosed", "School"];
const remarkAliases = ["Remarks", "Remark", "Notes", "Note"];
const yearAliases = ["Year", "Student Year", "Academic Year", "Year of Study"];

function cleanValue(value) {
  if (value === undefined || value === null) return "";
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
        cell === "department"
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

  const positionalRows = [];
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || !row.length) continue;
    const strCells = row.map((c) => String(c).trim());
    if (strCells.every((c) => c === "")) continue;

    let s_no = "", student_name = "", register_number = "", roll_number = "", department = "";
    let section = "", kite_email = "", soi_email = "", soi_lab_vertical = "", remarks = "";

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
      } else if (/B\.Tech|B\.E|B\.Sc|AI & DS|CSE|ECE|IT|MECH|CSBS|CYS/i.test(val)) {
        department = val;
      } else if (/^AD -|^BW -|^CD -|^CS -|^DMA -|^EI -|^FW -|^SOAL$|^SOP$/i.test(val)) {
        soi_lab_vertical = val;
      } else if (/^[A-C]$|^Only one section$/i.test(val)) {
        section = val;
      } else if (!student_name && /^[A-Za-z\s\.\']{2,40}$/.test(val) && !/present|absent|total|sunday/i.test(val)) {
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

// --------------------------------------------------
// POST /api/students/upload
// --------------------------------------------------

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a student data file.",
      });
    }

    const workbook = XLSX.readFile(req.file.path);
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

        const s_no = findColumnValue(row, ["S.No.", "SNo", "S.No", "Sl No"]) || String(index + 1);
        const invalidRegex = /no\s*\.\s*of|present|absent|total|summary|count|unknown/i;

        if (!student_name || student_name.trim().length < 2 || invalidRegex.test(student_name)) {
          return null;
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
        message: "No valid student records found in the uploaded file.",
      });
    }

    const uploadMode = (req.body.mode || req.query.mode || "replace").toLowerCase();

    if (uploadMode === "replace" || uploadMode === "overwrite") {
      await prisma.student.deleteMany();
    }

    const bcrypt = require("bcryptjs");
    const defaultHashedPassword = await bcrypt.hash("Kitesoi@123", 10);

    for (const st of parsedStudents) {
      if (!st.roll_number) continue;

      await prisma.student.upsert({
        where: { rollNumber: st.roll_number },
        update: {
          studentName: st.student_name,
          registerNumber: st.register_number || null,
          department: st.department,
          section: st.section || null,
          gender: st.gender || null,
          kiteEmail: st.kite_email || null,
          soiEmail: st.soi_email || null,
          soiLabVertical: st.soi_lab_vertical || null,
          remarks: st.remarks || null,
          year: st.year,
        },
        create: {
          sNo: st.s_no,
          rollNumber: st.roll_number,
          studentName: st.student_name,
          registerNumber: st.register_number || null,
          department: st.department,
          section: st.section || null,
          gender: st.gender || null,
          kiteEmail: st.kite_email || null,
          soiEmail: st.soi_email || null,
          soiLabVertical: st.soi_lab_vertical || null,
          remarks: st.remarks || null,
          year: st.year,
          password: defaultHashedPassword,
          isDefaultPassword: true,
        },
      });
    }

    await prisma.masterDataUploadHistory.create({
      data: {
        originalFileName: req.file.originalname,
        totalStudents: parsedStudents.length,
        mode: uploadMode,
        sheets: JSON.stringify(workbook.SheetNames || []),
      },
    });

    const students = await prisma.student.findMany({
      orderBy: { studentName: "asc" },
    });

    const formattedStudents = students.map((s, idx) => ({
      s_no: s.sNo || String(idx + 1),
      student_name: s.studentName,
      register_number: s.registerNumber || "",
      roll_number: s.rollNumber,
      department: s.department,
      section: s.section || "",
      gender: s.gender || "",
      kite_email: s.kiteEmail || "",
      soi_email: s.soiEmail || "",
      soi_lab_vertical: s.soiLabVertical || "",
      remarks: s.remarks || "",
      year: s.year,
    }));

    return res.status(200).json({
      success: true,
      message: "Student data uploaded successfully.",
      totalStudents: formattedStudents.length,
      students: formattedStudents,
    });
  } catch (error) {
    console.error("Student upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process the uploaded file.",
      error: error.message,
    });
  }
});

// --------------------------------------------------
// GET /api/students
// --------------------------------------------------

router.get("/", async (req, res) => {
  try {
    const { domain } = req.query;
    let students = await prisma.student.findMany({
      orderBy: { studentName: "asc" },
    });

    if (domain && domain !== "All" && domain !== "all") {
      const cleanDomain = domain.toLowerCase().trim();
      students = students.filter((s) => {
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

    const formatted = students.map((s, idx) => ({
      s_no: s.sNo || String(idx + 1),
      student_name: s.studentName,
      register_number: s.registerNumber || "",
      roll_number: s.rollNumber,
      department: s.department,
      section: s.section || "",
      gender: s.gender || "",
      kite_email: s.kiteEmail || "",
      soi_email: s.soiEmail || "",
      soi_lab_vertical: s.soiLabVertical || "",
      remarks: s.remarks || "",
      year: s.year,
    }));

    const history = await prisma.masterDataUploadHistory.findMany({
      orderBy: { uploadedAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      students: formatted,
      totalStudents: formatted.length,
      history: history.map((h) => ({
        id: h.id,
        originalFileName: h.originalFileName,
        uploadedAt: h.uploadedAt.toISOString(),
        totalStudents: h.totalStudents,
        mode: h.mode,
        sheets: h.sheets ? JSON.parse(h.sheets) : [],
      })),
    });
  } catch (error) {
    console.error("Get students error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch students.",
    });
  }
});

// --------------------------------------------------
// DELETE /api/students
// --------------------------------------------------

router.delete("/", async (req, res) => {
  try {
    await prisma.student.deleteMany();
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

module.exports = router;