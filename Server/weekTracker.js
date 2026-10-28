const express = require("express");
const requireLogin = require("./auth");

function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function getWeekRange(query) {
  if (query.start === undefined && query.end === undefined) {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start: toDateString(start), end: toDateString(end) };
  }

  if (!isValidDateString(query.start) || !isValidDateString(query.end)) return null;
  const startMs = Date.parse(`${query.start}T00:00:00.000Z`);
  const endMs = Date.parse(`${query.end}T00:00:00.000Z`);
  const dayCount = (endMs - startMs) / 86_400_000;
  if (dayCount < 0 || dayCount > 6) return null;
  return { start: query.start, end: query.end };
}

function createWeekRouter({ databaseQuery, jwtSecret }) {
  const router = express.Router();
  router.use(requireLogin(jwtSecret));

  router.get("/", async (req, res) => {
    const range = getWeekRange(req.query);
    if (!range) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid seven-day start and end date.",
      });
    }

    try {
      const rows = await databaseQuery(
        "SELECT id, DATE_FORMAT(log_date, '%Y-%m-%d') AS log_date, daily_score FROM daily_logs WHERE user_id = ? AND log_date BETWEEN ? AND ? ORDER BY log_date ASC, id ASC",
        [req.userId, range.start, range.end],
      );
      const byDate = new Map();
      for (const row of rows) byDate.set(row.log_date, row);

      const habitsSummary = await databaseQuery(
        `SELECT
           habit_id AS id,
           MAX(name) AS name,
           MAX(type) AS type,
           SUM(status = 'Done') AS fullCount,
           COUNT(*) AS totalCount,
           COALESCE(ROUND(100 * SUM(weight * CASE status WHEN 'Done' THEN 1 WHEN 'Partial' THEN 0.5 ELSE 0 END) / NULLIF(SUM(weight), 0)), 0) AS avgScore
         FROM daily_habit_logs
         WHERE user_id = ? AND log_date BETWEEN ? AND ?
         GROUP BY habit_id
         ORDER BY MAX(name) ASC`,
        [req.userId, range.start, range.end],
      );

      const notes = await databaseQuery(
        "SELECT notes FROM weekly_notes WHERE user_id = ? AND week_start = ? LIMIT 1",
        [req.userId, range.start],
      );

      return res.json({
        success: true,
        weekStart: range.start,
        weekEnd: range.end,
        weekData: [...byDate.values()],
        habitsSummary,
        checkInNotes: notes[0]?.notes || "",
      });
    } catch (error) {
      console.error("Failed to fetch week data:", error.message);
      return res.status(500).json({
        success: false,
        message: "Server error. Could not fetch week data.",
      });
    }
  });

  router.post("/notes", async (req, res) => {
    const { weekStart, notes } = req.body || {};
    if (!isValidDateString(weekStart) || new Date(`${weekStart}T00:00:00.000Z`).getUTCDay() !== 0) {
      return res.status(400).json({ success: false, message: "Choose a valid Sunday week start." });
    }
    if (typeof notes !== "string" || notes.length > 5000) {
      return res.status(400).json({ success: false, message: "Notes must be 5,000 characters or fewer." });
    }

    try {
      await databaseQuery(
        "INSERT INTO weekly_notes (user_id, week_start, notes) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE notes = VALUES(notes)",
        [req.userId, weekStart, notes],
      );
      return res.json({ success: true });
    } catch (error) {
      console.error("Failed to save weekly notes:", error.message);
      return res.status(500).json({
        success: false,
        message: "Server error. Could not save weekly notes.",
      });
    }
  });

  return router;
}

module.exports = createWeekRouter;
