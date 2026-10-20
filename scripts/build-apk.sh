#!/usr/bin/env bash
# ==============================================================================
# NA Distributors ERP - Mobile APK & Native Android Build Script
# ==============================================================================
set -e

echo "🌶️  Building NA Distributors Spice ERP Web Assets..."
npm run build

echo "📱 Syncing Web Assets with Capacitor Native Android Project..."
npx cap sync android

echo "✅ Android project synchronized successfully at /android"
echo "To compile the APK:"
echo " 1) Option A (Android Studio): npx cap open android -> Build > Build APK"
echo " 2) Option B (Command Line):   cd android && ./gradlew assembleDebug"
echo "The resulting APK will be at: android/app/build/outputs/apk/debug/app-debug.apk"
