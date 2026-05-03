# Snake Game

A polished, deploy-ready Snake game built with HTML5 Canvas and vanilla JavaScript.

## Features

- Responsive layout with a modern arcade-style presentation
- Keyboard, touch, and on-screen controls
- Difficulty modes with adaptive speed
- Local high score persistence in the browser
- Lightweight Node server for local development and deployment
- PWA manifest and favicon assets

## Run locally

```bash
npm start
```

Then open `http://localhost:3000`.

If you are running inside VS Code and `localhost:3000` is already taken by the editor preview, use the port printed in the terminal. By default this project now starts on `http://localhost:3002`.

## Controls

- Arrow keys or WASD to move
- Space to pause or resume
- Enter to start, resume, or restart
- R to reset
- Touch swipe or use the on-screen pad on mobile

## Deployment

This project is ready for Node-based hosts such as Render, Railway, Fly.io, or Heroku-style environments.

- Start command: `npm start`
- Node version: 18 or newer

## Project structure

- `public/` - live app files served by the Node server
- `public/index.html` - game UI and layout
- `public/style.css` - visual design and responsive styling
- `public/script.js` - game logic and rendering
- `public/manifest.json` - app manifest for installable behavior
- `public/favicon.svg` - icon asset
- `legacy/` - archived prototype pages kept out of the deploy path
- `server.js` - lightweight static file server