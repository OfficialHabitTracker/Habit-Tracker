CREATE TABLE IF NOT EXISTS daily_habit_logs (
  user_id INT NOT NULL,
  log_date DATE NOT NULL,
  habit_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  weight INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  PRIMARY KEY (user_id, log_date, habit_id)
);

CREATE TABLE IF NOT EXISTS weekly_notes (
  user_id INT NOT NULL,
  week_start DATE NOT NULL,
  notes TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, week_start)
);
