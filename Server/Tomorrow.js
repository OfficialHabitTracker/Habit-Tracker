const express = require("express");
const requireLogin = require("./auth");

function createTomorrowRouter({ databaseQuery, jwtSecret }) {
  const router = express.Router();
  router.use(requireLogin(jwtSecret));

  router.get("/", async (req, res) => {
    try {
      const habits = await databaseQuery(
        "SELECT id, name, type, weight FROM tomorrow_habits WHERE user_id = ? ORDER BY id",
        [req.userId],
      );
      return res.json({ success: true, habits });
    } catch (error) {
      console.error("Failed to fetch tomorrow's habits:", error.message);
      return res.status(500).json({
        success: false,
        message: "Server error. Could not fetch tomorrow's habits.",
      });
    }
  });

  router.post("/habit", async (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const type = req.body?.type;
    const weight = Number(req.body?.weight);

    if (
      !name ||
      name.length > 100 ||
      !["Good", "Bad"].includes(type) ||
      !Number.isSafeInteger(weight) ||
      weight < 1 ||
      weight > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a habit name, type, and weight between 1 and 100.",
      });
    }

    try {
      const result = await databaseQuery(
        "INSERT INTO tomorrow_habits (user_id, name, type, weight) VALUES (?, ?, ?, ?)",
        [req.userId, name, type, weight],
      );
      return res.status(201).json({
        success: true,
        habit: { id: result.insertId, name, type, weight },
      });
    } catch (error) {
      console.error("Failed to add tomorrow's habit:", error.message);
      return res.status(500).json({
        success: false,
        message: "Server error. Could not save tomorrow's habit.",
      });
    }
  });

  router.patch("/habit/:id", async (req, res) => {
    const habitId = Number(req.params.id);
    const weight = Number(req.body?.weight);
    if (!Number.isSafeInteger(habitId) || habitId < 1) {
      return res.status(400).json({ success: false, message: "Invalid habit id." });
    }
    if (!Number.isSafeInteger(weight) || weight < 1 || weight > 100) {
      return res.status(400).json({ success: false, message: "Weight must be between 1 and 100." });
    }

    try {
      const result = await databaseQuery(
        "UPDATE tomorrow_habits SET weight = ? WHERE id = ? AND user_id = ?",
        [weight, habitId, req.userId],
      );
      if (result.affectedRows === 0) {
        const existing = await databaseQuery(
          "SELECT id FROM tomorrow_habits WHERE id = ? AND user_id = ?",
          [habitId, req.userId],
        );
        if (existing.length === 0) {
          return res.status(404).json({ success: false, message: "Habit not found." });
        }
      }
      return res.json({ success: true });
    } catch (error) {
      console.error("Failed to update tomorrow's habit:", error.message);
      return res.status(500).json({
        success: false,
        message: "Server error. Could not update tomorrow's habit.",
      });
    }
  });

  router.delete("/habit/:id", async (req, res) => {
    const habitId = Number(req.params.id);
    if (!Number.isSafeInteger(habitId) || habitId < 1) {
      return res.status(400).json({ success: false, message: "Invalid habit id." });
    }

    try {
      const result = await databaseQuery(
        "DELETE FROM tomorrow_habits WHERE id = ? AND user_id = ?",
        [habitId, req.userId],
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Habit not found." });
      }
      return res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete tomorrow's habit:", error.message);
      return res.status(500).json({
        success: false,
        message: "Server error. Could not delete tomorrow's habit.",
      });
    }
  });

  router.post("/reset", async (req, res) => {
    try {
      const todayHabits = await databaseQuery(
        "SELECT name, type, weight FROM habits WHERE user_id = ? ORDER BY id",
        [req.userId],
      );
      await databaseQuery("DELETE FROM tomorrow_habits WHERE user_id = ?", [req.userId]);

      if (todayHabits.length > 0) {
        const rows = todayHabits.map(() => "(?, ?, ?, ?)").join(", ");
        const values = todayHabits.flatMap((habit) => [
          req.userId,
          habit.name,
          habit.type,
          habit.weight,
        ]);
        await databaseQuery(
          `INSERT INTO tomorrow_habits (user_id, name, type, weight) VALUES ${rows}`,
          values,
        );
      }

      const habits = await databaseQuery(
        "SELECT id, name, type, weight FROM tomorrow_habits WHERE user_id = ? ORDER BY id",
        [req.userId],
      );
      return res.json({ success: true, habits });
    } catch (error) {
      console.error("Failed to reset tomorrow's habits:", error.message);
      return res.status(500).json({
        success: false,
        message: "Server error. Could not reset tomorrow's habits.",
      });
    }
  });

  return router;
}

module.exports = createTomorrowRouter;
