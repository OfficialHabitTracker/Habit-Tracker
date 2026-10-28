import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../stylesheet/VerifyOTP.css";
import { apiFetch } from "../api";

const VerifyOTP = () => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const email = String(
    location.state?.email || window.sessionStorage.getItem("pendingVerificationEmail") || "",
  ).trim().toLowerCase();

  const handleVerify = async (event) => {
    event.preventDefault();

    if (!email) {
      setError("Email is missing. Please sign up again.");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await apiFetch("/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Invalid code. Please try again.");
      }

      window.sessionStorage.removeItem("pendingVerificationEmail");
      navigate("/login", {
        replace: true,
        state: {
          email,
          message: "Email verified. Your account is ready; please log in.",
        },
      });
    } catch (requestError) {
      setError(requestError.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError("Email is missing. Please sign up again.");
      return;
    }

    setResending(true);
    setError("");
    setNotice("");

    try {
      const response = await apiFetch("/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not send another code.");
      }

      setNotice(data.message);
      setOtp("");
    } catch (requestError) {
      setError(requestError.message || "Could not reach the server. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="otp-page">
      <div className="otp-card">
        <div className="otp-logo">H</div>

        <h1>Verify your email</h1>
        <p className="otp-description">
          We sent a 6-digit verification code to your email address.
        </p>

        {email ? (
          <p className="otp-email">{email}</p>
        ) : (
          <p className="otp-error" role="alert">
            Email is missing. <Link to="/signup">Start signup again.</Link>
          </p>
        )}

        <form onSubmit={handleVerify}>
          <label htmlFor="otp">Verification code</label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Enter 6-digit code"
            maxLength={6}
            value={otp}
            onChange={(event) => {
              setOtp(event.target.value.replace(/\D/g, ""));
              setError("");
              setNotice("");
            }}
            required
          />

          {error && <p className="otp-error" role="alert">{error}</p>}
          {notice && <p className="otp-notice" role="status">{notice}</p>}

          <button type="submit" disabled={loading || !email || otp.length !== 6}>
            {loading ? "Verifying..." : "Verify & Continue"}
            {!loading && <span>&rarr;</span>}
          </button>
        </form>

        <p className="otp-footer">
          Didn't receive the code? Check your spam folder or{" "}
          <button
            className="otp-resend"
            type="button"
            onClick={handleResend}
            disabled={resending || !email}
          >
            {resending ? "sending another..." : "send another code"}
          </button>
          .
        </p>
      </div>
    </div>
  );
};

export default VerifyOTP;
