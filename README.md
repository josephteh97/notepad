# Notepad v3

A local-first Android notepad app built with Vite + React + TypeScript + Capacitor.

**Package**: `com.cowork.notepad`
**Version**: 3.0.0

---

## Features

- **Notes** — text mode and checklist/todo mode
- **Color coding** — 8 color backgrounds, filterable
- **Pinned notes** — up to 10 notes pinned at the top
- **Calendar view** — browse notes by date
- **Reminders hub** — overdue / today / upcoming / later sections with snooze
- **Home-screen widgets** — 4×1 (single note) and 4×2 (3-note list)
- **Cloud sync** — Google Drive (hidden app folder) and OneDrive (AppFolder), OAuth 2.0 PKCE, no backend required
- **Data migration** — automatic import of v2 native app notes on first launch
- **Dark / light / system theme**

---

## Development Setup

```bash
npm install
npm run dev          # web dev server
npm run build        # production build
npx cap sync android # copy web assets to Android
```

Open in Android Studio: `npx cap open android`

---

## OAuth Client ID Setup

Cloud sync requires you to register OAuth credentials. Copy `.env.example` to `.env` and fill in the IDs.

### Google Drive

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or select existing)
3. Enable **Google Drive API**
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
5. **For web testing**: Application type = "Web application"
   - Authorized redirect URI: `http://localhost:5173/oauth/callback`
6. **For Android APK**: Application type = "Android"
   - Package name: `com.cowork.notepad`
   - SHA-1: get from `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`
   - No redirect URI needed for Android (uses custom scheme)
7. Set `VITE_GOOGLE_CLIENT_ID` in `.env`

### Microsoft OneDrive

1. Go to [Azure Portal](https://portal.azure.com/) → **App registrations → New registration**
2. Name: "Notepad", Supported account types: "Accounts in any org directory and personal Microsoft accounts"
3. **Authentication → Add a platform → Mobile and desktop applications**
   - Custom redirect URI: `com.cowork.notepad://oauth/callback`
4. **API permissions**: add `Files.ReadWrite.AppFolder`, `offline_access`, `User.Read`
5. Copy **Application (client) ID** → set `VITE_ONEDRIVE_CLIENT_ID` in `.env`

---

## Data Migration (v2 → v3)

When the Capacitor APK is installed **as an upgrade** over the v2 native Java app:

1. Android preserves `SharedPreferences` data (same package ID: `com.cowork.notepad`)
2. On first launch, `MigrationPlugin.kt` reads `notes_json` from SharedPreferences file `cowork_notepad_v2`
3. Notes are parsed and bulk-inserted into Dexie (IndexedDB)
4. Migration is marked done (`migration_done = true`) — idempotent on subsequent launches

**No notes are lost.** If migration fails, existing Dexie data is untouched and the error is logged (non-fatal).

---

## Android Widgets

Two home-screen widgets are registered:

| Widget | Size | Content |
|--------|------|---------|
| `Widget4x1` | 4×1 cells | Latest pinned note (title + body snippet) |
| `Widget4x2` | 4×2 cells | Header + 3 most recent notes, tap each to deep-link |

Widgets read from SharedPreferences (`notepad_widget_prefs`, key `widget_notes_json`), updated by `WidgetPlugin.kt` after every note save.

To add a widget: long-press home screen → Widgets → search "Notepad".

---

## Cloud Sync Architecture

```
src/cloud/
  types.ts          — CloudProvider interface, CloudSnapshot, TokenSet
  oauth.ts          — PKCE helpers, token storage (SecureStorage/localStorage)
  providers/
    googleDrive.ts  — appDataFolder scope, exponential backoff
    oneDrive.ts     — Files.ReadWrite.AppFolder, Microsoft Graph API
  syncEngine.ts     — mutex, pull/merge/push, SHA-256 content hash
  conflict.ts       — last-write-wins, optional "keep both" conflict copies
  index.ts          — provider singleton

android/.../SyncPlugin.kt — WorkManager periodic (15 min, network-required)
```

**Sync triggers**: app start, network reconnect, tab visibility change, 2-min debounce after local changes, manual "Sync now".

**Conflict resolution**: per-note last-write-wins (newest `updatedAt` wins). Enable "On conflict keep both" in Settings to also save a `(冲突副本)` copy.

**Tombstones**: soft-deleted notes are retained as tombstones for 30 days to propagate deletions across devices.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| OAuth redirect fails on Android | Ensure `com.cowork.notepad://oauth/callback` is registered in Google Cloud Console / Azure Portal |
| "Not authenticated" after reinstall | Tokens are stored in `EncryptedSharedPreferences` — they survive reinstall but not a full data clear |
| Widget shows stale data | Force-update: open a note and save; this triggers `WidgetPlugin.updateWidget()` |
| Notes not migrating from v2 | Check Logcat for `[Migration]` tag; ensure same package ID `com.cowork.notepad` |
| Sync quota exceeded | Open Settings → Cloud → manage storage in provider's web UI |

---

## Project Structure

```
src/
  db/          — Dexie schema (NotepadDB), CRUD helpers
  hooks/       — useNotes, useReminders, useSettings, useTheme, useSync
  components/  — NoteCard, ChecklistEditor, ColorPicker, Drawer, ...
  screens/     — HomeScreen, EditorScreen, CalendarScreen, RemindersScreen, SettingsScreen, OnboardingScreen
  cloud/       — OAuth, sync engine, providers
  utils/       — date formatting, toast, notifications, migration bridge
android/
  app/src/main/java/com/cowork/notepad/
    MainActivity.java   — registers Capacitor plugins
    MigrationPlugin.kt  — v2 SharedPreferences reader
    WidgetPlugin.kt     — writes widget cache to SharedPreferences
    Widget4x1.kt        — 4×1 home-screen widget
    Widget4x2.kt        — 4×2 home-screen widget
    SyncPlugin.kt       — WorkManager background sync scheduler
```
