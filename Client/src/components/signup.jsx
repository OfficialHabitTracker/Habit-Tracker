import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import "../stylesheet/auth.css";
import { apiFetch } from "../api";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const response = await apiFetch("/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: normalizedEmail, password }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to create your account.");
      }

      window.sessionStorage.setItem("pendingVerificationEmail", normalizedEmail);
      navigate("/otp", { state: { email: normalizedEmail } });
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

      <main className="auth-card signup-card">
        <div className="auth-icon">*</div>

        <p className="auth-eyebrow">START SOMETHING GOOD</p>
        <h1>Build your better self.</h1>
        <p className="auth-description">
          Create your account and make consistency a habit.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="signup-name">Full name</label>
            <input
              id="signup-name"
              type="text"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              autoComplete="name"
              maxLength={100}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="signup-email">Email address</label>
            <input
              id="signup-email"
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              maxLength={254}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="signup-password">Password</label>
            <div className="password-field">
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a password"
                autoComplete="new-password"
                minLength={8}
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
            <span className="input-hint">Use at least 8 characters.</span>
          </div>

          {error && (
            <p role="alert" style={{ color: "#b42318", margin: "0 0 15px" }}>
              {error}
            </p>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Sending code..." : "Create account"} <span>&rarr;</span>
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>

        <Link to="/" className="back-home">
          Back to home
        </Link>
      </main>

      <p className="auth-bottom">SMALL HABITS. BIG CHANGES.</p>
    </div>
  );
}

export default Signup;
