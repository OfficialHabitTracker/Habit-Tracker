import { Moon, Sun } from "lucide-react";
import { useTheme } from "../theme/ThemeContext";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      aria-pressed={theme === "dark"}
      title={`Switch to ${nextTheme} mode`}
    >
      <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
      <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
