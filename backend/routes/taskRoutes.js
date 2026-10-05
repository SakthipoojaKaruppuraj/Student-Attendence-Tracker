const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const router = express.Router();

const tasksFilePath = path.join(
  __dirname,
  "../data/tasks.csv"
);

const submissionsFilePath = path.join(
  __dirname,
  "../data/task_submissions.csv"
);

const uploadDirectory = path.join(
  __dirname,
  "../uploads/task-proofs"
);

// Create upload directory if it doesn't exist
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
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

    const safeName = file.originalname.replace(
      /[^a-zA-Z0-9.-]/g,
      "_"
    );

    cb(
      null,
      `${timestamp}-${safeName}`
    );
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 100 * 1024 * 1024,
  },

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
      cb(
        new Error(
          "Only PDF, image and video files are allowed."
        )
      );
    }
  },
});

// --------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------

function escapeCsv(value) {
  if (value === undefined || value === null) {
    return "";
  }

  const stringValue = String(value);

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function appendToCsv(filePath, header, recordValues) {
  const lineToAppend = recordValues.map(escapeCsv).join(",");
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
    const content = header.trim() + "\n" + lineToAppend + "\n";
    fs.writeFileSync(filePath, content, "utf8");
    return;
  }

  const fileContent = fs.readFileSync(filePath, "utf8");
  const needsNewline =
    fileContent.length > 0 &&
    !fileContent.endsWith("\n") &&
    !fileContent.endsWith("\r");

  const prefix = needsNewline ? "\n" : "";

  fs.appendFileSync(filePath, prefix + lineToAppend + "\n", "utf8");
}


function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return resolve([]);
    }

    const csvParser = require("csv-parser");

    const results = [];

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row) => {
        results.push(row);
      })
      .on("end", () => {
        resolve(results);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

function generateTaskId(tasks) {
  let maxNumber = 0;

  tasks.forEach((task) => {
    const match = String(task.task_id || "").match(
      /T(\d+)/
    );

    if (match) {
      maxNumber = Math.max(
        maxNumber,
        parseInt(match[1], 10)
      );
    }
  });

  return `T${String(maxNumber + 1).padStart(3, "0")}`;
}

function generateSubmissionId(submissions) {
  let maxNumber = 0;

  submissions.forEach((submission) => {
    const match = String(
      submission.submission_id || ""
    ).match(/SUB(\d+)/);

    if (match) {
      maxNumber = Math.max(
        maxNumber,
        parseInt(match[1], 10)
      );
    }
  });

  return `SUB${String(maxNumber + 1).padStart(
    4,
    "0"
  )}`;
}

// --------------------------------------------------
// GET ALL TASKS
// --------------------------------------------------

router.get("/", async (req, res) => {
  try {
    const tasks = await readCsv(tasksFilePath);

    res.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("Get tasks error:", error);

    res.status(500).json({
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
    const tasks = await readCsv(tasksFilePath);

    const task = tasks.find(
      (item) =>
        item.task_id === req.params.taskId
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    res.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error("Get task error:", error);

    res.status(500).json({
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

    if (
      !title ||
      !description ||
      !domain ||
      !year ||
      !due_date
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Title, description, domain, year and due date are required.",
      });
    }

    const tasks = await readCsv(tasksFilePath);

    const taskId = generateTaskId(tasks);

    const createdAt = new Date().toISOString();

    const allowedProofTypesStr = Array.isArray(allowed_proof_types)
      ? allowed_proof_types.join(",")
      : (allowed_proof_types || "github_url,image,video,pdf");

    const newTask = {
      task_id: taskId,
      title: title.trim(),
      description: description.trim(),
      domain: domain.trim(),
      year: year.trim(),
      due_date,
      allowed_proof_types: allowedProofTypesStr,
      created_by: created_by || "admin",
      created_at: createdAt,
    };

    const tasksHeader =
      "task_id,title,description,domain,year,due_date,allowed_proof_types,created_by,created_at";

    appendToCsv(tasksFilePath, tasksHeader, [
      newTask.task_id,
      newTask.title,
      newTask.description,
      newTask.domain,
      newTask.year,
      newTask.due_date,
      newTask.allowed_proof_types,
      newTask.created_by,
      newTask.created_at,
    ]);

    res.status(201).json({
      success: true,
      message: "Task created successfully.",
      task: newTask,
    });
  } catch (error) {
    console.error("Create task error:", error);

    res.status(500).json({
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
    const tasks = await readCsv(tasksFilePath);

    const taskExists = tasks.some(
      (task) =>
        task.task_id === req.params.taskId
    );

    if (!taskExists) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    const remainingTasks = tasks.filter(
      (task) =>
        task.task_id !== req.params.taskId
    );

    const header =
      "task_id,title,description,domain,year,due_date,allowed_proof_types,created_by,created_at\n";

    const csvData =
      header +
      remainingTasks
        .map((task) =>
          [
            task.task_id,
            task.title,
            task.description,
            task.domain,
            task.year,
            task.due_date,
            task.allowed_proof_types || "github_url,image,video,pdf",
            task.created_by,
            task.created_at,
          ]
            .map(escapeCsv)
            .join(",")
        )
        .join("\n") +
      (remainingTasks.length ? "\n" : "");

    fs.writeFileSync(
      tasksFilePath,
      csvData
    );

    res.json({
      success: true,
      message: "Task deleted successfully.",
    });
  } catch (error) {
    console.error("Delete task error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete task.",
    });
  }
});

// --------------------------------------------------
// STUDENT SUBMIT TASK
// --------------------------------------------------

router.post(
  "/:taskId/submit",
  upload.array("proof", 10),
  async (req, res) => {
    try {
      const tasks = await readCsv(tasksFilePath);

      const task = tasks.find(
        (item) =>
          item.task_id === req.params.taskId
      );

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found.",
        });
      }

      const {
        student_id,
        github_url,
        comment,
      } = req.body;

      if (!student_id || !github_url) {
        return res.status(400).json({
          success: false,
          message:
            "Student ID and GitHub URL are required.",
        });
      }

      if (
        !req.files ||
        req.files.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "At least one Proof of Work file is required.",
        });
      }

      const submissions =
        await readCsv(
          submissionsFilePath
        );

      const submissionId =
        generateSubmissionId(
          submissions
        );

      const proofFiles =
        req.files.map((file) => ({
          originalName:
            file.originalname,
          filename:
            file.filename,
          path:
            `/uploads/task-proofs/${file.filename}`,
          mimetype:
            file.mimetype,
        }));

      const newSubmission = {
        submission_id: submissionId,
        task_id: req.params.taskId,
        student_id,
        github_url,
        proof_files: JSON.stringify(
          proofFiles
        ),
        comment: comment || "",
        submitted_at:
          new Date().toISOString(),
        status: "Submitted",
        admin_feedback: "",
      };

      const submissionsHeader =
        "submission_id,task_id,student_id,github_url,proof_files,comment,submitted_at,status,admin_feedback";

      appendToCsv(submissionsFilePath, submissionsHeader, [
        newSubmission.submission_id,
        newSubmission.task_id,
        newSubmission.student_id,
        newSubmission.github_url,
        newSubmission.proof_files,
        newSubmission.comment,
        newSubmission.submitted_at,
        newSubmission.status,
        newSubmission.admin_feedback,
      ]);


      res.status(201).json({
        success: true,
        message:
          "Task submitted successfully.",
        submission: newSubmission,
      });
    } catch (error) {
      console.error(
        "Task submission error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to submit task.",
      });
    }
  }
);

module.exports = router;