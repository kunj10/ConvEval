const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const api = {
  health: () => req("/health"),
  getFacets: (domain, limit = 300) =>
    req(`/facets${domain ? `?domain=${domain}` : ""}${limit ? `&limit=${limit}` : ""}`),
  getDomains: () => req("/facets/domains"),
  evaluate: (conversation, facet_ids, domains) =>
    req("/evaluate", {
      method: "POST",
      body: JSON.stringify({ conversation, facet_ids, domains }),
    }),
  getSamples: (limit = 5) => req(`/samples?limit=${limit}`),
  getSampleScores: (id) => req(`/samples/${id}/scores`),
  uploadEvaluate: (file, domains) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${BASE}/evaluate/upload${domains ? `?domains=${domains}` : ""}`, {
      method: "POST",
      body: form,
    }).then((r) => r.json());
  },
};
