import { useEffect, useState } from "react";
import { ArrowRight, Trash2 } from "lucide-react";
import "../stylesheet/TomorrowTracker.css";
import { apiFetch } from "../api";

const TomorrowTracker = () => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitType, setNewHabitType] = useState("Good");
  const [newHabitWeight, setNewHabitWeight] = useState(3);

  useEffect(() => {
    const fetchTomorrowHabits = async () => {
      try {
        const response = await apiFetch("/tomorrow", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Could not load tomorrow's routine.");
        }
        setHabits(data.habits || []);
      } catch (requestError) {
        setError(requestError.message || "Could not reach the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchTomorrowHabits();
  }, []);

  const handleWeightChange = async (id, delta) => {
    const currentHabit = habits.find((habit) => habit.id === id);
    if (!currentHabit) return;
    const updatedWeight = Math.min(5, Math.max(1, Number(currentHabit.weight) + delta));
    if (updatedWeight === Number(currentHabit.weight)) return;

    setHabits((current) => current.map((habit) =>
      habit.id === id ? { ...habit, weight: updatedWeight } : habit,
    ));
    try {
      const response = await apiFetch(`/tomorrow/habit/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ weight: updatedWeight }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not save this weight.");
      }
      setError("");
    } catch (requestError) {
      setHabits((current) => current.map((habit) =>
        habit.id === id ? { ...habit, weight: currentHabit.weight } : habit,
      ));
      setError(requestError.message || "Could not save this weight.");
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await apiFetch(`/tomorrow/habit/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not delete this habit.");
      }
      setHabits((current) => current.filter((habit) => habit.id !== id));
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Could not delete this habit.");
    }
  };

  const handleAddHabit = async (event) => {
    event.preventDefault();
    if (!newHabitName.trim() || habits.length >= 5 || isSubmitting) return;

    setIsSubmitting(true);
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
        throw new Error(data.message || "Could not add this habit.");
      }
      setHabits((current) => [...current, data.habit]);
      setNewHabitName("");
      setNewHabitType("Good");
      setNewHabitWeight(3);
      setIsAdding(false);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Could not add this habit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToToday = async () => {
    try {
      const response = await apiFetch("/tomorrow/reset", {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not copy today's routine.");
      }
      setHabits(data.habits || []);
      setIsAdding(false);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Could not copy today's routine.");
    }
  };

  if (loading) {
    return (
      <div className="tracker-wrapper">
        <div className="tracker-container loading-state" role="status">Loading tomorrow's routine…</div>
      </div>
    );
  }

  return (
    <main className="tracker-wrapper">
      <div className="tracker-container">
        <div className="page-heading">
          <div>
            <span className="page-eyebrow">A FRESH START</span>
            <h2>Set up tomorrow.</h2>
            <p>Keep the plan kind, clear, and doable.</p>
          </div>
          <span className="habit-count-pill">{habits.length} of 5 habits</span>
        </div>

        {error && <div className="error-banner" role="alert">{error}</div>}

        <div className="info-banner">
          <ArrowRight size={17} aria-hidden="true" />
          <span>Plan tomorrow here. Your check-in for today stays untouched.</span>
        </div>

        <section className="habits-list" aria-label="Tomorrow's habits">
          {habits.length === 0 && (
            <div className="empty-state">
              <span className="empty-state-mark" aria-hidden="true">↗</span>
              <strong>Make room for what matters.</strong>
              <span>Add a small, realistic intention for tomorrow.</span>
            </div>
          )}
          {habits.map((habit) => (
            <article key={habit.id} className="card habit-card">
              <div className="habit-top-row">
                <div className="habit-info">
                  <span className={`badge ${habit.type ? habit.type.toLowerCase() : "good"}`}>
                    {habit.type || "Good"}
                  </span>
                  <span className="habit-title">{habit.name}</span>
                </div>
                <div className="habit-controls">
                  <div className="counter" aria-label={`Weight ${habit.weight} out of 5`}>
                    <span className="weight-label">Weight</span>
                    <button
                      type="button"
                      className="btn-counter"
                      onClick={() => handleWeightChange(habit.id, -1)}
                      disabled={Number(habit.weight) <= 1}
                      aria-label={`Lower ${habit.name} weight`}
                    >−</button>
                    <span className="counter-val">{habit.weight}</span>
                    <button
                      type="button"
                      className="btn-counter"
                      onClick={() => handleWeightChange(habit.id, 1)}
                      disabled={Number(habit.weight) >= 5}
                      aria-label={`Raise ${habit.name} weight`}
                    >+</button>
                  </div>
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={() => handleDelete(habit.id)}
                    aria-label={`Delete ${habit.name}`}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className={`card add-card ${habits.length >= 5 ? "limit-reached" : ""}`}>
          {habits.length >= 5 ? (
            <p className="limit-message">Tomorrow's plan is full. A short list is easier to follow through on.</p>
          ) : !isAdding ? (
            <button type="button" className="btn-open-add" onClick={() => setIsAdding(true)}>
              <span aria-hidden="true">+</span> Add a habit
            </button>
          ) : (
            <form onSubmit={handleAddHabit} className="add-form">
              <label className="form-label" htmlFor="tomorrow-habit-name">What would you like to practice?</label>
              <input
                id="tomorrow-habit-name"
                type="text"
                className="input-text"
                placeholder="e.g. Take a short walk"
                maxLength={100}
                value={newHabitName}
                onChange={(event) => setNewHabitName(event.target.value)}
                autoFocus
                required
              />
              <div className="add-controls">
                <div className="type-choice">
                  <span className="form-label">Habit type</span>
                  <div className="type-selector" role="group" aria-label="Habit type">
                    {["Good", "Bad"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={`type-btn ${newHabitType === type ? `active-${type.toLowerCase()}` : ""}`}
                        onClick={() => setNewHabitType(type)}
                        aria-pressed={newHabitType === type}
                      >{type}</button>
                    ))}
                  </div>
                </div>
                <div className="new-weight-control">
                  <span className="form-label">Importance · {newHabitWeight} / 5</span>
                  <div className="counter" aria-label={`Importance ${newHabitWeight} out of 5`}>
                    <button
                      type="button"
                      className="btn-counter"
                      onClick={() => setNewHabitWeight((weight) => Math.max(1, weight - 1))}
                      disabled={newHabitWeight <= 1}
                      aria-label="Lower importance"
                    >−</button>
                    <span className="counter-val">{newHabitWeight}</span>
                    <button
                      type="button"
                      className="btn-counter"
                      onClick={() => setNewHabitWeight((weight) => Math.min(5, weight + 1))}
                      disabled={newHabitWeight >= 5}
                      aria-label="Raise importance"
                    >+</button>
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-submit" disabled={isSubmitting || !newHabitName.trim()}>
                  {isSubmitting ? "Adding…" : "Add habit"}
                </button>
                <button type="button" className="btn-cancel" onClick={() => setIsAdding(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        <div className="reset-container">
          <button type="button" className="btn-reset-link" onClick={handleResetToToday}>
            Copy today's habits into tomorrow
          </button>
        </div>
      </div>
    </main>
  );
};

export default TomorrowTracker;
