import { StrictMode } from "react";
import Home from "./components/Home";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { createBrowserRouter, redirect } from "react-router-dom";
import Login from "./components/login.jsx";
import Signup from "./components/signup.jsx";
import Navbar from "./components/Navbar.jsx";
import Today from "./components/Today.jsx";
import Tomorrow from "./components/Tomorrow.jsx";
import History from "./components/History.jsx";
import WeekTracker from "./components/Week.jsx";
import VerifyOTP from "./components/OTP.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import { apiFetch } from "./api";
import "./stylesheet/responsive.css";

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
    element: <Home />,
  },
  {
    path: "/login",
    loader: redirectSignedInUser,
    element: <Login />,
  },
  {
    path: "/signup",
    loader: redirectSignedInUser,
    element: <Signup />,
  },
  {
    path: "/otp",
    loader: redirectSignedInUser,
    element: <VerifyOTP />,
  },
  {
    path: "/today",
    element: (
      <RequireAuth>
        <>
          <Navbar />
          <Today />
        </>
      </RequireAuth>
    ),
  },
  {
    path: "/tomorrow",
    element: (
      <RequireAuth>
        <>
          <Navbar />
          <Tomorrow />
        </>
      </RequireAuth>
    ),
  },
  {
    path: "/history",
    element: (
      <RequireAuth>
        <>
          <Navbar />
          <History />
        </>
      </RequireAuth>
    ),
  },
  {
    path: "/week",
    element: (
      <RequireAuth>
        <>
          <Navbar />
          <WeekTracker />
        </>
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
