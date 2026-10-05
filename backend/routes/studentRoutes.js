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

      const students = parsedStudents;


      /* ---------------------------------------------
         REMOVE OLD UPLOAD
      --------------------------------------------- */

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
         SAVE MASTER STUDENT DATA
      --------------------------------------------- */

      const masterFilePath = path.join(
        dataDir,
        "master_student_data.json"
      );

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
      message:
        "Failed to fetch student data.",
    });
  }
});

module.exports = router;