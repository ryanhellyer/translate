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

The card has three modes, chosen with the switch at its top and remembered
between visits:

- **Translate** — the flow above.
- **Analyse** — the visitor's own text, returned with clickable highlights.
  Each highlight explains what went wrong and gives a rule to remember.
- **Rewrite** — the same text, rewritten to sound more natural, with the
  changed phrasing marked and a note on what changed.

The language being analysed or rewritten is chosen with the pill above the
proofreading boxes. It is the translator's target side, so a change carries
over to Translate (and vice versa), and analyses are always explained in the
translator's source language.

Analyse and Rewrite are new, so their endpoints are not live yet. The app
expects:

```
POST {api}/v1/analyses
{ "language": "German", "explanation_language": "English",
  "text": "...", "checks": ["grammar", "spelling", "punctuation", "style"] }
-> {
     "issues": [{
       "start": 34, "end": 46,              // UTF-16 offsets into "text"
       "severity": "correction",            // or "suggestion"
       "category": "Word order",
       "original": "letzte Woche",
       "replacement": "letzte Woche",
       "sentence": "Ich bin nach Berlin gereist letzte Woche.",
       "corrected": "Ich bin letzte Woche nach Berlin gereist.",
       "explanation": "English ends a sentence with a time phrase; ...",
       "tip": "Time before place. Ask wann? before wohin?",
       "examples": [{ "correct": "...", "wrong": "..." }]
     }],
     "corrected_text": "..."              // whole text, for copy/listen
   }

POST {api}/v1/rewrites
{ "language": "German", "text": "...", "style": "formal" }   // optional; formal, informal, simple or kitten
-> {
     "rewrite": "...",
     "changes": [{
       "start": 120, "end": 128,          // UTF-16 offsets into "rewrite"
       "original": "sehr lecker",
       "replacement": "hervorragend",
       "note": "A stronger word choice."
     }]
   }
```

`language` is the language being checked or rewritten (the translator's target
side) and `explanation_language` is the visitor's own language (the source
side), so the default English → German pair means German text with English
notes. Offsets are UTF-16 code units into the exact text sent, which is what
`String.prototype.slice` uses in the browser. `checks` and `style` are
optional; rewrite styles are `formal`, `informal`, `simple` and `kitten`, and
omitting `style` asks for natural phrasing. Every field of an issue apart from
`start`, `end` and `explanation` is optional too;
`src/translator/review-model.ts` validates the answers and drops anything it
cannot place. Both endpoints need the same CORS treatment as
`/v1/translations`.

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

`./build.sh --no-install` uses only a compiler that is already installed, and
does not touch `node_modules/`.

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

`deploy.sh` builds `src/` locally first, then rsyncs the tree (including the
fresh `public/js/`) and runs the post-deploy steps. Building before the upload
means a broken build aborts the deploy before anything is copied, and the host
only needs PHP — no Node.js, no compiler. The compiled modules are shipped, so
the served code always matches the source that was just deployed.

The script ends by checking that every compiled module is served, that the home
page loads `/js/main.js`, and that the served `main.js` matches the file that was
uploaded. A stale deploy is caught there rather than discovered in the browser
console.

## Tests

```
./build.sh
node .verify.cjs      # UI suite (stubs the API)
node .e2e-api.cjs     # AJAX translation path, against a stubbed API
node .e2e-review.cjs  # Analyse and Rewrite, against stubbed proofreading APIs
node .e2e.cjs         # AJAX translation path, against the live dev API
```

These need the site served on `http://127.0.0.1:8099` (for example
`cd public && php -S 127.0.0.1:8099 index.php`) and Playwright's Chromium.

Work in progress.
