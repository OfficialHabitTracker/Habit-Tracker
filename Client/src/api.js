const apiBaseUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");

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
