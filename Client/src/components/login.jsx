import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import "../stylesheet/auth.css";
import { apiFetch } from "../api";

const PROTECTED_ROUTES = new Set(["/today", "/tomorrow", "/history", "/week"]);

function getSafeDestination(search) {
  const requested = new URLSearchParams(search).get("next") || "/today";
  const destination = new URL(requested, window.location.origin);
  if (destination.origin !== window.location.origin || !PROTECTED_ROUTES.has(destination.pathname)) {
    return "/today";
  }
  return `${destination.pathname}${destination.search}${destination.hash}`;
}

function Login() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const destination = getSafeDestination(location.search);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiFetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Login failed. Please check your details.");
      }

      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <Link to="/" className="auth-logo">
          <img src="./images/logo.png" alt="Habit Tracker Logo" />
        </Link>
        <Link to="/" className="auth-brand-name">
          habit tracker
        </Link>
      </div>

      <main className="auth-card">
        <div className="auth-icon">&rarr;</div>
        <p className="auth-eyebrow">WELCOME BACK</p>
        <h1>Good to see you.</h1>
        <p className="auth-description">
          Log in and keep building the habits that matter.
        </p>

        {location.state?.message && (
          <p role="status" style={{ color: "#087443", margin: "0 0 15px" }}>
            {location.state.message}
          </p>
        )}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <div className="password-field">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>
          </div>

          <Link to="/forgot-password" className="forgot-password-link">
            Forgot password?
          </Link>

          {error && (
            <p role="alert" style={{ color: "#b42318", margin: "0 0 15px" }}>
              {error}
            </p>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Logging in..." : "Log in"} <span>&rarr;</span>
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/signup">Create one</Link>
        </p>

        <Link to="/" className="back-home">
          Back to home
        </Link>
      </main>

      <p className="auth-bottom">SMALL HABITS. BIG CHANGES.</p>
    </div>
  );
}

export default Login;
