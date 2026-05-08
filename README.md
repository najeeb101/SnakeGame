# Snake Arcade

A premium arcade Snake game built with Vite, React, TypeScript, Framer Motion, and HTML5 Canvas.

## Features

- Canvas-based Snake gameplay with responsive keyboard, WASD, swipe, and on-screen controls
- React UI with animated menus, HUD cards, mission progress, overlays, and run summaries
- Arcade progression with combo scoring, power-ups, obstacle waves, and rotating missions
- Local persistence for best score, best level, best combo, mission totals, difficulty, and sound preference
- Static deploy setup for Vercel and Netlify

## Run Locally

```bash
npm install
npm start
```

Open the URL printed by Vite, usually `http://localhost:3002`.

## Commands

```bash
npm start        # Start local app on http://localhost:3002
npm run dev      # Start Vite dev server
npm run check    # Type-check the React/TypeScript app
npm run build    # Type-check and create dist/
npm run preview  # Preview the production build
```

## Deployment

The app is static-first.

- Vercel: uses `vercel.json`, builds with `npm run build`, outputs `dist/`.
- Netlify: uses `netlify.toml`, builds with `npm run build`, publishes `dist/`.

## Project Structure

- `src/` - React app, TypeScript game engine, styles, and UI
- `src/gameEngine.ts` - Canvas gameplay, state, scoring, missions, particles, and persistence hooks
- `public/` - static assets copied by Vite, including manifest and favicon
- `index.html` - Vite HTML entry
- `legacy/` - archived prototypes kept out of the app path
