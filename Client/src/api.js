function normalizeApiOrigin(value) {
  const candidates = String(value || "").match(/https?:\/\/[^\s)\]]+/g);
  const candidate = candidates?.at(-1) || String(value || "").trim();
  if (!candidate) return "";

  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : "";
  } catch {
    return "";
  }
}

const apiBaseUrl = normalizeApiOrigin(import.meta.env.VITE_API_URL)
  || (import.meta.env.PROD ? "https://habit-tracker-server-roan.vercel.app" : "");

export function apiFetch(path, options = {}) {
  const apiPath = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${apiBaseUrl}/api${apiPath}`, {
    ...options,
    credentials: "include",
  }).then((response) => {
    const contentType = response.headers.get("content-type") || "";
    if (!/^application\/(?:[\w.-]+\+)?json\b/i.test(contentType)) {
      if (response.status === 404) {
        throw new Error(
          "The Habit Tracker API is not connected to this deployment yet. The page is online, but login services are unavailable.",
        );
      }

      throw new Error(
        `The Habit Tracker API returned an unexpected response (HTTP ${response.status}). Please try again later.`,
      );
    }

    return response;
  });
}
