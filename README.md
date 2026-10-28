# Translation Tool

Repo for the translation tool at [translate.hellyer.kiwi](https://translate.hellyer.kiwi).

The page calls the AI API over AJAX as you type:

```
POST {api}/v1/translations
{ "from": "English", "to": "German", "text": "...", "tone": "formal" }
-> { "translation": "..." }
```

`from` / `to` are the API's English language names (the UI works in two-letter
codes and maps them via `apiName()` in `src/translator/languages.ts`), and
`tone` is the writing style, omitted when none is chosen.

The API base URL lives on the translator card as `data-api-base`
(`templates/home.php`), so the local dev API and production can differ without
a rebuild. It defaults to `https://ai.hellyer.test`.

## Running locally

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

### End-to-end check

`.e2e.cjs` drives the page in headless Chromium, ignoring the certificate and
injecting the CORS headers a correctly configured API would send, so it can
verify the app's own AJAX path independently of the server gap:

```
node .e2e.cjs
```

Set `NO_CORS_SHIM=1` to see the raw browser behaviour instead.

## Building

The browser code lives in `src/` as TypeScript and is compiled into
`public/scripts.js`, which is gitignored build output.

```
./build.sh          # install deps if needed, type-check, compile and bundle
./build.sh --check  # type-check only
```

`build.sh` needs Node.js, npm and a C toolchain (npm's bundled releases use
native modules):

```
sudo apt-get install -y nodejs npm build-essential
```

It also builds `public/vendor.js` once, from `node_modules`, holding tsyringe
and reflect-metadata as plain scripts. Re-run it (`rm public/vendor.js`) after
upgrading those libraries. Both templates load it before `scripts.js`.

### On the server

`build-server.sh` compiles the same `src/` on the web server, where npm is not
used: it needs Node.js and any TypeScript compiler (`tsc` on `PATH`, a
`node_modules/typescript` copy, `$TSC`, or `npx`). `deploy.sh` runs it after
the upload and ships `src/` instead of `scripts.js`, so the served bundle
always matches the deployed source.

### Tests

```
node .verify.cjs          # UI suite (stubs the API)
node .e2e-api.cjs         # AJAX translation path, against a stubbed API
./scripts/verify-bundler.sh
```

The first two need the site served on `http://127.0.0.1:8099` (for example
`cd public && php -S 127.0.0.1:8099 index.php`) and Playwright's Chromium.

Work in progress.
