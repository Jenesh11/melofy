# Melofy: Spotify-free recommendations and bug audit

Reviewed 12 September 2026 against commit `eb9e918`.

## Recommendation

Use YouTube radio through the existing NodeLink server for the first migration, with a provider-independent Melofy recommendation service and a fallback based on Melofy's own library/history. Evaluate ListenBrainz as the independent similarity provider. Last.fm is an optional additional provider if a non-Spotify API key is acceptable.

This is a research and audit deliverable. Application code, dependencies, credentials, and deployment configuration have not been changed. The proposed providers have not been accepted against the deployed server or real devices.

## What is broken today

There are two separate recommendation paths:

- Home: `apps/web/src/app/page.tsx` calls `/api/spotify/recommendations`. That route performs Spotify genre search using client credentials. It is not Spotify's recommendation engine. The home page selects a random genre; it is not a personalized model.
- Autoplay: `useTrackDiscovery.ts` calls `/api/recommendations`, which asks NodeLink for `sprec:` or `ytrec:`. Spotify is always preferred when a 22-character ID is present, including when a usable YouTube ID is also available. There is no provider fallback.

Spotify restricted Recommendations, Related Artists, Audio Features, and other endpoints for new/development use cases in November 2024. Replacing the key does not restore entitlement to those endpoints. [Spotify announcement](https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api).

The installed `lavalink-client` introduces a second failure: passing `{query: 'ytrec:abcdefghijk'}` results in a wire identifier of `ytmsearch:ytrec:abcdefghijk`. Its known-prefix table includes `sprec` but not `ytrec`. This was reproduced using the installed library's actual `LavalinkNode.search`, with only the HTTP request mocked. A migration must correct the wire request, not merely change the selected prefix.

## Free alternatives

| Option | Credentials and cost | Suitable use | Important limitation |
| --- | --- | --- | --- |
| Existing NodeLink YouTube radio | No Spotify client ID or secret. Uses your existing NodeLink server and its server password; hosting/bandwidth still cost money. | Smallest integration change for song radio/autoplay. `ytrec:` supports a video ID or search query. | Unofficial upstream integration; deployed version, source configuration, and actual radio results must be checked. The current client incorrectly prefixes this request. |
| ListenBrainz Labs | Public similarity/metadata interfaces; no Spotify credentials. Do not assume unlimited hosted use or guaranteed availability. | An independent source of related tracks/artists, ranked further using Melofy's own signals. | Requires mapping titles/artists to MusicBrainz recording IDs and mapping recommendations back to playable tracks. Coverage must be measured on Melofy's target languages/catalog. |
| Last.fm | Requires a Last.fm API key, not a Spotify key or per-user login for `track.getSimilar`. Suitable to evaluate for non-commercial use; commercial/research use requires contacting Last.fm. | Track similarity, similar artists, tags, charts. | It is not a zero-key option and does not supply a general full-track streaming catalog. |
| `ytmusicapi` | Public calls can work without account setup; account-specific calls require authentication. No Spotify credentials. | Python service using `get_watch_playlist(..., radio=True)`, with search/home/chart capabilities. | An unofficial YouTube Music client and an extra service to maintain. It shares YouTube availability risks with NodeLink, so it is not an independent upstream fallback. |
| Melofy's own ranking | No external recommendation credentials or per-request recommendation fee. Compute/storage still required. | Rank the available library/catalog using recent artists, likes, language, novelty, and repetition penalties. | With only local history/library, it cannot discover music outside that catalog. Completed-listen/skip signals need explicit collection; the current history is updated on track transitions and is not a reliable listen count. |

Provider evidence: [NodeLink recommendation prefixes](https://nodelink.js.org/docs/api), [NodeLink source configuration](https://nodelink.js.org/docs/config), [ListenBrainz datasets and similarity interfaces](https://labs.api.listenbrainz.org/), [recording metadata lookup](https://labs.api.listenbrainz.org/acr-lookup), [similar recordings](https://labs.api.listenbrainz.org/similar-recordings), [Last.fm similar tracks](https://www.last.fm/api/show/track.getSimilar), [Last.fm usage notice](https://www.last.fm/api), [ytmusicapi public/account setup](https://ytmusicapi.readthedocs.io/en/stable/setup/index.html), [ytmusicapi radio](https://ytmusicapi.readthedocs.io/en/stable/reference/watch.html).

ListenBrainz Labs is separate from the main `api.listenbrainz.org` API: do not invent `/1/similar-recordings` on the main host. Start with the Labs interface's documented JSON examples. Main-API user features have token requirements and rate-limit/User-Agent rules. The main API currently instructs clients to limit requests to one per second and respect response headers; confirm Labs-specific limits during the spike. [Main API guidance](https://listenbrainz.readthedocs.io/en/latest/users/api/index.html). ListenBrainz permits commercial data use and points commercial consumers to support tiers; this is not a promise of unlimited free hosted infrastructure. [Project policy](https://github.com/metabrainz/listenbrainz-server/blob/master/README.md).

The documentation pages were accessible during research, but Labs JSON retrieval did not succeed with the research tools, and a direct local public fetch failed. No successful live similarity result or deployed NodeLink radio response is claimed.

## Confirmed findings, in repair order

P1 means high impact on a core flow; P2 means a narrower correctness/reliability issue. Offline reproductions execute source functions or the installed library with mocked external dependencies; they do not simulate a full browser/device.

| Priority | Finding and trigger | Evidence | Suggested repair |
| --- | --- | --- | --- |
| P1 | YouTube radio is sent as ordinary search: `ytmsearch:ytrec:...`. Even a YouTube-only seed takes the wrong request path. | Offline reproduction; [request call](C:/Users/jenes/Pictures/Codes/Melofy/apps/api/src/index.ts:440). | Send a verified custom source with an unprefixed seed or use a narrow authenticated NodeLink REST adapter; assert the exact outgoing identifier. Do not blindly enable custom sources without testing this installed client's behavior. |
| P1 | Autoplay prefers restricted Spotify recommendations over an available YouTube seed, then returns an empty list without fallback. | Offline reproduction; [provider selection](C:/Users/jenes/Pictures/Codes/Melofy/apps/api/src/index.ts:421), error/empty handling at 445. | Make recommendation providers independent of the imported track's original ID; try providers in configured order on timeout/error/empty results. |
| P1 | An old autoplay request replaces a manually selected song and clears its queue after its response arrives. | Offline reproduction using the actual Zustand store; [unconditional play](C:/Users/jenes/Pictures/Codes/Melofy/apps/web/src/hooks/useTrackDiscovery.ts:107). | Capture a playback generation, cancel obsolete requests, and recheck user, generation, queue, autoplay state, and party authority before committing. A simple current-track equality check is insufficient because normal end-of-queue processing clears that track. |
| P1 | Redis failure prevents recommendations; a failed cache write discards successfully fetched recommendations and sends HTTP 500. Search and several home routes use the same failure pattern. | Two recommendation-route reproductions; [cache read](C:/Users/jenes/Pictures/Codes/Melofy/apps/api/src/index.ts:431), write at 474. | Treat recommendation/search caches as optional. Handle read/write failures separately from provider failures; keep authoritative player/party storage semantics separate. |
| P2 | Failed home requests are recorded as successful initialization, so visiting home again does not retry. | All-six-requests-500 reproduction; [success flag](C:/Users/jenes/Pictures/Codes/Melofy/apps/web/src/app/page.tsx:191). | Track success/error/retry per section; allow partial rendering and retry without requiring a full reload. |
| P2 | Home data survives account changes, and `hasFetched` prevents loading the next user's discovery mixes. | Source trace: [global home store](C:/Users/jenes/Pictures/Codes/Melofy/apps/web/src/store/useHomeStore.ts:43), early return in `page.tsx:137`; no other reset/reference found. | Scope the home cache to UID, clear it on account change, and reject late responses from the previous UID. This concerns in-memory same-browser data, not a demonstrated backend cross-user authorization flaw. |
| P2 | Track duration disappears from recommendation responses. The client converts wire `info.length` into `info.duration`; Melofy reads `info.length`. | Actual library normalization plus route reproduction; [duration mapping](C:/Users/jenes/Pictures/Codes/Melofy/apps/api/src/index.ts:455). | Use the client track type and normalize `duration` once. Verify duration/seek UI and native handling for recommended tracks. |
| P2 | A seed-only result is put back after filtering; the frontend also falls back to the first candidate. Autoplay can repeat the same song. | Backend reproduction; [seed reintroduction](C:/Users/jenes/Pictures/Codes/Melofy/apps/api/src/index.ts:470), frontend `useTrackDiscovery.ts:103`. | Never reinsert excluded seeds; exclude recent plays and query another source or stop cleanly. |
| P2 | Native progress is persisted from the unused HTML audio element instead of native/store progress. A 90-second native position is saved as zero in the reproduction. | [save position](C:/Users/jenes/Pictures/Codes/Melofy/apps/web/src/hooks/usePlayerSync.ts:153); `PlayerShell.tsx:248` omits the HTML audio source on native. | Use the existing native-aware time getter/store progress. Verify restoration after service/process restart on Android. |
| P2 | An initial player-state request failure leaves `isHydrated=false`; later save operations return early for the same mounted session. | Source trace: [hydration catch](C:/Users/jenes/Pictures/Codes/Melofy/apps/web/src/hooks/usePlayerSync.ts:137), save gate at 142. | Add retry and an explicit hydration failure state. Avoid saving an empty default state over persisted data before recovery. |
| P2 | Spotify trending fallback is restricted to 2024–2025, excluding current 2026 releases. | [fixed search years](C:/Users/jenes/Pictures/Codes/Melofy/apps/api/src/routes/spotify.ts:41). | Replace with the new discovery provider; if retained, derive the date window and label search results accurately rather than implying a live chart. |

Additional compatibility risk: retained Spotify code uses `limit=50`, playlist `/tracks`, and the old playlist response shape. These conflict with the newer Development Mode contract. Applicability depends on the app's entitlement/cohort: Spotify's February guide documents the new contract, while its March 9 update postponed endpoint changes for existing integrations. Do not claim every existing app has already migrated. This does not undo the older recommendation restrictions. [Migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide), [postponement update](https://developer.spotify.com/blog/2026-02-06-update-on-developer-access-and-platform-security).

Deployment maintenance risk: `docker/nodelink/Dockerfile:11` clones NodeLink without a tag or commit. Fresh builds can change the audio engine independently of Melofy's lockfile. Pin the tested revision when migrating providers.

## Proposed implementation boundary

1. Add one recommendation service for autoplay and home discovery with explicit provider/source fields and separate internal ID, YouTube ID, MusicBrainz ID, and optional Spotify ID. Preserve existing imported playlist data.
2. Validate NodeLink radio through the installed client or a small REST adapter. Prefer a resolved YouTube seed, otherwise search title/artist. Add timeouts, fallback, single-flight requests, and optional cache behavior.
3. Replace home recommendation/discovery calls with the new service. Mix candidates from recent artists/likes; deduplicate, exclude recently heard tracks, and cap repeated artists. For new users, start with user-selected languages/genres and clearly labelled discovery/search results.
4. Keep Spotify import/search as an optional, separately reported integration. Removing Spotify credentials from recommendations alone will not repair Spotify-backed trending, mixes, editorial/featured playlists, search, or arbitrary Spotify playlist imports. Those surfaces need provider migration or clear unavailable states too.
5. Spike ListenBrainz metadata matching and similarity on the user's target catalog before selecting it as a production fallback. Last.fm is optional if another API key and its usage terms are acceptable. Resolve returned metadata into playable tracks independently of recommendation ranking.
6. Fix the confirmed request races, hydration/cache issues, and duration mapping alongside the migration. Add real regression tests for the repaired behavior.

## Validation performed

- API TypeScript: `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit` — passed.
- Web TypeScript: `node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false` — passed.
- `npm run lint --workspace=web` — failed with **61 errors and 9 warnings**, including explicit `any`, React hook/ref/state rules, and unused/dependency warnings. These are the existing baseline, not 70 distinct runtime bugs.
- `node reports/2026-09-12/reproduce-audit.cjs` — **9 existing failure scenarios reproduced**. The assertions intentionally confirm current failures and should not be treated as post-fix acceptance tests. Results are saved beside this report.
- No package declares an automated `test` script. `apps/api/test.ts` is a standalone Genius exploration script, not a regression suite; it was not run against external services.
- Graphify rules refer to a graph, but `graphify-out/graph.json` is absent in this checkout. Findings were verified in source and the installed client, not inferred from an unavailable graph.
- No signed-in browser, hosted recommendation result, audio-stream playback, full production build, Android build/device run, or desktop package acceptance was performed. This is a focused audit of discovery, search, shared player state, and sampled deployment/native integration, not an exhaustive correctness or security certification of every feature.
