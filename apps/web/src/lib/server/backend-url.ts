const DEFAULT_BACKEND_URL = 'http://localhost:3001';

function normalizeBaseUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function getBackendBaseUrl(): string {
  const configured =
    process.env.INTERNAL_API_URL ||
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_API_URL ||
    DEFAULT_BACKEND_URL;

  return normalizeBaseUrl(configured);
}

export function buildBackendUrl(path: string): string {
  const base = getBackendBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
