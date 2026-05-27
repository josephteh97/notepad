# Google Drive OAuth Setup Guide

Step-by-step walkthrough for creating the Google Cloud project and OAuth Client ID needed by the Notepad app's cloud-sync feature. Designed to be followable from any PC — your project lives on Google's servers, so just sign in with the same Google account on whichever machine you're on.

## Your values (copy these into Google Cloud Console)

| Field | Value |
|---|---|
| **Package name** | `com.cowork.notepad` |
| **SHA-1 fingerprint** (debug keystore) | `D4:38:FC:C1:86:09:BE:83:C4:6D:2F:6C:52:86:20:F3:E0:DD:F9:3D` |
| **Google account** | `george339966@gmail.com` |
| **Project name** | `notepad-sync` |
| **OAuth client name** | `Notepad Android` |
| **App name** (consent screen) | `Notepad` |

The SHA-1 above is from `~/.android/debug.keystore` on the original dev machine. If you ever rebuild the APK on a different machine with a different debug keystore, that machine's SHA-1 will differ and you'll need to register the new one as an additional fingerprint on the same OAuth client.

To compute SHA-1 from a different machine:
```
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1
```

---

## Cost

**Free.** Google Drive API has a 1-billion-call/day quota at no charge. Our app makes maybe ~50 calls per day. No billing account needed if you can avoid it.

If your account is in a Google Workspace organization, project creation may force a billing account. If so:
1. Try setting **组织 (Organization)** to **无组织 (No organization)** in the new-project form first.
2. If that's not allowed (Workspace admin policy), adding a billing account is safe — Google does a $1 verification charge that's refunded, then never charges as long as you don't enable other paid APIs.
3. Or use a personal (non-Workspace) Gmail to create the project — the OAuth flow works fine even when signing in as a different account at consent time.

---

## Step 1 — Create the Cloud project

1. Open **https://console.cloud.google.com**, sign in with `george339966@gmail.com`.
2. Top-left project dropdown → **NEW PROJECT** (新建项目).
3. **Project name** (项目名称): `notepad-sync`.
4. **Organization** (组织): try `无组织` if it's an option, otherwise leave default.
5. Click **CREATE** (创建).
6. Wait ~10 seconds. Confirm the top-bar dropdown now shows `notepad-sync`.

## Step 2 — Enable the Drive API

1. Left menu (☰) → **APIs & Services** (API 和服务) → **Library** (库).
2. Search box: `Google Drive API`.
3. Click the result → click **ENABLE** (启用).
4. Wait ~15 seconds for the API to activate.

## Step 3 — Configure the OAuth consent screen

1. Left menu → **APIs & Services** → **OAuth consent screen** (OAuth 同意屏幕).
2. **User Type**: **External** (外部) → **CREATE** (创建).
3. Fill in:
   - **App name** (应用名称): `Notepad`
   - **User support email**: `george339966@gmail.com`
   - Scroll to **Developer contact information** (开发者联系信息): `george339966@gmail.com`
   - Leave everything else blank.
4. **SAVE AND CONTINUE** (保存并继续).
5. **Scopes** (范围) page: skip — click **SAVE AND CONTINUE**. (App requests scopes at runtime.)
6. **Test users** (测试用户): click **+ ADD USERS** (添加用户) → enter `george339966@gmail.com` → **ADD** → **SAVE AND CONTINUE**.
7. **Summary**: **BACK TO DASHBOARD** (返回信息中心).

The app will stay in "Testing" status. That's fine — you don't need to publish or verify for personal use. The only caveat: refresh tokens for test users expire after 7 days, so you'll need to reconnect cloud sync once a week. (When the app is eventually verified by Google, this jumps to never-expiring.)

## Step 4 — Create the Android OAuth Client ID

This is the step that populates the empty Credentials dashboard.

1. Left menu → **APIs & Services** → **Credentials** (凭证).
2. Top of page: **+ CREATE CREDENTIALS** (+ 创建凭证) → **OAuth client ID** (OAuth 客户端 ID).
3. **Application type** (应用类型): **Android**.
4. **Name** (名称): `Notepad Android`.
5. **Package name** (软件包名称): `com.cowork.notepad`
6. **SHA-1 certificate fingerprint** (SHA-1 证书指纹): paste
   ```
   D4:38:FC:C1:86:09:BE:83:C4:6D:2F:6C:52:86:20:F3:E0:DD:F9:3D
   ```
7. Click **CREATE** (创建).
8. A dialog appears showing your **Client ID**. It looks like:
   ```
   123456789012-abcdefghijklmnop.apps.googleusercontent.com
   ```
9. **Copy this Client ID.** You can also find it later on the Credentials page anytime.

## Step 5 — Hand the Client ID back

Send the Client ID to Claude. The next steps (write `.env`, rebuild APK, install, verify) happen automatically once the value is in.

---

## What happens after you give Claude the Client ID

For reference — this is what gets done automatically, no action needed from you:

1. **Write `.env`** at the repo root (gitignored, so the secret stays out of GitHub):
   ```
   VITE_GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
   VITE_ONEDRIVE_CLIENT_ID=YOUR_AZURE_APP_CLIENT_ID
   ```
2. **Rebuild the APK** so the credential is baked into the bundle (Vite inlines `import.meta.env.*` at build time):
   ```
   npm run build && npx cap sync android
   cd android && ./gradlew assembleDebug
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```
   The `-r` flag preserves existing notes — your migrated v2 notes survive.

3. **On-device test**: open the app → Settings → 连接云账户 → pick Google Drive → grant consent in the in-app browser → control returns to Notepad via the `com.cowork.notepad://oauth/callback` deep link → tokens save to Android SecureStorage → first sync uploads a snapshot to your Drive's hidden app folder.

4. **Verify backup exists**: visit https://drive.google.com/drive/u/0/settings → "Manage apps" → look for "Notepad" with non-zero storage. The snapshot file isn't visible in normal Drive UI (it's in the sandboxed `appDataFolder` scope), only via this page.

5. **Restore-from-cloud round-trip**: uninstall, reinstall, choose "Restore from cloud" at onboarding, confirm all 22 notes reappear.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `redirect_uri_mismatch` after granting consent | The SHA-1 + package name don't match what Google has | Recompute SHA-1 from the keystore that signed the installed APK, edit the OAuth client to add it as an additional fingerprint |
| "云同步未配置" toast | `.env` empty or not picked up by the build | Confirm `.env` exists, then rebuild — Vite only reads `.env` at build time |
| Browser opens but never returns to app | Deep-link intent filter not firing | Check `adb logcat \| grep -i 'oauth\\|appUrlOpen'` — the URL should land in `MainActivity` |
| "This app isn't verified" warning | Normal for Testing-status apps | Click "Advanced" → "Go to Notepad (unsafe)". It's your own app, it's safe. |
| Reconnect required every 7 days | Test-user refresh tokens expire | Either accept it, or move the OAuth consent screen to "In production" status (requires app verification, more work) |

## OneDrive (deferred)

Same shape, different console. Not set up yet — see `README.md` for the Azure walkthrough when you're ready.
