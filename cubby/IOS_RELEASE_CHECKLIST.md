# iOS release checklist — ship the Phase 2 notification RPCs to existing users

**Purpose:** the web app now writes bookings/review notifications through `create_booking_notification_v2` / `create_review_notification_v2` (merged in PR #174, commit `f29eeeb`, live in production since 2026-10-16). The installed iOS app still runs whatever JS bundle shipped with the last submitted build — there is no OTA update path (`expo-updates` is not a dependency), so the only way existing iOS users get this change is a new native build submitted through the App Store. This checklist prepares that release. **Nothing below has been executed — build and submit are explicitly not started.**

## 0. Preconditions (should already be true — confirm, don't assume)

- [ ] `PHASE2_NOTIFICATION_RPCS_V2.sql` is live in production — **confirmed this session** (ownership, grants, return types verified).
- [ ] `BOOKING_NOTIFICATION_AUTH_NULL_PATCH.sql` is live in production — **confirmed this session**.
- [ ] Apple Developer Program membership for this account is active and in good standing. `PRIVATE_BETA_LAUNCH_PLAYBOOK.md` flagged Apple approval as a pending external dependency with its own timeline — re-check current status before starting a build; it cannot be accelerated from here.
- [ ] App Store Connect record exists for bundle id `com.mycubby.app` (Cubby), or is ready to be created on first submit.

## 1. Version bump

- [x] Bumped `app.json` `"version"`: `1.0.5` → `1.0.6`. `eas.json`'s `production` build profile has `"autoIncrement": true`, so EAS assigns the iOS build number remotely (`appVersionSource: "remote"`) — this bump only covers the marketing version, which doesn't move on its own.

## 2. Pre-build verification (reuse what already exists — no new audit)

- [x] Node test suites pass: `push-authorization.test.ts` + `notification-rpc.test.ts`, 32/32.
- [x] `npx tsc --noEmit` on current `main` (`b014e97`) — every `app/`/`src/` error present today already existed in the pre-sprint baseline (commit `2d909ad`, confirmed via a side-by-side worktree diff); zero new error categories. `supabase/functions/**` Deno noise is expected and unrelated to the native bundle.
- [x] `npx expo export -p web` succeeds — 1525 modules, zero errors, matches PR #174's own report.
- [ ] **Not verified from this session — network-blocked:** EAS login state, iOS signing credentials, and App Store Connect submit configuration. This sandbox's outbound network policy rejects `cdp.expo.dev` (confirmed via a live 403 at the proxy level, same restriction already hit against `app.mycubby.co.za` and `*.supabase.co` earlier in this engagement) — no `eas` CLI command can reach Expo's servers from here, independent of what credentials exist. Must be run from an environment with real network access to `expo.dev`/`*.easbuild.net`.
- [ ] Confirm `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set correctly for production in the EAS project's environment variables (`eas env:list production` or the EAS dashboard) — not just in local `.env`. Same for `EXPO_PUBLIC_SENTRY_DSN` and `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` if used on iOS.
- [ ] Re-read `notification-service.ts`'s deployment-order comment: the client now hard-depends on the `_v2` RPCs existing. Since both are confirmed live, this build is safe to ship — but if any further SQL changes are planned before this build goes out, re-check this gate again right before building.

## 3. EAS build (not run)

```
eas build --platform ios --profile production
```

- Profile `production` in `eas.json` has no explicit `distribution`, so it defaults to store distribution (not `internal`) — correct for an App Store release.
- `appVersionSource: "remote"` (top-level `cli` config) means EAS, not `app.json`, is the source of truth for the build/version number it assigns — confirm the version shown in the EAS build matches the bump from step 1 before proceeding past this step.
- Expect Expo SDK 56 toolchain (per `AGENTS.md` — this project pinned to v56 docs); if the EAS build image defaults to a different SDK, pin `eas.json`'s build profile accordingly rather than letting it drift.

## 4. Internal verification before submitting

- [ ] Install the resulting build on at least one physical device or simulator via TestFlight internal testing (or an ad hoc/internal distribution build first, if you want a cheaper pre-TestFlight smoke pass).
- [ ] Smoke test the exact flows this release changes: a host confirming/declining a booking, a traveller cancelling a booking, and a review submission on both sides (host→traveller and traveller→host) — confirm the in-app notification appears and, if a push token is registered, confirm the push arrives. Use real but disposable/test accounts; do not manufacture data against other users' real bookings.
- [ ] Confirm existing, already-installed-app behavior for anything **not** touched by this release still works (sign-in, browsing, existing bookings) — this is a superset release, not a rewrite, so regressions here would be unexpected but worth a quick pass.

## 5. App Store submission (not run)

```
eas submit --platform ios --profile production
```

- `eas.json`'s `submit.production` profile is empty — EAS will either prompt interactively for Apple credentials/App Store Connect API key on first run, or needs `ASC_APP_ID` / API key env vars configured beforehand. Confirm which, and set it up before running `submit` for real so it isn't done ad hoc mid-release.
- After upload, it still needs: build processing in App Store Connect, submission for review, and Apple's review turnaround (historically the least predictable step — see the Day 14 go/no-go note in `PRIVATE_BETA_LAUNCH_PLAYBOOK.md`).
- Store listing assets (screenshots, description, privacy nutrition label) should already exist per the beta launch playbook's Day 11 prep; confirm they're still accurate for this version rather than assuming.

## 6. Post-release

- [ ] Tag the release commit / EAS build in whatever release tracker is used, noting it corresponds to web commit `f29eeeb` (PR #174) plus the NULL-auth patch.
- [ ] Watch Sentry and Supabase logs for the first cohort of users updating, specifically for `_v2` RPC errors (would surface as `[notification-rpc] ... threw` or `... returned an error` in client logs per `notification-rpc.ts`'s `onError` logging) — these should be silent given this exact path was verified against production, but this is the first time real iOS clients exercise it.
