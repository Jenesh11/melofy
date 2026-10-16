/**
 * Cross-source playback fallback.
 *
 * YouTube is the primary catalog, but from datacenter IPs it regularly refuses
 * playback (bot checks, SABR-only formats, IP-bound CDN URLs). When that
 * happens we look up the same recording on a source that serves plain
 * progressive audio (JioSaavn: AAC in MP4, plays in every browser and WebView)
 * and stream that instead. Matching is deliberately strict on title so a
 * fallback never silently plays a different song.
 */

export interface FallbackTrackInfo {
  title: string;
  author: string;
  length: number;
}

export interface FallbackCandidate {
  encoded: string;
  info: FallbackTrackInfo;
}

/** Sources tried in order; each serves progressive (Range-capable) audio. */
export const FALLBACK_SOURCES = [{ prefix: 'jssearch:', sourceName: 'jiosaavn' }];

const NOISE_PATTERNS = [
  /\((?:[^)]*\b(?:official|video|audio|lyrics?|lyrical|visuali[sz]er|hd|hq|4k|full|song|from|feat\.?|ft\.?|prod\.?)\b[^)]*)\)/gi,
  /\[(?:[^\]]*)\]/g,
  /\b(?:official\s+(?:music\s+)?(?:video|audio)|lyric(?:al)?\s+video|full\s+(?:video\s+)?song|audio\s+song|video\s+song)\b/gi,
];

function fold(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Strip decoration that differs between catalogs but not between recordings. */
export function cleanTitle(raw: string): string {
  let title = raw.split(/\s[|│]\s/)[0] || raw;
  for (const pattern of NOISE_PATTERNS) title = title.replace(pattern, ' ');
  title = title.replace(/\b(?:feat|ft)\.?\s.+$/i, ' ');
  return fold(title).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/** "Artist - Title" uploads put the song after the dash; try both halves. */
function titleVariants(raw: string): string[] {
  const variants = new Set<string>([cleanTitle(raw)]);
  const parts = raw.split(/\s[-–—]\s/);
  if (parts.length === 2) {
    variants.add(cleanTitle(parts[1]!));
    variants.add(cleanTitle(parts[0]!));
  }
  return [...variants].filter(Boolean);
}

function tokens(value: string): string[] {
  return value.split(' ').filter(Boolean);
}

function splitArtists(value: string): string[] {
  return fold(value)
    .split(/\s*(?:,|&|\band\b|\bx\b|\bfeat\.?|\bft\.?|\bwith\b|\/)\s*/)
    .map((name) => name.replace(/[^\p{L}\p{N}]+/gu, ' ').trim())
    .filter((name) => name.length > 1 && !/\b(?:vevo|topic|records|music|series|official)\b/.test(name));
}

function titleSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const compactA = a.replace(/ /g, '');
  const compactB = b.replace(/ /g, '');
  if (compactA === compactB) return 0.97;
  const left = tokens(a);
  const right = new Set(tokens(b));
  const shared = left.filter((token) => right.has(token)).length;
  if (!shared) return 0;
  // Dice coefficient: rewards full overlap, penalises extra words on either side.
  return (2 * shared) / (left.length + right.size);
}

export function scoreCandidate(source: FallbackTrackInfo, candidate: FallbackTrackInfo): number {
  const candidateTitle = cleanTitle(candidate.title);
  const title = Math.max(...titleVariants(source.title).map((variant) => titleSimilarity(variant, candidateTitle)));
  if (title < 0.75) return 0;

  const sourceArtists = splitArtists(source.author);
  const sourceText = ` ${fold(`${source.author} ${source.title}`).replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  const candidateArtists = splitArtists(candidate.author);
  const artistMatch = candidateArtists.some(
    (artist) => sourceArtists.includes(artist) || sourceText.includes(` ${artist} `),
  );

  const delta = source.length > 0 && candidate.length > 0 ? Math.abs(source.length - candidate.length) : Infinity;
  const tolerance = Math.max(7000, source.length * 0.06);
  const durationMatch = delta <= tolerance;

  // Title + duration alone is not enough: same-named songs by different
  // artists are common. Label uploads (e.g. "T-Series") still match because
  // their titles name the artists, which sourceText covers.
  if (!artistMatch) return 0;

  // A very different duration with matching artist is usually another cut
  // (video edit, live, extended) — acceptable, but ranked below the album cut.
  const durationScore = durationMatch ? 1 - delta / (tolerance * 2) : Number.isFinite(delta) ? 0 : 0.3;
  return title * 0.6 + 0.3 + durationScore * 0.1;
}

export function pickBestCandidate(
  source: FallbackTrackInfo,
  candidates: FallbackCandidate[],
): FallbackCandidate | null {
  let best: { candidate: FallbackCandidate; score: number } | null = null;
  for (const candidate of candidates) {
    if (!candidate?.encoded || !candidate.info?.title) continue;
    const score = scoreCandidate(source, candidate.info);
    if (score > 0 && (!best || score > best.score)) best = { candidate, score };
  }
  return best?.candidate ?? null;
}

/** Queries ordered from most to least specific. */
export function fallbackQueries(source: FallbackTrackInfo): string[] {
  const variants = titleVariants(source.title);
  const artist = splitArtists(source.author)[0] || '';
  const queries = new Set<string>();
  for (const title of variants.slice(0, 2)) {
    if (artist && !title.includes(artist)) queries.add(`${title} ${artist}`);
    queries.add(title);
  }
  return [...queries].filter((query) => query.length >= 2).slice(0, 3);
}
