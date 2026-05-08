# Repository Guidelines

## Project Structure & Module Organization

This is a Vite React TypeScript arcade Snake game. Runtime code lives in `src/`; static assets live in `public/`.

- `src/App.tsx` - animated React shell, HUD, controls, missions, and overlays.
- `src/gameEngine.ts` - canvas gameplay, tick loop, scoring, power-ups, obstacles, particles, and persistence updates.
- `src/types.ts` and `src/storage.ts` - shared types and localStorage helpers.
- `src/styles.css` - responsive premium arcade UI styling.
- `public/manifest.json` and `public/favicon.svg` - PWA metadata and icon.
- `legacy/` - archived prototypes; do not edit unless specifically requested.

## Build, Test, and Development Commands

```bash
npm install      # Install React, Vite, TypeScript, and Framer Motion
npm start        # Start the local app at http://localhost:3002
npm run dev      # Start the Vite dev server, usually on http://localhost:3002
npm run check    # Run TypeScript validation without emitting files
npm run build    # Type-check and build the static dist/ output
npm run preview  # Preview the production build locally
```

## Coding Style & Naming Conventions

Use TypeScript and React function components. Match the current style: 2-space indentation, double quotes, semicolons, named exports for app modules, and descriptive camelCase identifiers. Keep frame/tick gameplay in `gameEngine.ts`; React should consume snapshots and dispatch actions instead of mutating game arrays directly.

CSS should use role-based class names such as `.game-stage`, `.mission-card`, or `.primary-action`. Keep responsive rules in `src/styles.css`.

## Testing Guidelines

Run `npm run check` and `npm run build` before submitting changes. Manually test keyboard arrows, WASD, swipe controls, on-screen controls, pause/resume, restart, difficulty changes, combo scoring, each power-up, obstacle waves, missions, audio toggle, localStorage persistence, and mobile layout.

## Commit & Pull Request Guidelines

Use concise imperative commit subjects, such as `Add power-up timers` or `Refine mobile board layout`. Keep commits focused.

Pull requests should include a summary, test notes, and screenshots or recordings for visual, animation, or gameplay changes. Mention changes to scoring, persistence keys, deployment config, or controls.

## Deployment Notes

The deploy target is static hosting. Vercel uses `vercel.json`; Netlify uses `netlify.toml`. Both build with `npm run build` and publish `dist/`.
