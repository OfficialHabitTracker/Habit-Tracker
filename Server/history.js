const express = require("express");
const requireLogin = require("./auth");

function createHistoryRouter({ databaseQuery, jwtSecret }) {
  const router = express.Router();
  router.use(requireLogin(jwtSecret));

  router.get("/", async (req, res) => {
    try {
      const rows = await databaseQuery(
        "SELECT id, DATE_FORMAT(log_date, '%Y-%m-%d') AS log_date, daily_score FROM daily_logs WHERE user_id = ? ORDER BY log_date DESC, id DESC",
        [req.userId],
      );

      const latestByDate = new Map();
      for (const row of rows) {
        if (!latestByDate.has(row.log_date)) latestByDate.set(row.log_date, row);
      }
      const history = [...latestByDate.values()];
      if (history.length === 0) {
        return res.json({ success: true, history: [] });
      }

      const dates = history.map((log) => log.log_date);
      const placeholders = dates.map(() => "?").join(", ");
      const habitRows = await databaseQuery(
        `SELECT DATE_FORMAT(log_date, '%Y-%m-%d') AS log_date, habit_id AS id, name, type, weight, status
         FROM daily_habit_logs
         WHERE user_id = ? AND log_date IN (${placeholders})
         ORDER BY log_date DESC, habit_id ASC`,
        [req.userId, ...dates],
      );
      const habitsByDate = new Map();
      for (const habit of habitRows) {
        const date = habit.log_date;
        const habits = habitsByDate.get(date) || [];
        habits.push(habit);
        habitsByDate.set(date, habits);
      }

      return res.json({
        success: true,
        history: history.map((log) => ({
          ...log,
          habits: habitsByDate.get(log.log_date) || [],
        })),
      });
    } catch (error) {
      console.error("Failed to fetch history data:", error.message);
      return res.status(500).json({
        success: false,
        message: "Server error. Could not fetch history.",
      });
    }
  });

  return router;
}

module.exports = createHistoryRouter;
