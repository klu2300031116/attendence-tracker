// Base URL for the FastAPI backend. Set VITE_API_URL in a .env file (or on
// your hosting provider, e.g. Vercel env vars) when deploying. Falls back to
// localhost for local development.
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchAnalysis(seed = 42) {
  const res = await fetch(`${API_BASE}/api/analysis?seed=${seed}`);
  if (!res.ok) throw new Error(`Analysis request failed (${res.status})`);
  return res.json();
}

export async function uploadCsvForAnalysis(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/analysis/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Upload failed (${res.status})`);
  }
  return res.json();
}

export function csvDownloadUrl(seed = 42) {
  return `${API_BASE}/api/analysis/csv?seed=${seed}`;
}
