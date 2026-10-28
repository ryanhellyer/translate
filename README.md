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

```
./build.sh          # type-check, compile and bundle to public/scripts.js
./build.sh --check  # type-check only
```

Work in progress.
