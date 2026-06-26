# Chess Online (P2P)

A browser-based multiplayer/vs-bot chess app. Pure static front-end: vanilla JS ES modules loaded directly by the browser via an import map in `index.html` (no bundler, no transpile step). Firebase (Auth + Firestore) is used for accounts and as the WebRTC signaling channel; Stockfish is fetched from a CDN and run in a Web Worker.

## Cursor Cloud specific instructions

### Running the app
- There is **no install, build, lint, or test tooling** — no `package.json`, no lockfile, no bundler, no tests. Do not look for `npm`/`pnpm` scripts.
- The only "service" is a static HTTP server serving the repo root. It MUST be served over HTTP, not opened via `file://`, or the ES module import map breaks.
  - Run: `python3 -m http.server 8000` from `/workspace`, then open `http://localhost:8000/`.
- There is no hot reload/watcher; refresh the browser manually after edits.

### External dependencies (need internet)
- Firebase project (`chess-online-p2p`) is hardcoded in `src/firebase/Config.js`; no `.env` needed. Auth and Firestore require outbound access to `*.googleapis.com` / `*.firebaseapp.com`. The app gates entry behind a login/register screen.
- Stockfish (bot moves / coach arrows) is fetched from jsDelivr CDN at runtime; it degrades gracefully to random-ish moves if the fetch fails.
- Online 1v1 uses WebRTC + Google STUN (`stun:stun.l.google.com:19302`); only needed for the "online" mode.

### Gotchas
- Auth register form field order is `Username`, then `Email`, then `Password` (the first text field is the username, not the email).
- Bot games ignore the color picker: `startGame()` in `src/main.js` forces `config.side = "random"`, so you may be assigned either color regardless of selection. This is existing behavior, not a bug to fix during setup.
