import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sun,
  Moon,
  Clock3,
  ChartNoAxesColumn,
  CircleCheck,
  LogOut,
} from "lucide-react";
import { apiFetch } from "../api";
import "../stylesheet/Navbar.css";

const tabs = [
  {
    name: "Today",
    path: "/today",
    icon: Sun,
  },
  {
    name: "Tomorrow",
    path: "/tomorrow",
    icon: Moon,
  },
  {
    name: "History",
    path: "/history",
    icon: Clock3,
  },
  {
    name: "Week",
    path: "/week",
    icon: ChartNoAxesColumn,
  },
];

export default function Navbar() {
  const [today] = useState(() => new Date());
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const navigate = useNavigate();

  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError("");

    try {
      const response = await apiFetch("/logout", { method: "POST" });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not log out. Please try again.");
      }

      navigate("/login", { replace: true });
    } catch (error) {
      setLogoutError(error.message || "Could not reach the server. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="habit-header">
      <div className="habit-header-top">
        <div className="habit-brand">
          <h1>Habit Tracker</h1>
          <p>{formattedDate}</p>
        </div>

        <div className="header-actions">
          <div className="save-status">
            <CircleCheck size={16} strokeWidth={2} />
            <span>Saved</span>
          </div>
          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label={loggingOut ? "Logging out" : "Log out"}
          >
            <LogOut size={16} aria-hidden="true" />
            <span>{loggingOut ? "Logging out…" : "Log out"}</span>
          </button>
        </div>
      </div>

      {logoutError && (
        <p className="logout-error" role="alert">
          {logoutError}
        </p>
      )}

      <nav className="habit-navbar" aria-label="Habit tracker navigation">
        {tabs.map(({ name, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `habit-nav-link ${isActive ? "active" : ""}`
            }
          >
            <Icon size={17} strokeWidth={1.8} />
            <span>{name}</span>
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
