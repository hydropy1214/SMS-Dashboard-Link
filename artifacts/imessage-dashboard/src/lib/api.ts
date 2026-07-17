/**
 * Returns the base URL prefix for the API server.
 * The API server artifact is served at /api relative to the site root,
 * but the BASE_URL env var points to this frontend artifact's base path.
 * For export/download links we need a direct URL, not the custom-fetch base.
 */
export function getApiBase(): string {
  return import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
}
