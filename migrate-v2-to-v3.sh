#!/usr/bin/env bash
# One-shot migration: extract v2 SharedPreferences, uninstall v2,
# install v3, push prefs back so MigrationPlugin can import them.
#
# Plug your phone in with USB debugging enabled, then run:
#   bash /home/jiezhi/Documents/notepad/migrate-v2-to-v3.sh
#
# Stops on any error. Safe to re-run if the early steps fail —
# v2 is only uninstalled after the backup file exists locally.

set -euo pipefail

APK="/home/jiezhi/Documents/notepad/notepad-v3-debug.apk"
BACKUP="/home/jiezhi/Documents/notepad/v2-notes-backup-$(date +%Y%m%d-%H%M%S).xml"
PKG="com.cowork.notepad"
PREFS_PATH="shared_prefs/cowork_notepad_v2.xml"

confirm() {
  read -r -p "$1 [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
}

echo "==> Checking adb connection"
if ! command -v adb >/dev/null 2>&1; then
  if [[ -x /home/jiezhi/Android/Sdk/platform-tools/adb ]]; then
    export PATH="/home/jiezhi/Android/Sdk/platform-tools:$PATH"
  else
    echo "adb not found. Install platform-tools or add it to PATH."
    exit 1
  fi
fi
adb devices
DEVICES=$(adb devices | awk 'NR>1 && $2=="device"' | wc -l)
if [[ "$DEVICES" -eq 0 ]]; then
  echo "No device connected. Plug your phone in, enable USB debugging, accept the prompt, then re-run."
  exit 1
fi

echo
echo "==> Verifying v2 is currently installed"
if ! adb shell pm list packages | grep -q "package:$PKG$"; then
  echo "Package $PKG is not installed on this device. Nothing to migrate."
  echo "If you already uninstalled it, your v2 notes are gone — install v3 fresh:"
  echo "    adb install $APK"
  exit 1
fi

echo
echo "==> Backing up v2 SharedPreferences to:"
echo "    $BACKUP"
adb shell "run-as $PKG cat /data/data/$PKG/$PREFS_PATH" > "$BACKUP" || true
if [[ ! -s "$BACKUP" ]]; then
  echo
  echo "WARNING: backup file is empty. Possible reasons:"
  echo "  - v2 was not built as a debug APK (run-as denied)"
  echo "  - SharedPreferences file name differs"
  echo
  echo "Listing v2's shared_prefs directory:"
  adb shell "run-as $PKG ls -la shared_prefs/" || true
  echo
  echo "Aborting. Investigate before continuing — do NOT uninstall v2 yet."
  exit 1
fi
echo "Backup size: $(wc -c < "$BACKUP") bytes"
echo "First 5 lines:"
head -5 "$BACKUP"

echo
confirm "Backup looks good. Uninstall v2 and install v3 now?"

echo
echo "==> Uninstalling v2"
adb uninstall "$PKG"

echo
echo "==> Installing v3"
adb install "$APK"

echo
echo "==> Launching v3 once so its data dir gets created"
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 4
adb shell am force-stop "$PKG"
sleep 1

echo
echo "==> Pushing v2 prefs back into v3's data dir"
adb shell "run-as $PKG mkdir -p shared_prefs"
cat "$BACKUP" | adb shell "run-as $PKG sh -c 'cat > $PREFS_PATH'"
adb shell "run-as $PKG ls -la shared_prefs/"

echo
echo "==> Launching v3 — MigrationPlugin should import your notes on first start"
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null

echo
echo "Done. Open the app on your phone and confirm your notes are there."
echo "Backup kept at: $BACKUP"
