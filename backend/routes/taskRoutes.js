const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const prisma = require("../config/db");

const router = express.Router();

const uploadDirectory = path.join(__dirname, "../uploads/task-proofs");

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
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, image and video files are allowed."));
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

// --------------------------------------------------
// GET ALL TASKS
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

    const formattedTasks = tasks.map((t) => ({
      task_id: t.taskId,
      title: t.title,
      description: t.description,
      domain: t.domain,
      year: t.year,
      due_date: t.dueDate,
      allowed_proof_types: t.allowedProofTypes || "github,image,video,pdf",
      created_by: t.createdBy,
      created_at: t.createdAt.toISOString(),
    }));

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
// GET SINGLE TASK
// --------------------------------------------------

router.get("/:taskId", async (req, res) => {
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

    const formatted = {
      task_id: task.taskId,
      title: task.title,
      description: task.description,
      domain: task.domain,
      year: task.year,
      due_date: task.dueDate,
      allowed_proof_types: task.allowedProofTypes || "github,image,video,pdf",
      created_by: task.createdBy,
      created_at: task.createdAt.toISOString(),
    };

    return res.json({
      success: true,
      task: formatted,
    });
  } catch (error) {
    console.error("Get task error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load task.",
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

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one Proof of Work file is required.",
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
    const proofFiles = req.files.map((file) => ({
      originalName: file.originalname,
      filename: file.filename,
      path: `/uploads/task-proofs/${file.filename}`,
      mimetype: file.mimetype,
    }));

    const newSubmission = await prisma.taskSubmission.create({
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
      message: "Task submitted successfully.",
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