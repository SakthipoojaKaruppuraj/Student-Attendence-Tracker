const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_jwt_key";

// Middleware to verify Student JWT Token (Optional / Helper)
function authenticateStudentToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Invalid or expired token" });
    }
    req.student = user;
    next();
  });
}

// --------------------------------------------------
// STUDENT LOGIN
// --------------------------------------------------
router.post("/login", async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({
      success: false,
      message: "Roll Number / Email and Password are required",
    });
  }

  try {
    const rawId = (identifier || "").trim();
    const cleanId = rawId.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Find student by rollNumber, registerNumber, kiteEmail or soiEmail
    const students = await prisma.student.findMany();
    let student = students.find((s) => {
      const rNo = (s.rollNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const regNo = (s.registerNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const kEmail = (s.kiteEmail || "").toLowerCase().trim();
      const sEmail = (s.soiEmail || "").toLowerCase().trim();
      
      return (
        (rNo && rNo === cleanId) ||
        (regNo && regNo === cleanId) ||
        (kEmail && (kEmail === rawId.toLowerCase() || kEmail.includes(rawId.toLowerCase()))) ||
        (sEmail && (sEmail === rawId.toLowerCase() || sEmail.includes(rawId.toLowerCase())))
      );
    });

    // Fallback search if still not found: partial match on rollNumber or registerNumber
    if (!student && cleanId.length >= 3) {
      student = students.find((s) => {
        const rNo = (s.rollNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const regNo = (s.registerNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        return rNo.includes(cleanId) || regNo.includes(cleanId);
      });
    }

    if (!student) {
      return res.status(401).json({
        success: false,
        message: `Roll Number or Email '${identifier}' was not found in the student database.`,
      });
    }

    // Password Verification Logic
    let isValidPassword = false;
    const cleanInputPassword = password.trim();

    if (student.password) {
      isValidPassword = await bcrypt.compare(cleanInputPassword, student.password.trim());
      if (!isValidPassword) {
        isValidPassword = await bcrypt.compare(cleanInputPassword.toUpperCase(), student.password.trim());
      }
      if (!isValidPassword) {
        isValidPassword = await bcrypt.compare(cleanInputPassword.toLowerCase(), student.password.trim());
      }
    }

    // Default password check: compare against "Kitesoi@123" or student rollNumber
    const normInputPass = cleanInputPassword.toLowerCase();
    const normRoll = (student.rollNumber || "").toLowerCase();

    if (!isValidPassword && (student.isDefaultPassword || !student.password)) {
      if (normInputPass === "kitesoi@123" || normInputPass === normRoll) {
        isValidPassword = true;
      }
    }

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid password. (Default initial password is Kitesoi@123)",
      });
    }

    const token = jwt.sign(
      {
        studentId: student.id,
        rollNumber: student.rollNumber,
        studentName: student.studentName,
        year: student.year,
        department: student.department,
        soiLabVertical: student.soiLabVertical,
        role: "student",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      student: {
        id: student.id,
        sNo: student.sNo,
        studentName: student.studentName,
        rollNumber: student.rollNumber,
        registerNumber: student.registerNumber,
        department: student.department,
        section: student.section,
        gender: student.gender,
        kiteEmail: student.kiteEmail,
        soiEmail: student.soiEmail,
        soiLabVertical: student.soiLabVertical,
        year: student.year,
        isDefaultPassword: student.isDefaultPassword ?? true,
      },
    });
  } catch (error) {
    console.error("Student login error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication failed. Please try again.",
    });
  }
});

// --------------------------------------------------
// CHANGE PASSWORD
// --------------------------------------------------
router.post("/change-password", async (req, res) => {
  try {
    const { rollNumber, currentPassword, newPassword } = req.body;

    if (!rollNumber || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Roll Number, current password and new password are required.",
      });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 4 characters long.",
      });
    }

    const student = await prisma.student.findUnique({
      where: { rollNumber: rollNumber.trim() },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    let isValid = false;
    if (student.password) {
      isValid = await bcrypt.compare(currentPassword.trim(), student.password.trim());
    } else {
      isValid = currentPassword.trim().toLowerCase() === student.rollNumber.trim().toLowerCase();
    }

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    const newHashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    await prisma.student.update({
      where: { rollNumber: rollNumber.trim() },
      data: {
        password: newHashedPassword,
        isDefaultPassword: false,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update password.",
    });
  }
});

// --------------------------------------------------
// GET STUDENT PROGRESS & DASHBOARD DATA
// --------------------------------------------------
router.get("/me/progress", async (req, res) => {
  try {
    const { rollNumber } = req.query;

    if (!rollNumber) {
      return res.status(400).json({
        success: false,
        message: "Roll Number is required.",
      });
    }

    const student = await prisma.student.findUnique({
      where: { rollNumber: String(rollNumber).trim() },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    // 1. Attendance Records
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: { studentId: student.rollNumber },
      orderBy: { date: "desc" },
    });

    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter((r) => r.status === "P").length;
    const absentDays = attendanceRecords.filter((r) => r.status === "A").length;
    const odDays = attendanceRecords.filter((r) => r.status === "OD").length;
    const mlDays = attendanceRecords.filter((r) => r.status === "ML").length;

    // OD counts towards present percentage
    const attendancePercentage =
      totalDays > 0 ? Math.round(((presentDays + odDays) / totalDays) * 100) : 100;

    // 2. Tasks assigned to student's year and domain/vertical
    const allTasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
    });

    const studentDomain = (student.soiLabVertical || "").toLowerCase().trim();
    const studentDept = (student.department || "").toLowerCase().trim();
    const studentYear = (student.year || "").toLowerCase().trim();

    const relevantTasks = allTasks.filter((t) => {
      const tDomain = (t.domain || "").toLowerCase().trim();
      const tYear = (t.year || "").toLowerCase().trim();

      const domainMatches =
        tDomain === "all" ||
        !tDomain ||
        tDomain.includes(studentDomain) ||
        studentDomain.includes(tDomain) ||
        tDomain.includes(studentDept) ||
        studentDept.includes(tDomain);

      const yearMatches =
        tYear === "all" ||
        !tYear ||
        tYear.includes(studentYear) ||
        studentYear.includes(tYear);

      return domainMatches && yearMatches;
    });

    // 3. Task Submissions
    const submissions = await prisma.taskSubmission.findMany({
      where: { studentId: student.rollNumber },
    });

    const submissionMap = new Map();
    submissions.forEach((sub) => {
      submissionMap.set(sub.taskId, sub);
    });

    const tasksWithSubmission = relevantTasks.map((task) => {
      const sub = submissionMap.get(task.taskId);
      return {
        task_id: task.taskId,
        title: task.title,
        description: task.description,
        domain: task.domain,
        year: task.year,
        due_date: task.dueDate,
        allowed_proof_types: task.allowedProofTypes || "github,image,video,pdf",
        submission: sub
          ? {
              submission_id: sub.submissionId,
              github_url: sub.githubUrl,
              proof_files: sub.proofFiles,
              comment: sub.comment,
              submitted_at: sub.submittedAt.toISOString(),
              status: sub.status, // "Pending", "Approved", "Rejected", "Submitted"
              admin_feedback: sub.adminFeedback || "",
            }
          : null,
      };
    });

    const totalAssignedTasks = tasksWithSubmission.length;
    const completedTasks = tasksWithSubmission.filter(
      (t) => t.submission && (t.submission.status === "Approved" || t.submission.status === "Submitted")
    ).length;
    const pendingTasks = totalAssignedTasks - completedTasks;

    return res.status(200).json({
      success: true,
      student: {
        id: student.id,
        sNo: student.sNo,
        studentName: student.studentName,
        rollNumber: student.rollNumber,
        registerNumber: student.registerNumber,
        department: student.department,
        section: student.section,
        gender: student.gender,
        kiteEmail: student.kiteEmail,
        soiEmail: student.soiEmail,
        soiLabVertical: student.soiLabVertical,
        year: student.year,
        isDefaultPassword: student.isDefaultPassword ?? true,
      },
      stats: {
        totalDays,
        presentDays,
        absentDays,
        odDays,
        mlDays,
        attendancePercentage,
        totalAssignedTasks,
        completedTasks,
        pendingTasks,
      },
      attendanceRecords: attendanceRecords.map((r) => ({
        id: r.id,
        date: r.date,
        status: r.status,
        remarks: r.remarks || "",
      })),
      tasks: tasksWithSubmission,
    });
  } catch (error) {
    console.error("Fetch student progress error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student progress data.",
    });
  }
});

module.exports = router;
