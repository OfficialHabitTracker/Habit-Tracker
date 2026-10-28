const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const mysql = require("mysql2/promise");
const mysqlCore = require("mysql2");

const migrationLockName = "habit_tracker_schema_migrations";
const migrationsDirectory = path.join(__dirname, "migrations");
const databaseName = process.env.DB_NAME || "Habit_Tracker";
const dbSslCa = process.env.DB_SSL_CA?.replace(/\\n/g, "\n");
let readinessPromise;

if (process.env.DB_SSL === "true" && !dbSslCa) {
  throw new Error("DB_SSL_CA is required when DB_SSL=true. Add your database provider's CA certificate.");
}

function connectionOptions(includeDatabase) {
  const options = {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === "true"
      ? { ca: dbSslCa, rejectUnauthorized: true }
      : undefined,
  };
  if (includeDatabase) options.database = databaseName;
  return options;
}

async function createDatabaseIfMissing() {
  try {
    const existingConnection = await mysql.createConnection(connectionOptions(true));
    await existingConnection.end();
    return;
  } catch (error) {
    if (error.code !== "ER_BAD_DB_ERROR" && error.errno !== 1049) throw error;
  }

  const serverConnection = await mysql.createConnection(connectionOptions(false));
  try {
    await serverConnection.query(
      `CREATE DATABASE IF NOT EXISTS ${mysqlCore.escapeId(databaseName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await serverConnection.end();
  }
}

async function applyMigrations() {
  await createDatabaseIfMissing();
  const connection = await mysql.createConnection(connectionOptions(true));
  let lockAcquired = false;

  try {
    const [lockRows] = await connection.query("SELECT GET_LOCK(?, 30) AS acquired", [migrationLockName]);
    lockAcquired = Number(lockRows[0]?.acquired) === 1;
    if (!lockAcquired) throw new Error("Could not acquire the database migration lock.");

    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const [appliedRows] = await connection.query("SELECT version FROM schema_migrations");
    const appliedVersions = new Set(appliedRows.map((row) => row.version));
    const migrationFiles = fs.readdirSync(migrationsDirectory)
      .filter((name) => /^\d+_[a-z0-9_-]+\.sql$/i.test(name))
      .sort();

    for (const filename of migrationFiles) {
      if (appliedVersions.has(filename)) continue;

      const sql = fs.readFileSync(path.join(migrationsDirectory, filename), "utf8");
      const statements = sql.split(";").map((statement) => statement.trim()).filter(Boolean);
      for (const statement of statements) await connection.query(statement);
      await connection.query("INSERT INTO schema_migrations (version) VALUES (?)", [filename]);
      console.log(`Applied database migration ${filename}.`);
    }
  } finally {
    if (lockAcquired) {
      try {
        await connection.query("SELECT RELEASE_LOCK(?)", [migrationLockName]);
      } catch (error) {
        console.error("Could not release the database migration lock:", error.message);
      }
    }
    await connection.end();
  }
}

function ensureDatabaseReady() {
  if (!readinessPromise) {
    readinessPromise = applyMigrations().catch((error) => {
      readinessPromise = undefined;
      throw error;
    });
  }
  return readinessPromise;
}

if (require.main === module) {
  ensureDatabaseReady()
    .then(() => console.log(`Database ${databaseName} is ready.`))
    .catch((error) => {
      console.error("Database setup failed:", error.message);
      process.exitCode = 1;
    });
}

module.exports = { ensureDatabaseReady };
