import React, { useEffect, useRef, useState } from "react";
import "../stylesheet/Week.css";
import { apiFetch } from "../api";

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCurrentWeekStart = () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  start.setDate(start.getDate() - start.getDay());
  return start;
};

const getWeekDays = (weekStart, scores = new Map()) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    const key = formatDate(date);

    return {
      key,
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      dateNum: date.getDate(),
      score: Number(scores.get(key) || 0),
      isFuture: date > today,
      isToday: key === formatDate(today),
    };
  });
};

const formatWeekRange = (start) => {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const options = { weekday: "short", month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", options)} – ${end.toLocaleDateString("en-US", options)}`;
};

const WeekTracker = () => {
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart);
  const [daysData, setDaysData] = useState(() => getWeekDays(getCurrentWeekStart()));
  const [habitsSummary, setHabitsSummary] = useState([]);
  const [checkInNotes, setCheckInNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const notesTimer = useRef(null);

  const weekStartString = formatDate(weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndString = formatDate(weekEnd);

  useEffect(() => {
    const controller = new AbortController();

    const fetchWeekData = async () => {
      try {
        setLoading(true);
        const query = new URLSearchParams({ start: weekStartString, end: weekEndString });
        const response = await apiFetch(`/week?${query}`, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to fetch week data.");
        }

        const scores = new Map(
          (data.weekData || []).map((log) => [log.log_date, Number(log.daily_score) || 0]),
        );
        setDaysData(getWeekDays(weekStart, scores));
        setHabitsSummary(data.habitsSummary || []);
        setCheckInNotes(data.checkInNotes || "");
        setError(null);
      } catch (requestError) {
        if (requestError.name !== "AbortError") setError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchWeekData();
    return () => controller.abort();
  }, [weekStartString, weekEndString, weekStart]);

  useEffect(() => () => clearTimeout(notesTimer.current), []);

  const handleNotesChange = (event) => {
    const notes = event.target.value;
    setCheckInNotes(notes);
    clearTimeout(notesTimer.current);
    const notesWeekStart = weekStartString;
    notesTimer.current = setTimeout(async () => {
      try {
        const response = await apiFetch("/week/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ weekStart: notesWeekStart, notes }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to save weekly notes.");
        }
        setError(null);
      } catch (requestError) {
        setError(requestError.message);
      }
    }, 500);
  };

  const shiftWeek = (offset) => {
    setWeekStart((currentStart) => {
      const nextStart = new Date(currentStart);
      nextStart.setDate(nextStart.getDate() + offset * 7);
      return nextStart;
    });
  };

  const activeDays = daysData.filter((day) => !day.isFuture);
  const weeklyAvg = activeDays.length
    ? Math.round(activeDays.reduce((total, day) => total + day.score, 0) / activeDays.length)
    : 0;

  if (loading) {
    return <div className="tracker-wrapper"><div className="tracker-container">Loading week analytics...</div></div>;
  }

  return (
    <div className="tracker-wrapper">
      <div className="tracker-container">
        {error && <div className="error-banner" style={{ color: "red", marginBottom: "1rem" }}>{error}</div>}

        <div className="week-nav-header">
          <button type="button" className="nav-arrow-btn" aria-label="Previous week" onClick={() => shiftWeek(-1)}>‹</button>
          <span className="week-range-text">{formatWeekRange(weekStart)}</span>
          <button type="button" className="nav-arrow-btn" aria-label="Next week" onClick={() => shiftWeek(1)}>›</button>
        </div>

        <div className="card score-card">
          <div className="score-header">
            <span className="score-label">Weekly average</span>
            <span className="score-value">{weeklyAvg}%</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${weeklyAvg}%` }}></div>
          </div>
        </div>

        <div className="card chart-card">
          <div className="chart-bar-area">
            {daysData.map((day) => {
              const barHeight = day.isFuture ? 4 : Math.max(4, (day.score / 100) * 85);
              return (
                <div key={day.key} className="chart-column">
                  <div className="bar-wrapper">
                    <div
                      className={`bar-fill ${day.isFuture ? "future" : "past"}`}
                      style={{ height: `${barHeight}px` }}
                    ></div>
                  </div>
                  <div className="day-label-group">
                    <span className={`day-name ${day.isToday ? "active" : ""}`}>{day.day}</span>
                    <span className={`day-num ${day.isToday ? "active" : ""}`}>{day.dateNum}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="habits-summary-section">
          <label className="section-title">This week, by habit</label>
          <div className="habits-summary-list">
            {habitsSummary.length === 0 ? (
              <p className="habit-stat">Habit summaries will appear as you track each day.</p>
            ) : habitsSummary.map((item) => (
              <div key={item.id} className="card habit-summary-card">
                <div className="habit-info">
                  <span className={`badge ${(item.type || "Good").toLowerCase()}`}>{item.type}</span>
                  <span className="habit-title">{item.name}</span>
                </div>
                <span className="habit-stat">
                  {item.fullCount}/{item.totalCount} full · avg {item.avgScore}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="notes-section">
          <label className="notes-label" htmlFor="weekly-check-in">Weekly check-in</label>
          <textarea
            id="weekly-check-in"
            className="notes-textarea"
            placeholder="How did the week actually go? What's changing next week?"
            value={checkInNotes}
            onChange={handleNotesChange}
          ></textarea>
        </div>
      </div>
    </div>
  );
};

export default WeekTracker;
