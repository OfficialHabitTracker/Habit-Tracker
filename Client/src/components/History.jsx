import React, { useState, useEffect } from "react";
import "../stylesheet/History.css";
import { apiFetch } from "../api";

const History = () => {
  const [historyData, setHistoryData] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Fetch History Logs on Component Load
  useEffect(() => {
    const controller = new AbortController();

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await apiFetch("/history", {
          method: "GET",
          credentials: "include", // Send HTTP-only cookie token
          signal: controller.signal,
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to fetch history records.");
        }

        const formattedHistory = (data.history || []).map((log) => {
          const [year, month, day] = log.log_date.split("-").map(Number);
          const localDate = new Date(year, month - 1, day);

          return {
          id: log.id,
          dateLabel: localDate.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          }),
          score: Number(log.daily_score) || 0,
          habits: log.habits || [],
          };
        });

        setHistoryData(formattedHistory);
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchHistory();
    return () => controller.abort();
  }, []);

  const handleRowClick = (item) => {
    setSelectedId((prev) => (prev === item.id ? null : item.id));
  };

  // Helper to assign text color based on score percentage
  const getScoreColorClass = (score) => {
    if (score === 0) return "score-pink";
    if (score < 50) return "score-yellow";
    return "score-green";
  };

  if (loading) {
    return (
      <div className="tracker-wrapper">
        <div className="tracker-container">Loading history...</div>
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

        <div className="history-list">
          {historyData.length === 0 ? (
            <div
              style={{ color: "#8a99ad", textAlign: "center", padding: "20px" }}
            >
              No history records found.
            </div>
          ) : (
            historyData.map((item) => {
              const isExpanded = selectedId === item.id;
              const scoreClass = getScoreColorClass(item.score);

              return (
                <div key={item.id} className="history-card-wrapper">
                  <div
                    className={`card history-card ${isExpanded ? "expanded" : ""}`}
                    onClick={() => handleRowClick(item)}
                  >
                    <span className="history-date">{item.dateLabel}</span>
                    <div className="history-right">
                      <span className={`history-score ${scoreClass}`}>
                        {item.score}%
                      </span>
                      <span className={`chevron ${isExpanded ? "open" : ""}`}>
                        ›
                      </span>
                    </div>
                  </div>

                  {/* Expandable Breakdown view when clicked */}
                  {isExpanded && (
                    <div className="history-details">
                      {item.habits && item.habits.length > 0 ? (
                        item.habits.map((h) => (
                          <div key={h.id} className="detail-row">
                            <div className="detail-info">
                              <span
                                className={`badge ${h.type ? h.type.toLowerCase() : "good"}`}
                              >
                                {h.type}
                              </span>
                              <span className="detail-name">{h.name}</span>
                            </div>
                            <span
                              className={`detail-status status-${h.status ? h.status.toLowerCase() : "missed"}`}
                            >
                              {h.status} ({h.weight})
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="detail-empty">
                          No habits logged for this date
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
