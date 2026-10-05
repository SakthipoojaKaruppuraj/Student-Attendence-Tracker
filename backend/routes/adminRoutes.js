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

router.post("/login", async (req, res) => {
  console.log("Login request received");

  const { username, password } = req.body;

  console.log("Username:", username);

  if (!username || !password) {
    return res.status(400).json({
      message: "Username and password are required",
    });
  }

  const admins = [];

  fs.createReadStream(adminsFilePath)
    .pipe(csv())
    .on("data", (row) => {
      admins.push(row);
    })
    .on("end", async () => {
      try {
        console.log("CSV loaded");
        console.log("Admins found:", admins.length);

        const admin = admins.find(
          (item) =>
            item.username &&
            item.username.trim().toLowerCase() === username.trim().toLowerCase()
        );

        if (!admin) {
          console.log("Admin not found");

          return res.status(401).json({
            message: "Invalid username or password",
          });
        }

        console.log("Admin found:", admin.username);

        const passwordMatch = await bcrypt.compare(
          password.trim(),
          admin.password ? admin.password.trim() : ""
        );

        console.log("Password match:", passwordMatch);

        if (!passwordMatch) {
          return res.status(401).json({
            message: "Invalid username or password",
          });
        }

        const secretKey = process.env.JWT_SECRET || "your_super_secret_jwt_key";
        const token = jwt.sign(
          {
            username: admin.username,
            role: admin.role,
          },
          secretKey,
          {
            expiresIn: "1d",
          }
        );

        console.log("Login successful");

        return res.status(200).json({
          message: "Login successful",

          token,

          admin: {
            username: admin.username,
            role: admin.role,
          },
        });

      } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
          message: "Authentication failed",
        });
      }
    })

    .on("error", (error) => {
      console.error("CSV error:", error);

      return res.status(500).json({
        message: "Unable to read admin database",
      });
    });
});

module.exports = router;