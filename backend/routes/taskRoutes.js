const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const AdmZip = require("adm-zip");
const prisma = require("../config/db");

const router = express.Router();

// Upload Directory inside database/uploads/task-proofs
const uploadDirectory = path.join(__dirname, "../../database/uploads/task-proofs");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

// --------------------------------------------------
// MULTER CONFIGURATION
// --------------------------------------------------

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${timestamp}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "application/zip",
      "application/x-zip-compressed",
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(pdf|png|jpg|jpeg|webp|mp4|webm|zip)$/i)) {
      cb(null, true);
    } else {
      cb(null, true); // Allow flexible files
    }
  },
});

// --------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------

async function generateTaskId() {
  const count = await prisma.task.count();
  return `T${String(count + 1).padStart(3, "0")}`;
}

async function generateSubmissionId() {
  const count = await prisma.taskSubmission.count();
  return `SUB${String(count + 1).padStart(4, "0")}`;
}

// Helper to check domain and year matching
function isStudentInTaskScope(student, taskDomain, taskYear) {
  const tDomain = (taskDomain || "").toLowerCase().trim();
  const tYear = (taskYear || "").toLowerCase().trim();

  const sDomain = (student.soiLabVertical || "").toLowerCase().trim();
  const sDept = (student.department || "").toLowerCase().trim();
  const sYear = (student.year || "").toLowerCase().trim();

  const domainMatches =
    tDomain === "all" ||
    !tDomain ||
    tDomain.includes(sDomain) ||
    sDomain.includes(tDomain) ||
    tDomain.includes(sDept) ||
    sDept.includes(tDomain);

  const yearMatches =
    tYear === "all" ||
    !tYear ||
    tYear.includes(sYear) ||
    sYear.includes(tYear);

  return domainMatches && yearMatches;
}

// --------------------------------------------------
// GET ALL TASKS WITH DOMAIN SUBMISSION COUNTS
// --------------------------------------------------

router.get("/", async (req, res) => {
  try {
    const { domain } = req.query;
    let tasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
    });

    if (domain && domain !== "All" && domain !== "all") {
      const cleanDomain = domain.toLowerCase().trim();
      tasks = tasks.filter((t) => {
        const tDomain = (t.domain || "").toLowerCase().trim();
        return (
          tDomain === "all" ||
          tDomain.includes(cleanDomain) ||
          cleanDomain.includes(tDomain)
        );
      });
    }

    const allStudents = await prisma.student.findMany();
    const allSubmissions = await prisma.taskSubmission.findMany();

    const formattedTasks = tasks.map((t) => {
      const domainStudents = allStudents.filter((s) => isStudentInTaskScope(s, t.domain, t.year));
      const taskSubs = allSubmissions.filter((sub) => sub.taskId === t.taskId);

      const submittedRolls = new Set(taskSubs.map((sub) => sub.studentId));
      const totalDomainStudents = domainStudents.length > 0 ? domainStudents.length : allStudents.length;
      const submittedCount = submittedRolls.size;
      const notSubmittedCount = Math.max(0, totalDomainStudents - submittedCount);
      const approvedCount = taskSubs.filter((s) => s.status === "Approved").length;

      return {
        task_id: t.taskId,
        title: t.title,
        description: t.description,
        domain: t.domain,
        year: t.year,
        due_date: t.dueDate,
        allowed_proof_types: t.allowedProofTypes || "github,image,video,pdf",
        created_by: t.createdBy,
        created_at: t.createdAt.toISOString(),
        analytics: {
          total_domain_students: totalDomainStudents,
          submitted_count: submittedCount,
          not_submitted_count: notSubmittedCount,
          approved_count: approvedCount,
        },
      };
    });

    return res.json({
      success: true,
      tasks: formattedTasks,
    });
  } catch (error) {
    console.error("Get tasks error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load tasks.",
    });
  }
});

// --------------------------------------------------
// EXPORT ALL PROOFS DATABASE (ZIP DOWNLOAD FOR ADMIN)
// --------------------------------------------------

router.get("/export/proofs-zip", async (req, res) => {
  try {
    const submissions = await prisma.taskSubmission.findMany({
      include: {
        task: true,
        student: true,
      },
    });

    const zip = new AdmZip();

    // 1. Create a metadata index report JSON
    const metadata = submissions.map((sub) => ({
      submission_id: sub.submissionId,
      task_id: sub.taskId,
      task_title: sub.task?.title || "",
      student_name: sub.student?.studentName || "",
      roll_number: sub.studentId,
      department: sub.student?.department || "",
      year: sub.student?.year || "",
      github_url: sub.githubUrl || "",
      status: sub.status,
      admin_feedback: sub.adminFeedback || "",
      submitted_at: sub.submittedAt,
    }));

    zip.addFile("submissions_index.json", Buffer.from(JSON.stringify(metadata, null, 2), "utf8"));

    // 2. Add all physical proof files from database/uploads/task-proofs
    if (fs.existsSync(uploadDirectory)) {
      const files = fs.readdirSync(uploadDirectory);
      files.forEach((file) => {
        const filePath = path.join(uploadDirectory, file);
        if (fs.statSync(filePath).isFile()) {
          zip.addLocalFile(filePath, "uploaded_proof_files");
        }
      });
    }

    const zipBuffer = zip.toBuffer();

    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="proof_of_work_database_${Date.now()}.zip"`,
      "Content-Length": zipBuffer.length,
    });

    return res.send(zipBuffer);
  } catch (error) {
    console.error("Export proofs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate proof database zip.",
    });
  }
});

// --------------------------------------------------
// GET SUBMISSIONS & NOT-SUBMITTED STUDENTS FOR A TASK (ADMIN TRACKING VIEW)
// --------------------------------------------------

router.get("/:taskId/submissions", async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await prisma.task.findUnique({
      where: { taskId },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    const allStudents = await prisma.student.findMany({
      orderBy: { studentName: "asc" },
    });

    const domainStudents = allStudents.filter((s) => isStudentInTaskScope(s, task.domain, task.year));
    const targetStudents = domainStudents.length > 0 ? domainStudents : allStudents;

    const submissions = await prisma.taskSubmission.findMany({
      where: { taskId },
      include: {
        student: true,
      },
      orderBy: { submittedAt: "desc" },
    });

    const submittedRolls = new Set(submissions.map((s) => s.studentId));

    const formattedSubmitted = submissions.map((s) => ({
      submission_id: s.submissionId,
      task_id: s.taskId,
      student_id: s.studentId,
      student_name: s.student?.studentName || s.studentId,
      department: s.student?.department || "",
      section: s.student?.section || "",
      year: s.student?.year || "",
      kite_email: s.student?.kiteEmail || "",
      github_url: s.githubUrl,
      proof_files: s.proofFiles,
      comment: s.comment,
      submitted_at: s.submittedAt.toISOString(),
      status: s.status, // "Submitted", "Approved", "Rejected"
      admin_feedback: s.adminFeedback || "",
    }));

    const notSubmittedStudents = targetStudents
      .filter((st) => !submittedRolls.has(st.rollNumber))
      .map((st, idx) => ({
        s_no: st.sNo || String(idx + 1),
        student_id: st.rollNumber,
        student_name: st.studentName,
        department: st.department,
        section: st.section || "",
        year: st.year,
        kite_email: st.kiteEmail || "",
        soi_email: st.soiEmail || "",
        soi_lab_vertical: st.soiLabVertical || "",
      }));

    const approvedCount = submissions.filter((s) => s.status === "Approved").length;
    const rejectedCount = submissions.filter((s) => s.status === "Rejected").length;
    const pendingReviewCount = submissions.filter((s) => s.status === "Submitted" || s.status === "Pending").length;

    return res.json({
      success: true,
      task: {
        task_id: task.taskId,
        title: task.title,
        domain: task.domain,
        year: task.year,
        due_date: task.dueDate,
      },
      stats: {
        total_students: targetStudents.length,
        submitted_count: submittedRolls.size,
        not_submitted_count: notSubmittedStudents.length,
        approved_count: approvedCount,
        rejected_count: rejectedCount,
        pending_review_count: pendingReviewCount,
      },
      submitted_students: formattedSubmitted,
      not_submitted_students: notSubmittedStudents,
    });
  } catch (error) {
    console.error("Get task submissions error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load submissions.",
    });
  }
});

// --------------------------------------------------
// ADMIN REVIEW SUBMISSION (APPROVE / REJECT)
// --------------------------------------------------

router.put("/submissions/:submissionId/review", async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { status, admin_feedback } = req.body; // status: "Approved" | "Rejected" | "Pending"

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required (Approved or Rejected).",
      });
    }

    const submission = await prisma.taskSubmission.findUnique({
      where: { submissionId },
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found.",
      });
    }

    const updated = await prisma.taskSubmission.update({
      where: { submissionId },
      data: {
        status: status.trim(),
        adminFeedback: admin_feedback ? admin_feedback.trim() : null,
      },
    });

    return res.json({
      success: true,
      message: `Submission status updated to ${status}.`,
      submission: {
        submission_id: updated.submissionId,
        task_id: updated.taskId,
        status: updated.status,
        admin_feedback: updated.adminFeedback || "",
      },
    });
  } catch (error) {
    console.error("Review submission error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to review submission.",
    });
  }
});

// --------------------------------------------------
// CREATE TASK
// --------------------------------------------------

router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      domain,
      year,
      due_date,
      allowed_proof_types,
      created_by,
    } = req.body;

    if (!title || !description || !domain || !year || !due_date) {
      return res.status(400).json({
        success: false,
        message: "Title, description, domain, year and due date are required.",
      });
    }

    const taskId = await generateTaskId();
    const allowedProofTypesStr = Array.isArray(allowed_proof_types)
      ? allowed_proof_types.join(",")
      : allowed_proof_types || "github,image,video,pdf";

    const newTask = await prisma.task.create({
      data: {
        taskId,
        title: title.trim(),
        description: description.trim(),
        domain: domain.trim(),
        year: year.trim(),
        dueDate: due_date,
        allowedProofTypes: allowedProofTypesStr,
        createdBy: created_by || "admin",
      },
    });

    const formatted = {
      task_id: newTask.taskId,
      title: newTask.title,
      description: newTask.description,
      domain: newTask.domain,
      year: newTask.year,
      due_date: newTask.dueDate,
      allowed_proof_types: newTask.allowedProofTypes,
      created_by: newTask.createdBy,
      created_at: newTask.createdAt.toISOString(),
    };

    return res.status(201).json({
      success: true,
      message: "Task created successfully.",
      task: formatted,
    });
  } catch (error) {
    console.error("Create task error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create task.",
    });
  }
});

// --------------------------------------------------
// DELETE TASK
// --------------------------------------------------

router.delete("/:taskId", async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { taskId: req.params.taskId },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    await prisma.task.delete({
      where: { taskId: req.params.taskId },
    });

    return res.json({
      success: true,
      message: "Task deleted successfully.",
    });
  } catch (error) {
    console.error("Delete task error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete task.",
    });
  }
});

// --------------------------------------------------
// STUDENT SUBMIT TASK
// --------------------------------------------------

router.post("/:taskId/submit", upload.array("proof", 10), async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { taskId: req.params.taskId },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    const { student_id, github_url, comment } = req.body;

    if (!student_id || !github_url) {
      return res.status(400).json({
        success: false,
        message: "Student ID and GitHub URL are required.",
      });
    }

    // Ensure student exists in DB or create stub
    const studentExists = await prisma.student.findUnique({
      where: { rollNumber: student_id },
    });

    if (!studentExists) {
      await prisma.student.create({
        data: {
          rollNumber: student_id,
          studentName: "Student " + student_id,
          department: "General",
          year: "3rd Year",
        },
      });
    }

    const submissionId = await generateSubmissionId();
    let proofFiles = [];
    if (req.files && req.files.length > 0) {
      proofFiles = req.files.map((file) => ({
        originalName: file.originalname,
        filename: file.filename,
        path: `/uploads/task-proofs/${file.filename}`,
        mimetype: file.mimetype,
      }));
    }

    // Upsert submission if student re-submits
    const existingSubmission = await prisma.taskSubmission.findFirst({
      where: {
        taskId: req.params.taskId,
        studentId: student_id,
      },
    });

    let newSubmission;
    if (existingSubmission) {
      newSubmission = await prisma.taskSubmission.update({
        where: { id: existingSubmission.id },
        data: {
          githubUrl: github_url,
          proofFiles: proofFiles.length > 0 ? JSON.stringify(proofFiles) : existingSubmission.proofFiles,
          comment: comment || existingSubmission.comment,
          status: "Submitted", // Reset status to Submitted upon re-submission
        },
      });
    } else {
      newSubmission = await prisma.taskSubmission.create({
        data: {
          submissionId,
          taskId: req.params.taskId,
          studentId: student_id,
          githubUrl: github_url,
          proofFiles: JSON.stringify(proofFiles),
          comment: comment || "",
          status: "Submitted",
        },
      });
    }

    const formatted = {
      submission_id: newSubmission.submissionId,
      task_id: newSubmission.taskId,
      student_id: newSubmission.studentId,
      github_url: newSubmission.githubUrl,
      proof_files: newSubmission.proofFiles,
      comment: newSubmission.comment,
      submitted_at: newSubmission.submittedAt.toISOString(),
      status: newSubmission.status,
      admin_feedback: newSubmission.adminFeedback || "",
    };

    return res.status(201).json({
      success: true,
      message: "Task submitted successfully to Admin.",
      submission: formatted,
    });
  } catch (error) {
    console.error("Task submission error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to submit task.",
    });
  }
});

module.exports = router;