function decodeUrlPart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error("DATABASE_URL contains invalid percent encoding.");
  }
}

function getDatabaseConfig() {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    let connectionUrl;
    try {
      connectionUrl = new URL(connectionString);
    } catch {
      throw new Error("DATABASE_URL must be a valid MySQL connection URL.");
    }

    if (connectionUrl.protocol !== "mysql:" && connectionUrl.protocol !== "mariadb:") {
      throw new Error("DATABASE_URL must use the mysql:// or mariadb:// scheme.");
    }

    const database = decodeUrlPart(connectionUrl.pathname.replace(/^\/+/, ""));
    if (!connectionUrl.hostname || !connectionUrl.username || !database) {
      throw new Error("DATABASE_URL must include a host, username, and database name.");
    }

    return {
      host: connectionUrl.hostname,
      port: Number(connectionUrl.port) || 3306,
      user: decodeUrlPart(connectionUrl.username),
      password: decodeUrlPart(connectionUrl.password),
      database,
    };
  }

  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "Habit_Tracker",
  };
}

function getDatabaseSslOptions(host, ca) {
  const isEnzonicHost = host.toLowerCase().endsWith(".db.enzonic.com");
  if (process.env.DB_SSL !== "true" && !isEnzonicHost) return undefined;
  return ca
    ? { ca, rejectUnauthorized: true }
    : { rejectUnauthorized: true };
}

module.exports = { getDatabaseConfig, getDatabaseSslOptions };
