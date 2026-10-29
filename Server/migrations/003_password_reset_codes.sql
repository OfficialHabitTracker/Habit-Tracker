CREATE TABLE IF NOT EXISTS password_reset_codes (
  email VARCHAR(254) NOT NULL,
  code_hash BINARY(32) NOT NULL,
  code_expires_at_ms BIGINT UNSIGNED NOT NULL,
  code_sent_at_ms BIGINT UNSIGNED NOT NULL,
  code_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (email),
  KEY password_reset_codes_expiry (code_expires_at_ms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
