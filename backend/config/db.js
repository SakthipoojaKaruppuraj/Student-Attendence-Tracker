const { PrismaClient } = require("@prisma/client");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";

let prisma;
if (dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://")) {
  const { PrismaPg } = require("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: dbUrl });
  prisma = new PrismaClient({ adapter });
} else {
  const { PrismaLibSql } = require("@prisma/adapter-libsql");
  const filePath = path.resolve(__dirname, "../dev.db");
  const adapter = new PrismaLibSql({ url: `file:${filePath}` });
  prisma = new PrismaClient({ adapter });
}

module.exports = prisma;
