# Spotify-free discovery and recommendations

Melofy's home discovery, generated mixes, popular discoveries and autoplay use NodeLink YouTube radio/search, optional ListenBrainz similarity, and ranking based on the user's existing history and likes. They do not require `SPOTIFY_CLIENT_ID` or `SPOTIFY_CLIENT_SECRET`.

## Provider order

1. Request NodeLink radio with the exact `ytrec:<YouTube video ID>` identifier. Seeds without a YouTube ID use their title and artist. The adapter uses the installed client's authenticated REST transport because its `search()` method rewrites the custom prefix incorrectly.
2. If there are too few fresh candidates, look up the seed's recording on ListenBrainz Labs and request similar recordings. These metadata-only tracks resolve through the existing music search/player when selected.
3. Fall back to NodeLink music search using artist, genre and language hints, then eligible liked tracks and older history. Recent tracks and the seed are excluded. If no fresh music is available, stop with an actionable message instead of looping the seed.

Ranking favors artists in likes/history, deduplicates IDs and title/artist pairs, and caps each artist at three tracks. History represents player transitions, not verified completed listens. Language and genre guide search; they are not strict catalog classifications. No machine-learning model training, Last.fm key, Python recommendation service or paid recommendation subscription is needed.

## Configuration and deployment

Keep the existing NodeLink connection, Firebase authentication, stream-ticket secret and authoritative Redis storage configured. Music discovery tolerates cache outages; persisted player/party state still needs Redis.

- `LAVALINK_HOST`, `LAVALINK_PORT`, `LAVALINK_PASSWORD`, `LAVALINK_SECURE`: existing NodeLink connection. Use the Compose service name inside Docker and a reachable host when running the API outside Docker.
- `LISTENBRAINZ_ENABLED=true`: default. Set `false` to disable the external similarity fallback. No ListenBrainz user token is needed for the public Labs endpoints used here.
- `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`: optional for the retained Spotify search/import integration. Existing Spotify endpoints still depend on Spotify access; recommendation migration does not restore that entitlement.
- `BACKEND_API_URL`: Next.js must reach the updated API. Deploy/rebuild web and API together so `/api/discovery/*` rewrites and the recommendation POST proxy are present.

The NodeLink Dockerfile pins commit `f6f526f3875ed5c36afd245f1ff5e5c59356ec40` and retains the enabled track-stream endpoint. Its public package/configuration were inspected; the container and its streaming behavior still need validation in the deployment environment. Existing hosting, bandwidth and storage costs remain. Public upstream services can throttle or become unavailable.

The service caches only public provider candidates, not a user's final personalized results. Requests to the API include at most 50 recent history entries and 50 likes, without encoded audio payloads. A similarity lookup sends seed title/artist or a recording ID to ListenBrainz; it does not send Firebase tokens or account identifiers. Provider calls have timeouts, bounded concurrency/queues, single-flight loading and a cooldown for similarity throttling/errors.

## HTTP contract

All routes use the API's existing authentication/rate-limit middleware.

| Route | Behavior |
| --- | --- |
| `POST /api/recommendations` | Accepts optional `seed`, `history`, `liked`, `genre`, `language`; returns `tracks`, `providers`, `degraded`, `unavailable`. A total provider outage with no library fallback returns 503. A valid empty result returns an empty list. |
| `GET /api/recommendations` | Retains legacy seed parameters for older clients. |
| `POST /api/discovery/home` | Returns home sections independently; optional `sections` requests retries for specific sections. Partial mixes remain visible while their section is retried. |
| `GET /api/discovery/mixes/:id` | Loads a built-in `mix:<slug>` or generated `mix:artist:<base64url artist>` collection. Existing collection playback/import controls handle these IDs. |
| `GET /api/discovery/trending` | Returns popular music search results. The UI labels these as discoveries, not an official Top 50 chart. |

Genre/language preferences survive navigation in the current session and reset when accounts change. Personalized home data and cached likes are bound to the active UID. Unowned legacy liked caches are not imported into another account; Firestore remains the source for existing liked songs.

## Regression checks

From the repository root, with dependencies installed:

```sh
npm run test --workspace api
npm run test:browser
npm run lint --workspace web
npx tsc --noEmit -p apps/web/tsconfig.json
npm run build --workspace web
```

Browser evidence is written to `test-results/discovery` by default; `MELOFY_TEST_REPORT_DIR` can select a different output folder. The browser suite uses installed Chrome, runs the actual React hooks/Zustand stores and discovery components, and mocks Firebase, discovery HTTP data and navigation at the boundary. It checks delayed autoplay, manual queues, party authority, account changes, hydration retries, native progress serialization, mix playback/import, legacy resolution and desktop/mobile interactions. It does not prove real device audio, Firebase authorization rules or deployed provider availability. Build-time Google Fonts retrieval requires network access.

See [implementation validation](../reports/2026-09-12/recommendation-implementation.md) for the results and limits of this run.
