# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Commands

```bash
npm install      # Install dependencies
npm start        # Start Vite at http://localhost:3002
npm run dev      # Start Vite at http://localhost:3002 by default
npm run check    # Type-check with tsc --noEmit
npm run build    # Type-check and build dist/
npm run preview  # Preview dist/
```

## Architecture

This is a Vite + React + TypeScript relaunch of the Snake game. The app is static-first and deploys to Vercel or Netlify from `dist/`.

- `src/App.tsx` owns the React UI: animated setup panel, HUD, mission list, power-up display, canvas overlay, mobile controls, and sound toggle.
- `src/gameEngine.ts` owns gameplay: fixed-timestep movement, canvas rendering, particles, obstacles, power-ups, scoring, missions, Web Audio effects, and snapshot subscriptions.
- `src/storage.ts` owns localStorage persistence under the `snakeArcade.` namespace and migrates the old `snakeHighScore`.
- `src/styles.css` owns the premium arcade visual system and responsive layout.
- `public/` contains only static assets copied by Vite.

React should not mutate game internals directly. Add engine methods for new gameplay actions, expose UI state through snapshots, and keep rendering performance-sensitive canvas work outside React rerender loops.
