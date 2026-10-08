const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");
const { requireOrgAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// Master Security PIN for high-risk operations (can be set via env, fallback to secure default)
const MASTER_PIN = process.env.ORG_ADMIN_MASTER_PIN || "998877";

// --------------------------------------------------
// ORG ADMIN (MANAGEMENT) LOGIN
// --------------------------------------------------
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required.",
    });
  }

  try {
    const admins = await prisma.admin.findMany();
    const admin = admins.find(
      (item) =>
        item.username &&
        item.username.trim().toLowerCase() === username.trim().toLowerCase()
    );

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }

    // Explicitly verify role
    if (admin.role !== "org_admin") {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Domain Admin accounts cannot log in through the Management Portal. Please use the Domain Admin Login portal.",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password.trim(),
      admin.password ? admin.password.trim() : ""
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }

    const secretKey = process.env.JWT_SECRET || "your_super_secret_jwt_key";
    const token = jwt.sign(
      {
        admin_id: admin.adminId,
        username: admin.username,
        role: "org_admin",
        domain: "All",
      },
      secretKey,
      {
        expiresIn: "1d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Management authentication successful",
      token,
      admin: {
        admin_id: admin.adminId,
        username: admin.username,
        name: admin.name || admin.username,
        role: "org_admin",
        domain: admin.domain || "All",
      },
    });
  } catch (error) {
    console.error("Org Admin login error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication failed due to server error.",
    });
  }
});

// --------------------------------------------------
// VERIFY MASTER SECURITY PIN
// --------------------------------------------------
router.post("/verify-pin", requireOrgAdmin, (req, res) => {
  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ success: false, message: "Security PIN is required." });
  }

  if (String(pin).trim() === String(MASTER_PIN).trim()) {
    return res.json({ success: true, message: "Security PIN verified successfully." });
  } else {
    return res.status(401).json({ success: false, message: "Invalid Security PIN." });
  }
});

// --------------------------------------------------
// GET ALL ADMINS (Management Only)
// --------------------------------------------------
router.get("/admins", requireOrgAdmin, async (req, res) => {
  try {
    const admins = await prisma.admin.findMany({
      orderBy: { createdAt: "asc" },
    });

    const safeAdmins = admins.map((a) => ({
      admin_id: a.adminId || "",
      username: a.username || "",
      name: a.name || a.username || "",
      role: a.role || "domain_admin",
      domain: a.domain || "All",
      created_at: a.createdAt ? a.createdAt.toISOString() : "",
    }));

    return res.json({
      success: true,
      admins: safeAdmins,
    });
  } catch (error) {
    console.error("Get admins error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load admins list.",
    });
  }
});

// --------------------------------------------------
// CREATE NEW ADMIN (Management Only)
// --------------------------------------------------
router.post("/admins", requireOrgAdmin, async (req, res) => {
  try {
    const { name, username, password, domain, role } = req.body;

    if (!username || !password || !domain) {
      return res.status(400).json({
        success: false,
        message: "Username, password, and domain are required.",
      });
    }

    const admins = await prisma.admin.findMany();

    const existing = admins.find(
      (a) => a.username.trim().toLowerCase() === username.trim().toLowerCase()
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "An admin account with this username already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    let maxNum = 0;
    admins.forEach((a) => {
      const match = String(a.adminId || "").match(/ADM(\d+)/);
      if (match) {
        maxNum = Math.max(maxNum, parseInt(match[1], 10));
      }
    });

    const newAdminId = `ADM${String(maxNum + 1).padStart(3, "0")}`;

    const newAdmin = await prisma.admin.create({
      data: {
        adminId: newAdminId,
        username: username.trim(),
        password: hashedPassword,
        name: name ? name.trim() : username.trim(),
        role: role || "domain_admin",
        domain: domain.trim(),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Admin account created successfully.",
      admin: {
        admin_id: newAdmin.adminId,
        username: newAdmin.username,
        name: newAdmin.name,
        role: newAdmin.role,
        domain: newAdmin.domain,
        created_at: newAdmin.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Create admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create admin account.",
    });
  }
});

// --------------------------------------------------
// DELETE ADMIN (Management Only)
// --------------------------------------------------
router.delete("/admins/:adminId", requireOrgAdmin, async (req, res) => {
  try {
    const { adminId } = req.params;

    const target = await prisma.admin.findUnique({
      where: { adminId },
    });

    if (!target) {
      return res.status(404).json({
        success: false,
        message: "Admin not found.",
      });
    }

    if (target.role === "org_admin") {
      return res.status(400).json({
        success: false,
        message: "Organisation Admin account cannot be deleted.",
      });
    }

    await prisma.admin.delete({
      where: { adminId },
    });

    return res.json({
      success: true,
      message: "Admin account deleted successfully.",
    });
  } catch (error) {
    console.error("Delete admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete admin account.",
    });
  }
});

// --------------------------------------------------
// DOMAIN-WISE TASK SUMMARY REPORT (Management Only)
// --------------------------------------------------
function normalizeDomain(str) {
  if (!str) return "";
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchesDomainKey(adminDomain, studentVertical) {
  if (!adminDomain || !studentVertical) return false;
  const aNorm = normalizeDomain(adminDomain);
  const sNorm = normalizeDomain(studentVertical);

  if (aNorm === sNorm) return true;

  // Blockchain
  if ((aNorm.includes("blockchain") || aNorm.includes("web3")) && 
      (sNorm.includes("blockchain") || sNorm.includes("web3") || sNorm.startsWith("bw"))) {
    return true;
  }
  // AI & Data Science
  if ((aNorm.includes("datascience") || (aNorm.includes("ai") && aNorm.includes("data"))) && 
      (sNorm.includes("datascience") || sNorm.startsWith("ad"))) {
    return true;
  }
  // Cloud & DevOps
  if ((aNorm.includes("cloud") || aNorm.includes("devops")) && 
      (sNorm.includes("cloud") || sNorm.includes("devops") || sNorm.startsWith("cd"))) {
    return true;
  }
  // Cyber Security
  if ((aNorm.includes("cyber") || aNorm.includes("security")) && 
      (sNorm.includes("cyber") || sNorm.startsWith("cs"))) {
    return true;
  }
  // Embedded Systems & IoT
  if ((aNorm.includes("embedded") || aNorm.includes("iot")) && 
      (sNorm.includes("embedded") || sNorm.includes("iot") || sNorm.startsWith("ei"))) {
    return true;
  }
  // Full Stack Web Development
  if (aNorm.includes("fullstack") && 
      (sNorm.includes("fullstack") || sNorm.startsWith("fw"))) {
    return true;
  }
  // Design, Manufacturing and Automation
  if ((aNorm.includes("manufacturing") || aNorm.includes("automation")) && 
      (sNorm.includes("manufacturing") || sNorm.includes("automation") || sNorm.startsWith("ma") || sNorm.startsWith("dma"))) {
    return true;
  }

  return false;
}

function matchesYearKey(itemYear, selectedYear) {
  if (!selectedYear || selectedYear === "All" || selectedYear === "all") return true;
  if (!itemYear) return false;
  
  const iNorm = itemYear.toLowerCase().trim();
  const sNorm = selectedYear.toLowerCase().trim();

  if (iNorm === "all" || sNorm === "all") return true;

  if ((sNorm.includes("2") || sNorm.includes("second")) && (iNorm.includes("2") || iNorm.includes("second"))) {
    return true;
  }

  if ((sNorm.includes("3") || sNorm.includes("third")) && (iNorm.includes("3") || iNorm.includes("third"))) {
    return true;
  }

  return iNorm.includes(sNorm) || sNorm.includes(iNorm);
}

router.get("/tasks-summary", requireOrgAdmin, async (req, res) => {
  try {
    const { year } = req.query;

    const admins = await prisma.admin.findMany();
    let students = await prisma.student.findMany();
    let tasks = await prisma.task.findMany();
    let submissions = await prisma.taskSubmission.findMany({
      include: { task: true, student: true },
    });

    if (year && year !== "All" && year !== "all") {
      students = students.filter((s) => matchesYearKey(s.year, year));
      tasks = tasks.filter((t) => matchesYearKey(t.year, year));
      submissions = submissions.filter(
        (sub) => matchesYearKey(sub.student?.year || sub.task?.year, year)
      );
    }

    const domainAdmins = admins.filter((a) => a.role === "domain_admin");
    const domainMap = {};

    domainAdmins.forEach((admin) => {
      const dName = admin.domain || "General";
      domainMap[dName] = {
        adminName: admin.name || admin.username,
        username: admin.username,
        domain: dName,
        totalTasks: 0,
        totalStudents: 0,
        approvedCount: 0,
        pendingReviewCount: 0,
        rejectedCount: 0,
        yetToCompleteCount: 0,
      };
    });

    students.forEach((student) => {
      const vertical = student.soiLabVertical || student.department || "General";
      let key = Object.keys(domainMap).find((k) => matchesDomainKey(k, vertical));
      if (!key) {
        key = vertical;
        if (!domainMap[key]) {
          domainMap[key] = {
            adminName: "Unassigned",
            username: "-",
            domain: key,
            totalTasks: 0,
            totalStudents: 0,
            approvedCount: 0,
            pendingReviewCount: 0,
            rejectedCount: 0,
            yetToCompleteCount: 0,
          };
        }
      }
      domainMap[key].totalStudents += 1;
    });

    tasks.forEach((task) => {
      const tDomain = task.domain || "All";
      if (tDomain === "All") {
        Object.keys(domainMap).forEach((key) => {
          domainMap[key].totalTasks += 1;
        });
      } else {
        let key = Object.keys(domainMap).find((k) => matchesDomainKey(k, tDomain));
        if (key && domainMap[key]) {
          domainMap[key].totalTasks += 1;
        }
      }
    });

    submissions.forEach((sub) => {
      const subDomain = sub.student?.soiLabVertical || sub.task?.domain || "General";
      let key = Object.keys(domainMap).find((k) => matchesDomainKey(k, subDomain));
      if (key && domainMap[key]) {
        if (sub.status === "Approved") {
          domainMap[key].approvedCount += 1;
        } else if (sub.status === "Pending") {
          domainMap[key].pendingReviewCount += 1;
        } else if (sub.status === "Rejected") {
          domainMap[key].rejectedCount += 1;
        }
      }
    });

    Object.keys(domainMap).forEach((key) => {
      const d = domainMap[key];
      const totalExpected = d.totalTasks * d.totalStudents;
      const completedOrPending = d.approvedCount + d.pendingReviewCount;
      d.yetToCompleteCount = Math.max(0, totalExpected - completedOrPending);
    });

    return res.json({
      success: true,
      domainSummaries: Object.values(domainMap),
    });
  } catch (error) {
    console.error("Error fetching tasks summary:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load domain task report.",
    });
  }
});

module.exports = router;
