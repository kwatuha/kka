-- Per-user default Zoom join link / passcode (Personal Meeting ID, etc.).
-- Copied into each new telemedicine_sessions row for that doctor when no link is sent in the request.

CREATE TABLE IF NOT EXISTS user_telemedicine_settings (
  userId INT NOT NULL,
  defaultZoomJoinUrl TEXT NULL,
  defaultZoomPassword VARCHAR(100) NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (userId),
  CONSTRAINT fk_user_telemedicine_user FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
