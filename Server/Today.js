const express = require("express");
const requireLogin = require("./auth");

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calculateScore(habits) {
  const totalWeight = habits.reduce((total, habit) => total + Number(habit.weight || 0), 0);
  if (totalWeight === 0) return 0;

  const earned = habits.reduce((total, habit) => {
    const weight = Number(habit.weight || 0);
    if (habit.status === "Done") return total + weight;
    if (habit.status === "Partial") return total + weight * 0.5;
    return total;
  }, 0);

  return Math.round((earned / totalWeight) * 100);
}

async function saveDailyHabit(databaseQuery, userId, date, habit) {
  await databaseQuery(
    `INSERT INTO daily_habit_logs (user_id, log_date, habit_id, name, type, weight, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type), weight = VALUES(weight), status = VALUES(status)`,
    [userId, date, habit.id, habit.name, habit.type, habit.weight, habit.status],
  );
}

async function refreshDailyScore(databaseQuery, userId, date) {
  const habits = await databaseQuery(
    "SELECT weight, status FROM daily_habit_logs WHERE user_id = ? AND log_date = ?",
    [userId, date],
  );
  const score = calculateScore(habits);
  const logs = await databaseQuery(
    "SELECT id FROM daily_logs WHERE user_id = ? AND log_date = ? ORDER BY id DESC LIMIT 1",
    [userId, date],
  );

  if (logs.length > 0) {
    await databaseQuery("UPDATE daily_logs SET daily_score = ? WHERE id = ?", [score, logs[0].id]);
  } else {
    await databaseQuery(
      "INSERT INTO daily_logs (user_id, log_date, daily_score) VALUES (?, ?, ?)",
      [userId, date, score],
    );
  }
}

function createTodayRouter({ databaseQuery, jwtSecret }) {
  const router = express.Router();
  router.use(requireLogin(jwtSecret));

  router.get("/", async (req, res) => {
    const date = getLocalDateString();
    try {
      const habits = await databaseQuery(
        "SELECT id, name, type, weight FROM habits WHERE user_id = ? ORDER BY id",
        [req.userId],
      );
      const savedHabits = await databaseQuery(
        "SELECT habit_id AS id, name, type, weight, status FROM daily_habit_logs WHERE user_id = ? AND log_date = ?",
        [req.userId, date],
      );
      const savedById = new Map(savedHabits.map((habit) => [String(habit.id), habit]));

      for (const habit of habits) {
        if (!savedById.has(String(habit.id))) {
          const todayHabit = { ...habit, status: "Missed" };
          await saveDailyHabit(databaseQuery, req.userId, date, todayHabit);
          savedById.set(String(habit.id), todayHabit);
        }
      }

      await refreshDailyScore(databaseQuery, req.userId, date);
      return res.json({
        success: true,
        habits: habits.map((habit) => savedById.get(String(habit.id))),
        notes: "",
      });
    } catch (error) {
      console.error("Failed to fetch today's data:", error.message);
      return res.status(500).json({
        success: false,
        message: "Server error. Could not fetch habits.",
      });
    }
  });

  router.post("/habit", async (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const type = req.body?.type;
    const weight = Number(req.body?.weight);
    const status = req.body?.status || "Missed";

    if (
      !name ||
      name.length > 100 ||
      !["Good", "Bad"].includes(type) ||
      !Number.isSafeInteger(weight) ||
      weight < 1 ||
      weight > 100 ||
      !["Done", "Partial", "Missed"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a habit name, type, weight, and valid status.",
      });
    }

    try {
      const result = await databaseQuery(
        "INSERT INTO habits (user_id, name, type, weight, status) VALUES (?, ?, ?, ?, ?)",
        [req.userId, name, type, weight, status],
      );
      const habit = { id: result.insertId, name, type, weight, status };
      const date = getLocalDateString();
      await saveDailyHabit(databaseQuery, req.userId, date, habit);
      await refreshDailyScore(databaseQuery, req.userId, date);
      return res.status(201).json({ success: true, habit });
    } catch (error) {
      console.error("Failed to add habit:", error.message);
      return res.status(500).json({
        success: false,
        message: "Server error. Could not save the habit.",
      });
    }
  });

  router.patch("/habit/:id", async (req, res) => {
    const habitId = Number(req.params.id);
    const { status, weight } = req.body || {};

    if (!Number.isSafeInteger(habitId) || habitId < 1) {
      return res.status(400).json({ success: false, message: "Invalid habit id." });
    }

    if (status !== undefined && !["Done", "Partial", "Missed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid habit status." });
    }

    const parsedWeight = weight === undefined ? undefined : Number(weight);
    if (parsedWeight !== undefined && (!Number.isSafeInteger(parsedWeight) || parsedWeight < 1 || parsedWeight > 100)) {
      return res.status(400).json({ success: false, message: "Weight must be between 1 and 100." });
    }
    if (status === undefined && parsedWeight === undefined) {
      return res.status(400).json({ success: false, message: "No habit changes were provided." });
    }

    const date = getLocalDateString();
    try {
      const currentHabits = await databaseQuery(
        "SELECT id, name, type, weight, status FROM habits WHERE id = ? AND user_id = ? LIMIT 1",
        [habitId, req.userId],
      );
      if (currentHabits.length === 0) {
        return res.status(404).json({ success: false, message: "Habit not found." });
      }

      const current = currentHabits[0];
      const currentSnapshot = await databaseQuery(
        "SELECT status FROM daily_habit_logs WHERE user_id = ? AND log_date = ? AND habit_id = ? LIMIT 1",
        [req.userId, date, habitId],
      );
      const updatedHabit = {
        ...current,
        weight: parsedWeight ?? Number(current.weight),
        status: status ?? currentSnapshot[0]?.status ?? "Missed",
      };

      const assignments = [];
      const values = [];
      if (status !== undefined) {
        assignments.push("status = ?");
        values.push(status);
      }
      if (parsedWeight !== undefined) {
        assignments.push("weight = ?");
        values.push(parsedWeight);
      }
      values.push(habitId, req.userId);
      await databaseQuery(
        `UPDATE habits SET ${assignments.join(", ")} WHERE id = ? AND user_id = ?`,
        values,
      );

      await saveDailyHabit(databaseQuery, req.userId, date, updatedHabit);
      await refreshDailyScore(databaseQuery, req.userId, date);
      return res.json({ success: true });
    } catch (error) {
      console.error("Failed to update habit:", error.message);
      return res.status(500).json({ success: false, message: "Server error. Could not update the habit." });
    }
  });

  router.delete("/habit/:id", async (req, res) => {
    const habitId = Number(req.params.id);
    if (!Number.isSafeInteger(habitId) || habitId < 1) {
      return res.status(400).json({ success: false, message: "Invalid habit id." });
    }

    const date = getLocalDateString();
    try {
      const result = await databaseQuery(
        "DELETE FROM habits WHERE id = ? AND user_id = ?",
        [habitId, req.userId],
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Habit not found." });
      }

      await databaseQuery(
        "DELETE FROM daily_habit_logs WHERE user_id = ? AND log_date = ? AND habit_id = ?",
        [req.userId, date, habitId],
      );
      await refreshDailyScore(databaseQuery, req.userId, date);
      return res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete habit:", error.message);
      return res.status(500).json({
        success: false,
        message: "Server error. Could not delete the habit.",
      });
    }
  });

  return router;
}

module.exports = createTodayRouter;
