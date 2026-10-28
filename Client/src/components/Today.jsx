import React, { useState, useEffect } from "react";
import "../stylesheet/Today.css";
import { apiFetch } from "../api";

const Today = () => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isAdding, setIsAdding] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitType, setNewHabitType] = useState("Good");
  const [newHabitWeight, setNewHabitWeight] = useState(3);
  const [notes, setNotes] = useState("");

  // 1. Fetch habits and today's data from backend on mount
  useEffect(() => {
    const fetchTodayData = async () => {
      try {
        setLoading(true);
        const response = await apiFetch("/today", {
          method: "GET", // Use GET to fetch data (or POST if your backend strictly requires POST)
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Data not fetched. Please try again...",
          );
        }

        setHabits(data.habits || []);
        if (data.notes) setNotes(data.notes);
      } catch (requestError) {
        setError(
          requestError.message ||
            "Could not reach the server. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTodayData();
  }, []);

  // Calculate score percentage
  const calculateScore = () => {
    let totalPossible = 0;
    let earnedPoints = 0;

    habits.forEach((habit) => {
      const weight = Number(habit.weight) || 0;
      totalPossible += weight;

      if (habit.status === "Done") {
        earnedPoints += weight;
      } else if (habit.status === "Partial") {
        earnedPoints += weight * 0.5;
      }
    });

    if (totalPossible === 0) return 0;
    return Math.round((earnedPoints / totalPossible) * 100);
  };

  const handleStatusChange = async (id, newStatus) => {
    const currentHabit = habits.find((habit) => habit.id === id);
    if (!currentHabit || currentHabit.status === newStatus) return;

    setHabits((prev) =>
      prev.map((habit) =>
        habit.id === id ? { ...habit, status: newStatus } : habit,
      ),
    );

    try {
      const response = await apiFetch(`/today/habit/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save habit status.");
      }
      setError(null);
    } catch (requestError) {
      setHabits((prev) => prev.map((habit) => (
        habit.id === id ? { ...habit, status: currentHabit.status } : habit
      )));
      setError(requestError.message);
    }
  };

  const handleWeightChange = async (id, delta) => {
    const currentHabit = habits.find((habit) => habit.id === id);
    if (!currentHabit) return;
    const updatedWeight = Math.min(100, Math.max(1, Number(currentHabit.weight) + delta));
    if (updatedWeight === Number(currentHabit.weight)) return;

    setHabits((prev) =>
      prev.map((habit) => habit.id === id ? { ...habit, weight: updatedWeight } : habit),
    );

    try {
      const response = await apiFetch(`/today/habit/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ weight: updatedWeight }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save habit weight.");
      }
      setError(null);
    } catch (requestError) {
      setHabits((prev) => prev.map((habit) => (
        habit.id === id ? { ...habit, weight: currentHabit.weight } : habit
      )));
      setError(requestError.message);
    }
  };

  // 2. Delete habit from backend and update state
  const handleDeleteHabit = async (id) => {
    try {
      const response = await apiFetch(
        `/today/habit/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete habit from backend.");
      }

      setHabits((prev) => prev.filter((habit) => habit.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  // 3. Add habit to backend and update state
  const handleAddHabit = async (e) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    try {
      const response = await apiFetch("/today/habit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newHabitName.trim(),
          type: newHabitType,
          weight: newHabitWeight,
          status: "Missed",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save habit to backend.");
      }

      // Use the habit object returned by your backend (which includes the real database ID)
      setHabits((prev) => [...prev, data.habit]);

      setNewHabitName("");
      setNewHabitType("Good");
      setNewHabitWeight(3);
      setIsAdding(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const scorePercentage = calculateScore();

  if (loading) {
    return (
      <div className="tracker-wrapper">
        <div className="tracker-container">Loading habits...</div>
      </div>
    );
  }

  return (
    <div className="tracker-wrapper">
      <div className="tracker-container">
        {error && (
          <div
            className="error-banner"
            style={{ color: "red", marginBottom: "1rem" }}
          >
            {error}
          </div>
        )}

        {/* Score Header */}
        <div className="card score-card">
          <div className="score-header">
            <span className="score-label">Today's score</span>
            <span className="score-value">{scorePercentage}%</span>
          </div>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{ width: `${scorePercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Habit Cards */}
        <div className="habits-list">
          {habits.map((habit) => (
            <div key={habit.id} className="card habit-card">
              <div className="habit-top-row">
                <div className="habit-info">
                  <span
                    className={`badge ${habit.type ? habit.type.toLowerCase() : "good"}`}
                  >
                    {habit.type}
                  </span>
                  <span className="habit-title">{habit.name}</span>
                </div>
                <div className="habit-controls">
                  <div className="counter">
                    <button
                      type="button"
                      className="btn-counter"
                      onClick={() => handleWeightChange(habit.id, -1)}
                    >
                      –
                    </button>
                    <span className="counter-val">{habit.weight}</span>
                    <button
                      type="button"
                      className="btn-counter"
                      onClick={() => handleWeightChange(habit.id, 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={() => handleDeleteHabit(habit.id)}
                    aria-label="Delete habit"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Status Selector */}
              <div className="status-selector">
                <button
                  type="button"
                  className={`status-btn ${
                    habit.status === "Done" ? "active-done" : ""
                  }`}
                  onClick={() => handleStatusChange(habit.id, "Done")}
                >
                  Done
                </button>
                <button
                  type="button"
                  className={`status-btn ${
                    habit.status === "Partial" ? "active-partial" : ""
                  }`}
                  onClick={() => handleStatusChange(habit.id, "Partial")}
                >
                  Partial
                </button>
                <button
                  type="button"
                  className={`status-btn ${
                    habit.status === "Missed" ? "active-missed" : ""
                  }`}
                  onClick={() => handleStatusChange(habit.id, "Missed")}
                >
                  Missed
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Habit Form / Button */}
        <div className="card add-card">
          {!isAdding ? (
            <button
              type="button"
              className="btn-open-add"
              onClick={() => setIsAdding(true)}
            >
              + Add New Habit
            </button>
          ) : (
            <form onSubmit={handleAddHabit} className="add-form">
              <input
                type="text"
                className="input-text"
                placeholder="Enter habit title..."
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                autoFocus
              />

              <div className="add-controls">
                <div className="type-selector">
                  <button
                    type="button"
                    className={`type-btn ${
                      newHabitType === "Good" ? "active-good" : ""
                    }`}
                    onClick={() => setNewHabitType("Good")}
                  >
                    Good
                  </button>
                  <button
                    type="button"
                    className={`type-btn ${
                      newHabitType === "Bad" ? "active-bad" : ""
                    }`}
                    onClick={() => setNewHabitType("Bad")}
                  >
                    Bad
                  </button>
                </div>

                <div className="counter">
                  <button
                    type="button"
                    className="btn-counter"
                    onClick={() => setNewHabitWeight((w) => Math.max(1, w - 1))}
                  >
                    –
                  </button>
                  <span className="counter-val">{newHabitWeight}</span>
                  <button
                    type="button"
                    className="btn-counter"
                    onClick={() => setNewHabitWeight((w) => Math.min(100, w + 1))}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-submit">
                  Add
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsAdding(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Notes Section */}
        <div className="notes-section">
          <label className="notes-label">Notes for today (optional)</label>
          <textarea
            className="notes-textarea"
            placeholder="Anything worth remembering about today..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          ></textarea>
        </div>
      </div>
    </div>
  );
};

export default Today;
