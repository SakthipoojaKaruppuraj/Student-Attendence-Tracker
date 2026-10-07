const bcrypt = require("bcryptjs");
const prisma = require("./config/db");

async function seedPasswords() {
  try {
    const DEFAULT_PASS = "Kitesoi@123";
    const hashedPassword = await bcrypt.hash(DEFAULT_PASS, 10);

    const students = await prisma.student.findMany();
    console.log(`Setting default password "${DEFAULT_PASS}" for all ${students.length} students...`);

    // Update all students to have hashedPassword and isDefaultPassword: true
    await prisma.student.updateMany({
      data: {
        password: hashedPassword,
        isDefaultPassword: true,
      },
    });

    console.log(`Successfully updated all ${students.length} students with default password "${DEFAULT_PASS}".`);
    process.exit(0);
  } catch (error) {
    console.error("Error seeding passwords:", error);
    process.exit(1);
  }
}

seedPasswords();
