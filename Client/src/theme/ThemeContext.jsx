import { createContext, useContext, useLayoutEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children, defaultTheme = "dark", storageKey }) {
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = window.localStorage.getItem(storageKey);
      if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
    } catch {
      // Fall back to the page's default when browser storage is unavailable.
    }
    return defaultTheme;
  });

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        theme === "dark"
          ? "#111813"
          : storageKey === "habit-tracker-public-theme"
            ? "#ffd83d"
            : "#f3f5ef",
      );

    try {
      window.localStorage.setItem(storageKey, theme);
    } catch {
      // The theme still works for this session when browser storage is unavailable.
    }
  }, [theme, storageKey]);

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme: () => setTheme((current) => current === "dark" ? "light" : "dark") }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
