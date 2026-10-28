export function apiFetch(path, options = {}) {
  const apiPath = path.startsWith("/") ? path : `/${path}`;
  return fetch(`/api${apiPath}`, {
    ...options,
    credentials: "include",
  });
}
