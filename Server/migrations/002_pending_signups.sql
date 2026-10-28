CREATE TABLE IF NOT EXISTS pending_signups (
  email VARCHAR(254) NOT NULL,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  otp_hash BINARY(32) NOT NULL,
  otp_expires_at_ms BIGINT UNSIGNED NOT NULL,
  otp_sent_at_ms BIGINT UNSIGNED NOT NULL,
  otp_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (email),
  KEY pending_signups_expiry (otp_expires_at_ms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
