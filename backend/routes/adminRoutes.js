const express = require("express");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

const adminsFilePath = path.join(
  __dirname,
  "../data/admins.csv"
);

function escapeCsv(value) {
  if (value === undefined || value === null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function readAdmins() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(adminsFilePath)) {
      return resolve([]);
    }
    const results = [];
    fs.createReadStream(adminsFilePath)
      .pipe(csv())
      .on("data", (row) => results.push(row))
      .on("end", () => resolve(results))
      .on("error", (err) => reject(err));
  });
}

function saveAdmins(admins) {
  const header = "admin_id,username,password,name,role,domain,created_at\n";
  const lines = admins.map((a) =>
    [
      a.admin_id || "",
      a.username || "",
      a.password || "",
      a.name || "",
      a.role || "domain_admin",
      a.domain || "All",
      a.created_at || new Date().toISOString(),
    ]
      .map(escapeCsv)
      .join(",")
  );
  fs.writeFileSync(adminsFilePath, header + lines.join("\n") + (lines.length ? "\n" : ""), "utf8");
}

// --------------------------------------------------
// ADMIN LOGIN
// --------------------------------------------------

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required",
    });
  }

  try {
    const admins = await readAdmins();

    const admin = admins.find(
      (item) =>
        item.username &&
        item.username.trim().toLowerCase() === username.trim().toLowerCase()
    );

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password.trim(),
      admin.password ? admin.password.trim() : ""
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    const secretKey = process.env.JWT_SECRET || "your_super_secret_jwt_key";
    const token = jwt.sign(
      {
        admin_id: admin.admin_id,
        username: admin.username,
        role: admin.role || "domain_admin",
        domain: admin.domain || "All",
      },
      secretKey,
      {
        expiresIn: "1d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        admin_id: admin.admin_id || "ADM001",
        username: admin.username,
        name: admin.name || admin.username,
        role: admin.role || "org_admin",
        domain: admin.domain || "All",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
});

// --------------------------------------------------
// GET ALL ADMINS (Organisation Admin View)
// --------------------------------------------------

router.get("/", async (req, res) => {
  try {
    const admins = await readAdmins();

    const safeAdmins = admins.map((a) => ({
      admin_id: a.admin_id || "",
      username: a.username || "",
      name: a.name || a.username || "",
      role: a.role || "domain_admin",
      domain: a.domain || "All",
      created_at: a.created_at || "",
    }));

    return res.json({
      success: true,
      admins: safeAdmins,
    });
  } catch (error) {
    console.error("Get admins error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load admins.",
    });
  }
});

// --------------------------------------------------
// CREATE NEW DOMAIN ADMIN
// --------------------------------------------------

router.post("/", async (req, res) => {
  try {
    const { name, username, password, domain, role } = req.body;

    if (!username || !password || !domain) {
      return res.status(400).json({
        success: false,
        message: "Username, password and domain are required.",
      });
    }

    const admins = await readAdmins();

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
      const match = String(a.admin_id || "").match(/ADM(\d+)/);
      if (match) {
        maxNum = Math.max(maxNum, parseInt(match[1], 10));
      }
    });

    const newAdminId = `ADM${String(maxNum + 1).padStart(3, "0")}`;

    const newAdmin = {
      admin_id: newAdminId,
      username: username.trim(),
      password: hashedPassword,
      name: name ? name.trim() : username.trim(),
      role: role || "domain_admin",
      domain: domain.trim(),
      created_at: new Date().toISOString(),
    };

    admins.push(newAdmin);
    saveAdmins(admins);

    return res.status(201).json({
      success: true,
      message: "Admin account created successfully.",
      admin: {
        admin_id: newAdmin.admin_id,
        username: newAdmin.username,
        name: newAdmin.name,
        role: newAdmin.role,
        domain: newAdmin.domain,
        created_at: newAdmin.created_at,
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
// DELETE ADMIN
// --------------------------------------------------

router.delete("/:adminId", async (req, res) => {
  try {
    const { adminId } = req.params;

    let admins = await readAdmins();

    const target = admins.find((a) => a.admin_id === adminId);
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

    admins = admins.filter((a) => a.admin_id !== adminId);
    saveAdmins(admins);

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

module.exports = router;