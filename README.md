# IntelliPrep
AI Notes and Calculator and Interview App

## Overview
IntelliPrep is an AI-powered productivity app built with React Native and Expo. It helps you take smarter notes, practice interviews, and do quick calculations — all in one place. Data is synced via Supabase, and AI features are powered by Google Gemini.

## Features
- **AI Notes**: Summarize or expand notes with Gemini. Markdown support and history.
- **Mock Interviews**: Generate questions, record answers, get AI feedback and a transcript saved to Notes.
- **Calculator + History**: Perform calculations and save them to notes with metadata.
- **Email Auth**: Sign up/sign in, password reset, email confirmation.
- **Profile & Preferences**: Theme selection, premium flag, and device-only Gemini API key storage.
- **Offline-friendly UI**: Smooth animations, gradients, and NativeWind styling.

## Tech Stack
- **Framework**: Expo (React Native)
- **Navigation**: Expo Router
- **UI**: NativeWind (Tailwind), expo-linear-gradient, expo-blur
- **State**: Zustand
- **Backend**: Supabase (Auth + Postgres + Realtime)
- **AI**: Google Gemini (@google/generative-ai)

## Project Structure
```
app/                # Routes (Expo Router)
  (auth)/           # login, register, forgot-password, email-confirmation
  (tabs)/           # calculator, interview, profile
  interview/[id].tsx
components/         # UI components (ExternalLink, UpgradeDialog, etc.)
services/           # Business logic (notesService, interviewService, aiService)
constants/          # Types, contexts, themes
stores/             # Zustand stores
assets/             # Images, fonts, etc.
```

## Getting Started
1) Install dependencies
```
npm install
```
2) Configure environment (example)
```
# app.json -> expo.extra or EXPO_PUBLIC_* envs via EAS
EXPO_PUBLIC_SUPABASE_URL=your-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key
```
3) Run the app
```
npx expo start
```

## Building for Production (Android AAB)
Add `eas.json` and build:
```
npx eas build -p android --profile production
```
Upload the AAB to Google Play Console (internal testing first recommended):
```
npx eas submit -p android --latest --profile production
```

## Notes on Keys & Secrets
- For builds on EAS, use EAS Secrets for API keys rather than hardcoding.
- On-device Gemini key is stored securely via `expo-secure-store` if provided in Profile.

## License
Copyright 2025 IntelliPrep.
