const prisma = require("../config/db");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const DATA_DIR = path.join(__dirname, "../../database/data");

async function parseCsv(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    if (!fs.existsSync(filePath)) return resolve([]);
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (error) => reject(error));
  });
}

async function main() {
  console.log("🌱 Starting Database Seeding from database/data/ ...");

  // 1. Seed Admins
  const adminsFile = path.join(DATA_DIR, "admins.csv");
  if (fs.existsSync(adminsFile)) {
    const admins = await parseCsv(adminsFile);
    console.log(`⏳ Seeding ${admins.length} Admins...`);
    for (const admin of admins) {
      if (!admin.username) continue;
      await prisma.admin.upsert({
        where: { username: admin.username },
        update: {
          name: admin.name || admin.username,
          password: admin.password,
          role: admin.role || "domain_admin",
          domain: admin.domain || "All",
        },
        create: {
          adminId: admin.admin_id || `ADM_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          username: admin.username,
          password: admin.password,
          name: admin.name || admin.username,
          role: admin.role || "domain_admin",
          domain: admin.domain || "All",
        },
      });
    }
    console.log("✅ Admins seeded successfully.");
  }

  // 2. Seed Students from master_student_data.json
  const masterJsonFile = path.join(DATA_DIR, "master_student_data.json");
  if (fs.existsSync(masterJsonFile)) {
    const masterData = JSON.parse(fs.readFileSync(masterJsonFile, "utf-8"));
    const students = masterData.students || [];
    console.log(`⏳ Seeding ${students.length} Master Students...`);
    for (const student of students) {
      if (!student.roll_number) continue;
      await prisma.student.upsert({
        where: { rollNumber: student.roll_number },
        update: {
          studentName: student.student_name,
          registerNumber: student.register_number || null,
          department: student.department || "",
          section: student.section || null,
          gender: student.gender || null,
          kiteEmail: student.kite_email || null,
          soiEmail: student.soi_email || null,
          soiLabVertical: student.soi_lab_vertical || null,
          remarks: student.remarks || null,
          year: student.year || "3rd Year",
        },
        create: {
          sNo: String(student.s_no || ""),
          rollNumber: student.roll_number,
          studentName: student.student_name,
          registerNumber: student.register_number || null,
          department: student.department || "",
          section: student.section || null,
          gender: student.gender || null,
          kiteEmail: student.kite_email || null,
          soiEmail: student.soi_email || null,
          soiLabVertical: student.soi_lab_vertical || null,
          remarks: student.remarks || null,
          year: student.year || "3rd Year",
        },
      });
    }
    console.log("✅ Master Students seeded successfully.");
  }

  // 3. Seed Attendance Records
  const attendanceFile = path.join(DATA_DIR, "attendance.csv");
  if (fs.existsSync(attendanceFile)) {
    const attendanceRecords = await parseCsv(attendanceFile);
    console.log(`⏳ Seeding ${attendanceRecords.length} Attendance Records...`);
    await prisma.attendanceRecord.deleteMany();
    const allStudents = await prisma.student.findMany({
      select: { rollNumber: true, studentName: true, year: true },
    });
    const studentMap = new Map(allStudents.map((s) => [s.rollNumber, s]));

    const validRecords = [];
    const seenKeys = new Set();

    for (const record of attendanceRecords) {
      if (!record.date || !record.student_id) continue;
      const studentExists = studentMap.get(record.student_id);
      if (studentExists) {
        const uniqueKey = `${record.date}_${record.student_id}`;
        if (!seenKeys.has(uniqueKey)) {
          seenKeys.add(uniqueKey);
          validRecords.push({
            date: record.date,
            studentId: record.student_id,
            studentName: record.student_name || studentExists.studentName,
            year: record.year || studentExists.year,
            status: record.status,
            remarks: record.remarks || null,
          });
        }
      }
    }

    const chunkSize = 1000;
    for (let i = 0; i < validRecords.length; i += chunkSize) {
      const chunk = validRecords.slice(i, i + chunkSize);
      await prisma.attendanceRecord.createMany({
        data: chunk,
      });
    }
    console.log("✅ Attendance Records seeded successfully.");
  }

  // 4. Seed Tasks
  const tasksFile = path.join(DATA_DIR, "tasks.csv");
  if (fs.existsSync(tasksFile)) {
    const tasks = await parseCsv(tasksFile);
    console.log(`⏳ Seeding ${tasks.length} Tasks...`);
    for (const task of tasks) {
      if (!task.task_id) continue;
      await prisma.task.upsert({
        where: { taskId: task.task_id },
        update: {
          title: task.title,
          description: task.description || "",
          domain: task.domain || "All",
          year: task.year || "All",
          dueDate: task.due_date || null,
          allowedProofTypes: task.allowed_proof_types || null,
          createdBy: task.created_by || "ADMIN",
        },
        create: {
          taskId: task.task_id,
          title: task.title,
          description: task.description || "",
          domain: task.domain || "All",
          year: task.year || "All",
          dueDate: task.due_date || null,
          allowedProofTypes: task.allowed_proof_types || null,
          createdBy: task.created_by || "ADMIN",
        },
      });
    }
    console.log("✅ Tasks seeded successfully.");
  }

  // 5. Seed Task Submissions
  const submissionsFile = path.join(DATA_DIR, "task_submissions.csv");
  if (fs.existsSync(submissionsFile)) {
    const submissions = await parseCsv(submissionsFile);
    console.log(`⏳ Seeding ${submissions.length} Task Submissions...`);
    for (const sub of submissions) {
      if (!sub.submission_id || !sub.task_id || !sub.student_id) continue;
      const studentExists = await prisma.student.findUnique({
        where: { rollNumber: sub.student_id },
      });
      const taskExists = await prisma.task.findUnique({
        where: { taskId: sub.task_id },
      });

      if (studentExists && taskExists) {
        await prisma.taskSubmission.upsert({
          where: { submissionId: sub.submission_id },
          update: {
            githubUrl: sub.github_url || null,
            proofFiles: sub.proof_files || null,
            comment: sub.comment || null,
            status: sub.status || "Pending",
            adminFeedback: sub.admin_feedback || null,
          },
          create: {
            submissionId: sub.submission_id,
            taskId: sub.task_id,
            studentId: sub.student_id,
            githubUrl: sub.github_url || null,
            proofFiles: sub.proof_files || null,
            comment: sub.comment || null,
            status: sub.status || "Pending",
            adminFeedback: sub.admin_feedback || null,
          },
        });
      }
    }
    console.log("✅ Task Submissions seeded successfully.");
  }

  console.log("🎉 Database seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
