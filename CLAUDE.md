# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install      # Install dependencies
npm start        # Start Vite at http://localhost:3002
npm run dev      # Start Vite at http://localhost:3002
npm run check    # Type-check with tsc --noEmit
npm run build    # Type-check and build dist/
npm run preview  # Preview dist/
```

There is no test suite.

## Architecture

Vite + React + TypeScript Snake game. Static-first, deploys to Vercel or Netlify from `dist/`.

### Module responsibilities

- `src/gameEngine.ts` — `SnakeGameEngine` class owns all gameplay. Fixed-timestep loop via `requestAnimationFrame` with an accumulator; canvas rendering; particles; Web Audio API tones; power-ups; missions; obstacles. Exposes a pub/sub API: callers call `engine.subscribe(fn)` and receive a `GameSnapshot` on every state change.
- `src/App.tsx` — single React component. Mounts the engine on a `<canvas>` ref, subscribes with `setSnapshot`, and re-renders from the snapshot. Uses `framer-motion` for panel and overlay animations. Wires keyboard (WASD/arrows, Space, Enter, R) and touch events directly to engine methods.
- `src/types.ts` — shared TypeScript types. `GameSnapshot` is the only data boundary between the engine and React; it extends `PersistedStats` with transient run state.
- `src/storage.ts` — `loadStats`/`saveStats` under the `snakeArcade.stats` localStorage key. Migrates the legacy `snakeHighScore` key on first load.
- `src/styles.css` — all visual styling: dark arcade theme, layout, responsive breakpoints, animations.

### Key design rules

React must not mutate engine state directly. Add public methods to `SnakeGameEngine` for new gameplay actions and expose any new UI state through `GameSnapshot`. Keep performance-sensitive canvas drawing out of React render cycles.

### Game mechanics

- Grid is 20×20. Difficulties set base tick intervals: chill 160 ms, classic 118 ms, arcade 88 ms. Each level subtracts 6 ms from the interval (floor 54 ms).
- Level advances every 120 score points. Obstacles (capped at 18) appear starting at level 3.
- Power-ups: `slow` (+48 ms per tick), `doubleScore` (2× score multiplier), `shield` (absorbs one collision). Power-ups spawn every fourth food pickup.
- `GameStatus` flow: `"menu"` → `"running"` ↔ `"paused"` → `"gameover"` → `"menu"`.
