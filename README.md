# Translation Tool

Repo for the translation tool at [translate.hellyer.kiwi](https://translate.hellyer.kiwi).

Plain PHP, HTML and CSS, with the browser code written in TypeScript under
`src/`. `build.sh` compiles it to native ES modules in `public/js/`, which the
templates load with `<script type="module">`. There is no runtime JavaScript
dependency and no bundler: `tsc` produces the files the browser runs.

The page calls the AI API over AJAX as you type:

```
POST {api}/v1/translations
{ "from": "English", "to": "German", "text": "...", "tone": "formal" }
-> { "translation": "..." }
```

`from` / `to` are the API's English language names (the UI works in two-letter
codes and maps them via `apiName()` in `src/translator/languages.ts`), and
`tone` is the writing style, omitted when none is chosen.

The API base URL comes from `data-api-base` on the translator card. The front
controller (`public/index.php`) fills it from the `TRANSLATE_API_BASE`
environment variable, defaulting to the production API. So production needs no
configuration, and a dev host sets `TRANSLATE_API_BASE=https://ai.hellyer.test`
(in the vhost, or before `php -S`) without touching code.

## Building

The TypeScript lives in `src/`; the compiled modules are written to
`public/js/`, which is gitignored build output.

```
./build.sh              # install TypeScript if needed, then compile
./build.sh --check      # type-check only, no output
./build.sh --no-install # use an existing tsc/npx, install nothing
```

The script finds a compiler in this order: `$TSC`, `./node_modules/.bin/tsc`,
`tsc` on `PATH`, then `npx`. Locally it runs `npm ci` when the compiler is
missing, so a fresh clone only needs Node.js and npm:

```
npm install       # or let ./build.sh do it
./build.sh
```

`./build.sh --no-install` is what `deploy.sh` runs on the server: it needs
Node.js and either a global `tsc` or `npx`, but does not install anything.

The TypeScript is split by responsibility (`ui/`, `translator/`, `error/`).
Dependencies are passed through constructors and wired together in
`src/translator/app.ts`; the graph is small enough that a dependency-injection
container would only add runtime weight.

## Running locally

Build the modules, then serve `public/` with PHP:

```
./build.sh
cd public && php -S 127.0.0.1:8099 index.php
```

The dev API at `https://ai.hellyer.test` uses a **self-signed certificate** and
sends **no CORS headers**. Neither can be worked around in JavaScript: the
browser refuses the TLS handshake, and it blocks the cross-origin response
before the app ever sees it. So for the AJAX call to work locally you need
both:

1. **A browser that accepts the certificate.** Start Chromium/Chrome with:

   ```
   chromium --ignore-certificate-errors
   ```

   (or accept the certificate warning for `https://ai.hellyer.test` once).

2. **CORS headers on the API.** The API must answer the preflight and the
   POST with, at minimum:

   ```
   Access-Control-Allow-Origin: https://translate.hellyer.test
   Access-Control-Allow-Methods: POST, OPTIONS
   Access-Control-Allow-Headers: Content-Type
   ```

   This belongs on the API (Laravel CORS config or the nginx vhost for
   `ai.hellyer.test`), not in this repo. The local API does not send these
   yet, so the app shows "Could not reach the translation service" until it
   does — the browser console will name the CORS failure explicitly.

In production both are already satisfied: `ai.hellyer.kiwi` has a valid
certificate and (should) allow `https://translate.hellyer.kiwi` as an origin.

## Deploying

```
./deploy.sh
```

`deploy.sh` rsyncs the tree and runs the post-deploy steps. It excludes
`public/js/` from the upload and runs `./build.sh --no-install` on the server,
so the served modules are always compiled from the source that was just
deployed. A failed build aborts the deploy before the smoke test.

The script ends by checking that every compiled module is served, that the home
page loads `/js/main.js`, and that the served `main.js` matches the file the
server built. A stale deploy is caught there rather than discovered in the
browser console.

## Tests

```
./build.sh
node .verify.cjs      # UI suite (stubs the API)
node .e2e-api.cjs     # AJAX translation path, against a stubbed API
node .e2e.cjs         # AJAX translation path, against the live dev API
```

These need the site served on `http://127.0.0.1:8099` (for example
`cd public && php -S 127.0.0.1:8099 index.php`) and Playwright's Chromium.

Work in progress.
