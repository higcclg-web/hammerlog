# Hammerlog 🔨

A workout + nutrition tracker that runs entirely on your device. No accounts, no servers, no tracking — just you and the iron.

**Live app:** deployed on Vercel as an installable PWA (works offline).

## Features

- **Workouts** — build sessions exercise-by-exercise, log sets (reps × weight), tick them done with an automatic rest timer, save reusable routines, and browse full history. Ships with a 50+ exercise library plus custom exercises.
- **Nutrition** — log foods by meal, track calories and protein/carbs/fat against daily goals with clean progress rings. Foods you enter once are saved for instant reuse. Browse any day.
- **Progress** — charts for bodyweight trend, calories vs goal, weekly training volume, and estimated 1-rep-max per lift (Epley).
- **Settings** — lb/kg toggle (data converts automatically), editable goals, JSON export/import, full reset.

## Privacy

All data lives in your browser's local storage on your device. Nothing is ever sent anywhere. Export regularly if you care about your logs — clearing site data erases them.

> Hammerlog is not medical or nutritional advice. Targets and 1RM estimates are informational only.

## Stack

React 18 + TypeScript + Vite, Tailwind CSS v4, Zustand (persisted to localStorage), Recharts, vite-plugin-pwa (Workbox service worker).

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # regenerates icons, type-checks, builds to dist/
npm run preview  # serve the production build (service worker active)
```

Deployed as a static site (see `vercel.json` for caching headers: no-cache on `sw.js`/manifest, immutable on hashed assets).
