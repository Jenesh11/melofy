# Recommendation implementation and validation

Implemented September 12-13, 2026. This report supersedes the implementation proposals and live-service limitations recorded during the initial audit where explicitly noted below. The original audit and its old failure reproductions are preserved as historical evidence, not post-fix tests.

## Delivered behavior

- Home recommendations, popular discoveries, fresh finds, built-in mixes, artist mixes and autoplay use the new credential-free recommendation providers. They do not call Spotify's recommendation API or require Spotify client credentials.
- Provider order: exact NodeLink YouTube radio requests; public ListenBrainz recording lookup/similarity when radio has too few fresh candidates; music search; eligible library/history fallback. Language/genre search hints, favorite-artist weighting, novelty exclusion, ID/metadata deduplication and artist diversity are included.
- Generated mixes can be played, opened with the existing playlist route, saved as recent collections, and imported to the existing library. Track source, playback token, identifier and duration survive the relevant mappings.
- Public provider candidates have bounded memory/Redis caches, single-flight loading, request deadlines and load bounds. ListenBrainz has a conservative request queue and error/throttle cooldown. Final personalized results are not shared between users.
- Existing Spotify import/search endpoints remain available as an optional integration. Imports accept both old `track` and newer `item` playlist wrappers and fail on incomplete pagination instead of silently saving only the first pages. Spotify still controls which playlists an app can access.

## Functional repairs

| Audit issue | Repair |
| --- | --- |
| Client rewrites `ytrec:` into a music-search string | Dedicated adapter sends the exact identifier through the installed client's authenticated REST transport. Tested through the actual installed `rawRequest` implementation. |
| Spotify-first seed selection and no fallback | Radio prefers YouTube IDs or title/artist; provider failures fall through the new chain. |
| Delayed autoplay overwrites manual selection and queue | Playback revisions, cancellation, queue/account/party checks and a final freshness check prevent stale commits. The completed seed is captured before queue exhaustion clears it. |
| Cache failures block or discard music results | Disposable cache reads/writes tolerate errors and have an 800 ms wait limit. Authoritative state storage retains its error semantics. Malformed candidate cache entries are ignored. |
| Home failures permanently mark discovery fetched | Failed sections remain retryable, with two automatic retries and a manual refresh control. Successful/partial sections remain visible. |
| Home cache reused across accounts | Home and liked-track ownership are tied to UID; account transitions clear personalized state and reject delayed responses. |
| Duration lost between `length` and `duration` | Both wire and normalized durations are accepted, including legacy flat-array resolution responses. |
| Seed-only fallback loops the current song | Seed/recent ID and metadata exclusions apply to every provider and library fallback. Empty results stop cleanly. |
| Native position saved from unused HTML audio | Native saves use the player's millisecond progress converted to seconds. |
| Failed hydration permanently disables saving | Failed reads retry with backoff; saves wait for a successful read. Late hydration cannot replace manual playback. Signing back into the same account requires a fresh hydration read. |
| Hardcoded discovery year | Searches use the current year. The UI describes music-search discoveries without claiming an official live chart. |

Additional repairs: cancelled resolution can revisit the same track; stale stream-ticket refreshes cannot attach to a new track; delayed mix loads cannot replace newer playback; liked-song merge writes the complete master before deleting duplicates; delayed liked-song snapshots/playlist lookups cannot update another account; sidebar cloud playlists are scoped to their snapshot owner. Player ref handling, image error state, media-session dependencies and legacy track/timestamp typing were cleaned up to remove the original lint failures.

## Verification

Final source checks on September 13:

| Check | Result |
| --- | --- |
| `npm run test --workspace api` | **17 passed**, including an Express HTTP integration test and the installed NodeLink transport contract. Builds API TypeScript first. |
| `npm run test:browser` | **23 hook/store scenarios passed**, plus **2 discovery-screen interaction tests** at 1440 px and 390 px. The Playwright runner reports 3 tests because the hook scenarios run in one browser fixture. |
| `npm run lint --workspace web` | **0 errors, 0 warnings**, down from the initial 61 errors and 9 warnings. |
| Web TypeScript and `npm run build --workspace web` | Passed. The final production build completed compilation, TypeScript checking and prerendering. Network access was needed for the existing Google Fonts build dependency. |
| Built Next.js anonymous browser smoke, September 12 | Landing page rendered; recommendation GET and POST rejected missing authentication with 401; no page exceptions. One fetch was aborted. This predates later concurrent authentication edits. |
| `git diff --check` | Passed for this task's changes. |
| `graphify update .` | Regenerated the ignored local AST graph. CLI warned of a skill/package version mismatch but completed. |

The browser fixtures execute real React hooks, Zustand stores, and home components. Firebase auth/storage, recommendation HTTP data, navigation and the Capacitor platform flag are mocked. They verify state transitions and rendered UI, including play/import buttons and preference controls. They do not provide real-device audio or signed-in Firebase acceptance.

Evidence:

- [Browser scenario results](browser-regressions.json)
- [Desktop discovery screenshot](discovery-1440.png) and [browser diagnostics](discovery-1440.json)
- [Mobile discovery screenshot](discovery-390.png) and [browser diagnostics](discovery-390.json)
- [Earlier built-web smoke](production-web-smoke.json)
- [Lint result](lint-current.json)

## Live-service and delivery limits

- The public ListenBrainz Labs spike succeeded during implementation: unauthenticated Radiohead/Karma Police recording lookup returned MBID `9e2ad5bc-c6f9-40d2-a36f-3122ee2072a3`; similar-recordings returned artist/title metadata. This supersedes the initial audit's unsuccessful research-tool JSON retrieval. It is a small catalog smoke check, not broad recommendation-quality evaluation.
- Live NodeLink search/radio checks did not connect. The configured destination was verified without reading its password: `localhost:2333`, matching the Compose mapping. A credential-free TCP probe returned `ECONNREFUSED`; the Docker CLI reported no running engine. No end-to-end audio, rebuilt NodeLink container, Android device or packaged Tauri acceptance is claimed.
- Automatic approval review rejected a further authenticated NodeLink diagnostic because its credential destination was unverified. The safer configuration/TCP checks established the missing local service without transmitting credentials. Start the intended NodeLink service before performing authenticated live acceptance; do not redirect the password to a different host merely to test it.
- The NodeLink Docker source revision is pinned, but full container playback acceptance remains outstanding. Server hosting/storage/bandwidth and provider availability still apply; there is no new paid recommendation API dependency.
- Npm reported 38 dependency vulnerabilities while adding test tools. No blanket dependency upgrade or forced audit fix was applied. The existing Capacitor runtime version was explicitly restored to 7.6.8 in both the lockfile and installed modules.
- Newer desktop, authentication, settings and other edits appeared concurrently in the workspace after the first validation run. They were preserved, not attributed to this recommendation implementation. The final build/lint check includes the current tree; the fixture suite intentionally mocks authentication, so it does not validate those separate auth changes.
- No app version bump, commit, push, or deployment was performed.

Deployment details and reproducible commands are in [the recommendation guide](../../docs/recommendations.md). Rebuild web/API together, then confirm radio playback, imported playlists, pause/resume/seek, queue transitions, party listening and native position restoration against the actual services/devices.


## Commit preparation

The staged recommendation snapshot passed web/API TypeScript and all 17 backend cases. Seven small React lint corrections in playlist/search/library/settings, native callback ordering, external integrations and the topbar are included to keep the committed tree lint-clean. Separate desktop permissions, local development-login behavior, health-route changes and local MCP configuration remain outside this commit.
