import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import "../stylesheet/auth.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();

  const requestCode = async (event) => {
    event?.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const response = await apiFetch("/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not request a password reset.");
      }
      setEmail(normalizedEmail);
      setCode("");
      setCodeSent(true);
      setNotice(data.message);
    } catch (requestError) {
      setError(requestError.message || "Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (password !== confirmPassword) {
      setError("Those passwords do not match.");
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError("Password must be no more than 72 bytes.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch("/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not reset your password.");
      }
      navigate("/login", {
        replace: true,
        state: { message: "Your password has been reset. Log in with your new password." },
      });
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
        <Link to="/" className="auth-brand-name">habit tracker</Link>
      </div>

      <main className="auth-card">
        <div className="auth-icon" aria-hidden="true">?</div>
        <p className="auth-eyebrow">ACCOUNT RECOVERY</p>
        <h1>{codeSent ? "Choose a new password." : "Forgot your password?"}</h1>
        <p className="auth-description">
          {codeSent
            ? `Enter the 6-digit code sent to ${email} and choose a new password.`
            : "Enter the email address for your account and we will send you a reset code."}
        </p>

        {notice && <p role="status" style={{ color: "#087443", margin: "0 0 15px" }}>{notice}</p>}
        {error && <p role="alert" style={{ color: "#b42318", margin: "0 0 15px" }}>{error}</p>}

        {!codeSent ? (
          <form onSubmit={requestCode} className="auth-form">
            <div className="form-group">
              <label htmlFor="reset-email">Email address</label>
              <input
                id="reset-email"
                type="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Sending code..." : "Send reset code"} <span>&rarr;</span>
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="auth-form">
            <div className="form-group">
              <label htmlFor="reset-code">6-digit email code</label>
              <input
                id="reset-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter code"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="reset-password">New password</label>
              <input
                id="reset-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                placeholder="At least 8 characters"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="reset-confirm-password">Confirm new password</label>
              <input
                id="reset-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                placeholder="Enter the password again"
                required
              />
            </div>
            <p className="input-hint">The code expires in 10 minutes. You can request another after one minute.</p>
            <button type="submit" className="auth-submit" disabled={loading || code.length !== 6}>
              {loading ? "Resetting password..." : "Set new password"} <span>&rarr;</span>
            </button>
            <button type="button" className="auth-inline-link" onClick={requestCode} disabled={loading}>
              Send another code
            </button>
            <button type="button" className="auth-inline-link" onClick={() => {
              setCodeSent(false);
              setCode("");
              setNotice("");
              setError("");
            }}>
              Use a different email
            </button>
          </form>
        )}

        <p className="auth-switch">Remembered it? <Link to="/login">Log in</Link></p>
        <Link to="/" className="back-home">Back to home</Link>
      </main>

      <p className="auth-bottom">SMALL HABITS. BIG CHANGES.</p>
    </div>
  );
}

export default ForgotPassword;
