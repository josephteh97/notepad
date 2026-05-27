# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev               # Vite web dev server (no native plugins — migration/widget are no-ops)
npm run build             # tsc -b && vite build → writes dist/
npm run lint              # eslint .
npm run preview           # serve built dist/

npx cap sync android      # copy dist/ + plugins into android/
npx cap open android      # open project in Android Studio
npx cap run android       # build + install debug APK on connected device
```

There is **no test framework** — no Jest, Vitest, Playwright, etc. Verification is manual via `npm run dev` (browser) for non-native paths and `npx cap run android` for plugin behavior (migration, widgets, notifications, OAuth).

Cloud sync requires a `.env` (copy `.env.example`). Without it, `launchOAuthFlow` in `src/cloud/oauth.ts` throws a "云同步未配置" message — by design.

## Architecture

### The three layers

1. **React/TS app** in `src/` — pure web code, runs in both the browser and the Capacitor WebView.
2. **Capacitor bridge** in `src/utils/MigrationPlugin.ts`, `src/utils/WidgetPlugin.ts` — typed `registerPlugin<>()` wrappers around Kotlin plugins.
3. **Native Android** in `android/app/src/main/java/com/cowork/notepad/` — three custom Kotlin plugins plus the two widget receivers.

`MainActivity.java` registers all three plugins **before `super.onCreate`** — anything added later won't be visible to JS.

### Boot sequence (`src/App.tsx`)

On every launch, `init()` runs in this order:
1. `runV2Migration()` — reads `cowork_notepad_v2` SharedPreferences via `MigrationPlugin.kt`, bulk-inserts into Dexie, sets `migration_done` flag. No-op if already done or not on Android.
2. `runDateBackfill()` — one-shot fix that converts any string-typed `date` fields (from earlier migration code) to midnight-local timestamps. Idempotent via `dateBackfillV1Done` setting.
3. `pushWidgetUpdate()` — refreshes the home-screen widget cache.
4. Onboarding check — only shown when both `onboardingDone` is unset and `db.notes.count() === 0`. If migration just imported notes, onboarding is silently skipped.

When changing boot logic, preserve the migration-before-anything-else ordering; widget/onboarding both depend on notes already being in Dexie.

### Data flow: Dexie is the only source of truth

All UI reads use `useLiveQuery` from `dexie-react-hooks` — components auto-rerender on any DB write. Never cache notes in React state across renders; always go through the hooks in `src/hooks/useNotes.ts` (`useAllNotes`, `usePinnedNotes`, `useNote`, `useNotesByDate`, `useDatesWithNotes`).

Writes go through helpers in `src/db/index.ts` (`createNote`, `updateNote`, `deleteNote`). `deleteNote` is soft (tombstone) when cloud is connected, hard otherwise — important when adding deletion paths.

`pushWidgetUpdate()` is `Capacitor.isNativePlatform()`-gated and safe to call always. Call it after any operation that changes which notes appear in the top-3 widget list (pin/unpin, edit, delete, color change).

### Sort order conventions

Default `SortBy` is `'date'` (user-assigned `note.date`, falling back to `updatedAt` when null) — see `src/hooks/useNotes.ts:sortNotes`. `NoteCard` footer mirrors this: shows `note.date` when set, else `updatedAt`. If you add a new sort mode, add it to both `SortBy` in `src/db/types.ts` and the `OPTIONS` array in `src/components/SortMenu.tsx`.

### Cloud sync (`src/cloud/`)

- OAuth 2.0 PKCE, no backend, no client secret. Tokens stored in `@aparajita/capacitor-secure-storage` on Android, localStorage on web.
- `syncEngine.ts` uses a module-level `syncMutex` boolean and a `notepad-snapshot.json` single-file model. SHA-256 `contentHash` short-circuits no-op syncs.
- Conflict resolution is last-write-wins by `updatedAt`. The `conflictKeepBoth` setting additionally saves a `(冲突副本)` copy.
- Tombstones (`deletedAt` set) propagate deletes across devices and are pruned after 30 days.
- Sync triggers: app start, `@capacitor/network` online event, `visibilitychange`, 2-min debounce after local change, manual button, `SyncPlugin.kt` WorkManager (15 min).

### Migration is fragile by design

The v2 → v3 path depends on Android preserving SharedPreferences across an in-place upgrade — same package ID `com.cowork.notepad`, same signing key. If the v3 build is signed with a different debug keystore than v2, install fails with `INSTALL_FAILED ... signature different`. `migrate-v2-to-v3.sh` is the workaround script (back up XML via `run-as`, uninstall, reinstall, push XML back).

If you're touching `MigrationPlugin.kt` or `src/utils/migration.ts`, remember: the migration also runs after the user has been using v3 (e.g., if they restore an XML manually). Always guard with the `migration_done` flag and **never overwrite existing Dexie notes** — current code uses `db.notes.add` (not `put`) inside a transaction so collisions throw, preserving local state.

### Theme

Tailwind v4 in `src/index.css` declares `@custom-variant dark (&:where(.dark, .dark *));` to opt into class-based dark mode (v4's default is media-query). `useTheme()` (`src/hooks/useTheme.ts`) toggles `.dark` on `<html>` and listens to `matchMedia` for the `'system'` setting.

### JVM target

`android/app/build.gradle` pins both Java `compileOptions` and Kotlin `kotlinOptions { jvmTarget }` to **21** to match Android Studio's bundled JBR. Touching one without the other produces `Inconsistent JVM-target compatibility detected`.

## Key files for orientation

- `src/App.tsx` — boot sequence + routes
- `src/db/index.ts` + `src/db/types.ts` — Dexie schema, CRUD, widget cache push
- `src/hooks/useNotes.ts` — every UI query lives here
- `src/utils/migration.ts` — v2 import + date backfill
- `android/.../MainActivity.java` — plugin registration
- `android/.../{Migration,Widget,Sync}Plugin.kt` — native bridge implementations
- `src/cloud/syncEngine.ts` — pull/merge/push pipeline
- `README.md` — OAuth setup, troubleshooting, widget layout
