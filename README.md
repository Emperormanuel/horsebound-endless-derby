# Horsebound — Endless Derby

A complete browser-based 3D endless horse runner built with Three.js. The original low-poly countryside, animated horse and rider, obstacles, and synthesized sounds are generated locally. No custom backend, runtime CDN, API key, or build service is required.

## Play locally

The committed `dist/` directory is ready to serve. With Node.js installed:

```sh
npm run dev
```

Open http://127.0.0.1:4173. ES modules require HTTP; double-clicking `index.html` using `file://` is not supported by browsers. Any static HTTP host can serve `dist/` directly without installing dependencies.

## Develop

```sh
npm ci
npm run build
npm test
npm run dev
```

Edit `game/`, then rebuild. `tools/build.mjs` copies source and locally vendored Three.js into `dist/`. **Commit `dist/` after every build**: start.ng does not run a build step. Root source intentionally has no `index.html`, so start.ng chooses the built `dist/` folder.

## Controls and rules

| Action | Keyboard | Touch |
| --- | --- | --- |
| Change lane | Left/right arrows or A/D | Swipe left/right or arrow buttons |
| Jump | Space, up arrow, or W; hold for a higher arc | Swipe up, tap course, or hold jump button |
| Duck under overhead bunting | Down arrow or S | Swipe down or down button |
| Pause/resume | P or Escape | Pause/resume buttons |

Your horse runs automatically. Jump striped hurdles, logs, water, and wooden fences. Avoid tall hay stacks. Duck under the overhead bunting rail. Each row leaves at least one open lane; the open route only moves one lane between rows. Difficulty increases gradually through Meadow warm-up, Country canter, and Derby rush. Speed caps at 33 m/s and obstacle intervals retain a safe lower limit.

Score = whole metres + 25 per coin + 100 per cleared obstacle + 150 per perfect jump. A perfect jump crosses a hurdle near the apex. Water can be cleared but does not earn a perfect bonus. Local personal best measures distance; the online board ranks by distance, then coins, hurdles, perfect jumps, and score. Airborne presses do not create double jumps. The input buffer accepts a jump shortly before landing.

## start.ng integration

Implemented against https://start.ng/docs.md, retrieved on 17 October 2026.

- `platform.js` connects to `https://start.ng/connect` only on a `*.start.ng` host. It verifies both message origin and source, matches request IDs, and uses timeouts.
- `startng:whoami` / `startng:user` supplies the signed-in character or the platform's approved `guest` appearance. The rider maps body, all documented hair/hat/accessory choices, and clothing/skin/hair colours. Unknown values receive conservative defaults. Local/offline preview uses a neutral fallback rider because the connect frame only answers published start.ng games.
- Player details refresh on focus and visibility changes. The game pauses when hidden or unfocused.
- Sign-in uses the official return-to URL. There is no custom login.
- `startng:score` sends exactly the five integer stats declared in `startng.json`; only signed-in runs are submitted. Failures are displayed accurately. Local best remains available if submission fails.
- `startng:leaderboard` retrieves the best runs, including for guests. Rows are built with `textContent`; the current player is highlighted.

## Verification

`npm test` exercises procedural fairness over 10,000 rows, smoothing and lane bounds, both jump arcs, no double jump, collisions, perfect bonuses, ducking, coins, resets, speed limits, and bounded object counts during a long run.

With the local server running, `npm run test:browser` uses installed Microsoft Edge through Playwright. It checks menu/help, keyboard lane movement and jump, pause/resume, coin collection, hurdle scoring, ducking, collision/game over, restart, local guest messages, leaderboard fallback, mobile buttons and actual touch swipes, layout overflow, and browser errors. It captures QA screenshots in ignored `test-results/` and renders a dedicated 1600 × 1000 jumping scene to `game/cover.png` and `dist/cover.png`.

The optional `?test` deterministic inspection hook is enabled only on localhost or 127.0.0.1. `?cover` renders the original artwork composition without menu UI.

Signed-in live authentication and score persistence require publication and a real user session, so local tests do not establish those outcomes. Mobile input is browser-emulated; physical phone frame rates are not certified. Rendering uses instanced/recycled scenery, pooled obstacles/coins, shared geometry/materials, capped pixel density, and automatic reduction to pixel ratio 1 with shadows off after sustained slow frames.

## Publishing

Push this repository publicly as `horsebound-endless-derby`, including `dist/`. Use:

```json
{ "repo_url": "https://github.com/Emperormanuel/horsebound-endless-derby", "name": "horsebound-endless-derby", "branch": "main" }
```

POST this JSON to `https://api.start.ng/games/check`. Resolve every error and review warnings. Only after a passing check, POST the same JSON to `https://api.start.ng/games/publish`. For a first publication, open the returned `approve_url`, sign in to start.ng, and approve. A 202 response means pending approval, **not live**. Subsequent pushes update an approved game automatically.

## Assets and licensing

All models, UI artwork, cover composition, and audio are original to this project. Three.js is MIT-licensed; its notice is included in `dist/vendor/three-LICENSE.txt`. No third-party image, font, music, or character assets are downloaded during play.
