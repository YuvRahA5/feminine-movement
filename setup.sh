#!/usr/bin/env bash
# One command to install and run the app (made for a GitHub Codespace).
# Usage:  bash setup.sh
# Then scan the QR code with the iPhone camera; it opens in Expo Go.
set -e
cd "$(dirname "$0")"

if [ ! -f package.json ]; then
  echo "▶ Creating the project base (picks the Expo version that matches Expo Go)…"
  rm -rf .expo-template
  npx --yes create-expo-app@latest .expo-template --template blank-typescript --no-install
  cp .expo-template/package.json .expo-template/tsconfig.json .
  rm -rf .expo-template
  node -e "const f='package.json';const p=require('./'+f);p.name='feminine-movement';p.main='expo-router/entry';require('fs').writeFileSync(f,JSON.stringify(p,null,2)+'\n')"
fi

echo "▶ Installing…"
npm install
npx expo install expo-router expo-linking expo-constants expo-status-bar \
  react-native-safe-area-context react-native-screens react-native-gesture-handler \
  @react-native-async-storage/async-storage react-native-url-polyfill @supabase/supabase-js \
  expo-font @expo-google-fonts/rubik expo-video expo-image-picker @expo/vector-icons
npm install -g @expo/ngrok@^4.1.0 >/dev/null 2>&1 || true

echo "▶ Starting. Scan the QR code with your iPhone camera."
npx expo start --tunnel
