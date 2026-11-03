import { StrictMode } from "react";
import Home from "./components/Home";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { createBrowserRouter, redirect } from "react-router-dom";
import Login from "./components/login.jsx";
import ForgotPassword from "./components/ForgotPassword.jsx";
import Signup from "./components/signup.jsx";
import Navbar from "./components/Navbar.jsx";
import Today from "./components/Today.jsx";
import Tomorrow from "./components/Tomorrow.jsx";
import History from "./components/History.jsx";
import WeekTracker from "./components/Week.jsx";
import VerifyOTP from "./components/OTP.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import { apiFetch } from "./api";
import { ThemeProvider } from "./theme/ThemeContext.jsx";
import "./stylesheet/responsive.css";
import "./stylesheet/dashboard.css";

const PublicTheme = ({ children }) => (
  <ThemeProvider defaultTheme="light" storageKey="habit-tracker-public-theme">
    {children}
  </ThemeProvider>
);

const DashboardTheme = ({ children }) => (
  <ThemeProvider defaultTheme="dark" storageKey="habit-tracker-dashboard-theme">
    {children}
  </ThemeProvider>
);

async function redirectSignedInUser({ request }) {
  try {
    const response = await apiFetch("/session", { signal: request.signal });
    if (response.ok) return redirect("/today");
  } catch (error) {
    if (error.name === "AbortError") throw error;
  }
  return null;
}

const router = createBrowserRouter([
  {
    path: "/",
    loader: redirectSignedInUser,
    element: <PublicTheme><Home /></PublicTheme>,
  },
  {
    path: "/login",
    loader: redirectSignedInUser,
    element: <PublicTheme><Login /></PublicTheme>,
  },
  {
    path: "/forgot-password",
    element: <PublicTheme><ForgotPassword /></PublicTheme>,
  },
  {
    path: "/signup",
    loader: redirectSignedInUser,
    element: <PublicTheme><Signup /></PublicTheme>,
  },
  {
    path: "/otp",
    loader: redirectSignedInUser,
    element: <PublicTheme><VerifyOTP /></PublicTheme>,
  },
  {
    path: "/today",
    element: (
      <RequireAuth>
        <DashboardTheme>
          <Navbar />
          <Today />
        </DashboardTheme>
      </RequireAuth>
    ),
  },
  {
    path: "/tomorrow",
    element: (
      <RequireAuth>
        <DashboardTheme>
          <Navbar />
          <Tomorrow />
        </DashboardTheme>
      </RequireAuth>
    ),
  },
  {
    path: "/history",
    element: (
      <RequireAuth>
        <DashboardTheme>
          <Navbar />
          <History />
        </DashboardTheme>
      </RequireAuth>
    ),
  },
  {
    path: "/week",
    element: (
      <RequireAuth>
        <DashboardTheme>
          <Navbar />
          <WeekTracker />
        </DashboardTheme>
      </RequireAuth>
    ),
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

export default router;
