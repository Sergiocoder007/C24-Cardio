#!/usr/bin/env bash
# One-time Android setup for C24 Cardio (run on a Mac/PC with Android Studio).
# Usage: bash scripts/android-setup.sh
#
# Creates the Capacitor Android project, generates icons/splash from assets/,
# sets the version, and builds a debug APK. It never creates, reads or commits
# signing keys: release signing is done in Android Studio (see README).
set -euo pipefail
cd "$(dirname "$0")/.."

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1 — $2"; exit 1; }; }
need node "install Node.js 22 or newer (https://nodejs.org)"
need npx "comes with Node.js"
need java "install Android Studio; it bundles a JDK (or install JDK 21)"

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$NODE_MAJOR" -lt 22 ]; then echo "Node $NODE_MAJOR found; Capacitor 8 needs Node 22+"; exit 1; fi

if [ -z "${ANDROID_HOME:-}" ] && [ -d "$HOME/Library/Android/sdk" ]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
fi
[ -n "${ANDROID_HOME:-}" ] || { echo "Set ANDROID_HOME to your Android SDK (Android Studio › Settings › Android SDK)"; exit 1; }

echo "==> Installing packages"
npm install

echo "==> Tests, lint, web build"
npm test
npm run lint
npm run build

if [ ! -d android ]; then
  echo "==> Creating the Android project (com.c24cardio.android)"
  npx cap add android
fi

echo "==> Icons and splash screens from assets/"
npx --yes @capacitor/assets generate --android \
  --iconBackgroundColor '#050505' --iconBackgroundColorDark '#050505' \
  --splashBackgroundColor '#050505' --splashBackgroundColorDark '#050505'

echo "==> Version"
VERSION_NAME=$(node -p 'require("./package.json").version')
GRADLE=android/app/build.gradle
sed -i.bak -E "s/versionName \"[^\"]*\"/versionName \"${VERSION_NAME}\"/" "$GRADLE" && rm -f "$GRADLE.bak"
grep -E "applicationId|versionCode|versionName|minSdk|targetSdk" "$GRADLE" android/variables.gradle || true

echo "==> Syncing web build into Android"
npx cap sync android

echo "==> Debug build"
(cd android && ./gradlew assembleDebug)

APK=android/app/build/outputs/apk/debug/app-debug.apk
echo
echo "Done. Debug APK: $APK"
echo "Install on a connected phone:  adb install -r $APK"
echo "Open in Android Studio:        npx cap open android"
echo "Then commit the android/ folder (it contains no secrets)."
