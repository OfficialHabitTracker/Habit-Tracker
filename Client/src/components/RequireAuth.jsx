import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

function RequireAuth({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking");
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const checkSession = async () => {
      try {
        setStatus("checking");
        setError("");
        const response = await apiFetch("/session", { signal: controller.signal });

        if (response.status === 401) {
          const next = `${location.pathname}${location.search}${location.hash}`;
          navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
          return;
        }

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Could not verify your login session.");
        }

        setStatus("ready");
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(requestError.message || "Could not reach the server.");
          setStatus("error");
        }
      }
    };

    checkSession();
    return () => controller.abort();
  }, [location.hash, location.pathname, location.search, navigate, retryKey]);

  if (status === "checking") {
    return (
      <div className="tracker-wrapper">
        <div className="tracker-container">Checking your login...</div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="tracker-wrapper">
        <div className="tracker-container" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => setRetryKey((key) => key + 1)}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return children;
}

export default RequireAuth;
