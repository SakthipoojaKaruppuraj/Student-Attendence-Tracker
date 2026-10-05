const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const adminRoutes = require("./routes/adminRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const taskRoutes = require("./routes/taskRoutes");
const studentRoutes = require("./routes/studentRoutes");


const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Admin
app.use("/api/admin", adminRoutes);

// Attendance
app.use("/api/attendance", attendanceRoutes);

app.use("/api/tasks", taskRoutes);
app.use("/api/students", studentRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Student Management System API is running",
  });
});

const PORT = process.env.PORT || 5001;

app.use(
  "/uploads",
  express.static(
    require("path").join(
      __dirname,
      "uploads"
    )
  )
);

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});