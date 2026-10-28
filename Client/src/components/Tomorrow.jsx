import React, { useState, useEffect } from "react";
import "../stylesheet/TomorrowTracker.css";
import { apiFetch } from "../api";

const TomorrowTracker = () => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitType, setNewHabitType] = useState("Good");
  const [newHabitWeight, setNewHabitWeight] = useState(3);

  // Fetch tomorrow's habits on mount
  useEffect(() => {
    const fetchTomorrowHabits = async () => {
      try {
        setLoading(true);
        const response = await apiFetch("/tomorrow", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to fetch tomorrow's routine.");
        }

        setHabits(data.habits || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTomorrowHabits();
  }, []);

  // Weight Increment / Decrement
  const handleWeightChange = async (id, delta) => {
    const currentHabit = habits.find((habit) => habit.id === id);
    if (!currentHabit) return;
    const updatedWeight = Math.min(100, Math.max(1, Number(currentHabit.weight) + delta));
    if (updatedWeight === Number(currentHabit.weight)) return;

    setHabits((prev) =>
      prev.map((habit) => habit.id === id ? { ...habit, weight: updatedWeight } : habit),
    );

    try {
      const response = await apiFetch(`/tomorrow/habit/${id}`, {
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
    } catch (err) {
      setHabits((prev) => prev.map((habit) => (
        habit.id === id ? { ...habit, weight: currentHabit.weight } : habit
      )));
      setError(err.message);
    }
  };

  // Delete Habit from Backend & State
  const handleDelete = async (id) => {
    try {
      const response = await apiFetch(`/tomorrow/habit/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete habit.");
      }

      setHabits((prev) => prev.filter((habit) => habit.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  // Add Habit to Backend & State
  const handleAddHabit = async (e) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    try {
      const response = await apiFetch("/tomorrow/habit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newHabitName.trim(),
          type: newHabitType,
          weight: newHabitWeight,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to add habit.");
      }

      setHabits((prev) => [...prev, data.habit]);
      setNewHabitName("");
      setNewHabitType("Good");
      setNewHabitWeight(3);
      setIsAdding(false);
    } catch (err) {
      setError(err.message);
    }
  };

  // Reset to match today's list via Backend
  const handleResetToToday = async () => {
    try {
      const response = await apiFetch("/tomorrow/reset", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to reset routine.");
      }

      setHabits(data.habits);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="tracker-wrapper"><div className="tracker-container">Loading tomorrow's routine...</div></div>;
  }

  return (
    <div className="tracker-wrapper">
      <div className="tracker-container">
        {error && <div className="error-banner" style={{ color: "red", marginBottom: "1rem" }}>{error}</div>}

        {/* Info Banner */}
        <div className="info-banner">
          <span className="banner-arrow">→</span>
          <span>
            Editing the routine for tomorrow. Today's tracking stays untouched.
          </span>
        </div>

        {/* Habits List */}
        <div className="habits-list">
          {habits.map((habit) => (
            <div key={habit.id} className="card habit-card">
              <div className="habit-top-row">
                <div className="habit-info">
                  <span className={`badge ${habit.type ? habit.type.toLowerCase() : "good"}`}>
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
                    onClick={() => handleDelete(habit.id)}
                    aria-label="Delete habit"
                  >
                    <svg
                      width="12"
                      height="12"
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
            </div>
          ))}
        </div>

        {/* Add Habit Card */}
        <div className="card add-card">
          {!isAdding ? (
            <button
              type="button"
              className="btn-open-add"
              onClick={() => setIsAdding(true)}
            >
              + Add habit
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

        {/* Reset Action Link */}
        <div className="reset-container">
          <button
            type="button"
            className="btn-reset-link"
            onClick={handleResetToToday}
          >
            Reset to match today's list
          </button>
        </div>
      </div>
    </div>
  );
};

export default TomorrowTracker;
