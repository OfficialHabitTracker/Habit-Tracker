import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import "../stylesheet/Today.css";
import { apiFetch } from "../api";

const Today = () => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitType, setNewHabitType] = useState("Good");
  const [newHabitWeight, setNewHabitWeight] = useState(3);
  const [notes, setNotes] = useState("");
  const [noteStatus, setNoteStatus] = useState("saved");
  const [noteError, setNoteError] = useState("");
  const noteSaveTimer = useRef(null);
  const noteRevision = useRef(0);

  useEffect(() => {
    const fetchTodayData = async () => {
      try {
        const response = await apiFetch("/today", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Could not load today's habits.");
        }
        setHabits(data.habits || []);
        setNotes(data.notes || "");
      } catch (requestError) {
        setError(requestError.message || "Could not reach the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchTodayData();
  }, []);

  const saveNotes = async (value, revision) => {
    try {
      const response = await apiFetch("/today/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes: value }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not save today's notes.");
      }
      if (revision === noteRevision.current) {
        setNoteStatus("saved");
        setNoteError("");
      }
    } catch (saveError) {
      if (revision === noteRevision.current) {
        setNoteStatus("error");
        setNoteError(saveError.message || "Could not save today's notes.");
      }
    }
  };

  useEffect(() => {
    if (loading) return undefined;

    setNoteStatus("saving");
    const revision = noteRevision.current;
    noteSaveTimer.current = window.setTimeout(() => {
      saveNotes(notes, revision);
    }, 650);

    return () => window.clearTimeout(noteSaveTimer.current);
  }, [loading, notes]);

  const handleNotesBlur = () => {
    window.clearTimeout(noteSaveTimer.current);
    setNoteStatus("saving");
    saveNotes(notes, noteRevision.current);
  };

  const totalWeight = habits.reduce(
    (total, habit) => total + Number(habit.weight || 0),
    0,
  );
  const earnedPoints = habits.reduce((total, habit) => {
    const weight = Number(habit.weight || 0);
    if (habit.status === "Done") return total + weight;
    if (habit.status === "Partial") return total + weight * 0.5;
    return total;
  }, 0);
  const scorePercentage = totalWeight
    ? Math.round((earnedPoints / totalWeight) * 100)
    : 0;
  const completedCount = habits.filter((habit) => habit.status === "Done").length;

  const handleStatusChange = async (id, newStatus) => {
    const currentHabit = habits.find((habit) => habit.id === id);
    if (!currentHabit || currentHabit.status === newStatus) return;

    setHabits((current) => current.map((habit) =>
      habit.id === id ? { ...habit, status: newStatus } : habit,
    ));
    try {
      const response = await apiFetch(`/today/habit/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not save this update.");
      }
      setError("");
    } catch (requestError) {
      setHabits((current) => current.map((habit) =>
        habit.id === id ? { ...habit, status: currentHabit.status } : habit,
      ));
      setError(requestError.message || "Could not save this update.");
    }
  };

  const handleWeightChange = async (id, delta) => {
    const currentHabit = habits.find((habit) => habit.id === id);
    if (!currentHabit) return;
    const updatedWeight = Math.min(5, Math.max(1, Number(currentHabit.weight) + delta));
    if (updatedWeight === Number(currentHabit.weight)) return;

    setHabits((current) => current.map((habit) =>
      habit.id === id ? { ...habit, weight: updatedWeight } : habit,
    ));
    try {
      const response = await apiFetch(`/today/habit/${id}`, {
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

  const handleDeleteHabit = async (id) => {
    try {
      const response = await apiFetch(`/today/habit/${id}`, {
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

  if (loading) {
    return (
      <div className="tracker-wrapper">
        <div className="tracker-container loading-state" role="status">Loading your habits…</div>
      </div>
    );
  }

  return (
    <main className="tracker-wrapper">
      <div className="tracker-container">
        <div className="page-heading">
          <div>
            <span className="page-eyebrow">DAILY CHECK-IN</span>
            <h2>Make today count.</h2>
            <p>Small steps add up. Pick a pace you can keep.</p>
          </div>
          <span className="habit-count-pill">{habits.length} of 5 habits</span>
        </div>

        {error && <div className="error-banner" role="alert">{error}</div>}

        <section className="card score-card" aria-label="Today's progress">
          <div className="score-header">
            <div className="score-copy">
              <span className="score-label">Today's progress</span>
              <span className="score-subtitle">{completedCount} of {habits.length} complete</span>
            </div>
            <span className="score-value">{scorePercentage}<small>%</small></span>
          </div>
          <div
            className="progress-bar-bg"
            role="progressbar"
            aria-label="Today's score"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={scorePercentage}
          >
            <div className="progress-bar-fill" style={{ width: `${scorePercentage}%` }} />
          </div>
          <p className="score-footnote">
            {habits.length === 0
              ? "Add your first habit to start today's check-in."
              : "Partial progress counts too. Keep going at your own pace."}
          </p>
        </section>

        <section className="habits-list" aria-label="Your habits">
          {habits.length === 0 && (
            <div className="empty-state">
              <span className="empty-state-mark" aria-hidden="true">✳</span>
              <strong>A good day starts small.</strong>
              <span>Add one habit you want to show up for.</span>
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
                    onClick={() => handleDeleteHabit(habit.id)}
                    aria-label={`Delete ${habit.name}`}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="status-selector" role="group" aria-label={`Today's progress for ${habit.name}`}>
                {["Done", "Partial", "Missed"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`status-btn ${habit.status === status ? `active-${status.toLowerCase()}` : ""}`}
                    onClick={() => handleStatusChange(habit.id, status)}
                    aria-pressed={habit.status === status}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className={`card add-card ${habits.length >= 5 ? "limit-reached" : ""}`}>
          {habits.length >= 5 ? (
            <p className="limit-message">Your daily plan is full. Five habits is plenty to focus on.</p>
          ) : !isAdding ? (
            <button type="button" className="btn-open-add" onClick={() => setIsAdding(true)}>
              <span aria-hidden="true">+</span> Add a habit
            </button>
          ) : (
            <form onSubmit={handleAddHabit} className="add-form">
              <label className="form-label" htmlFor="new-habit-name">What would you like to practice?</label>
              <input
                id="new-habit-name"
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

        <section className="notes-section card">
          <div className="notes-heading">
            <label className="notes-label" htmlFor="daily-notes">A note to yourself</label>
            <span className={`notes-save-status ${noteStatus}`} aria-live="polite">
              {noteStatus === "saving" ? "Saving…" : noteStatus === "error" ? "Not saved" : "Saved"}
            </span>
          </div>
          <textarea
            className="notes-textarea"
            id="daily-notes"
            maxLength={5000}
            placeholder="What helped today? What would you like to remember?"
            value={notes}
            onChange={(event) => {
              noteRevision.current += 1;
              setNotes(event.target.value);
              setNoteError("");
            }}
            onBlur={handleNotesBlur}
          />
          <div className="notes-footer">
            <span>{notes.length} / 5,000</span>
            {noteError && <span role="alert">{noteError}</span>}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Today;
