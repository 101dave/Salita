# The static Salita workspace

`index.html` in the repository root is a single-file build of the Salita workspace, made for
static hosting such as GitHub Pages. It has no server, no database, and no accounts: everything
lives in the visitor's browser.

## Build it

```bash
npm install
npm run build:static   # writes index.html and .nojekyll
npm run test:static    # boots the built page in a DOM and drives the main flows
```

`scripts/build-static.ts` bundles `static/app.ts` with esbuild, inlines the stylesheet from
`src/app/globals.css`, and inlines `public/icon.svg` as a favicon data URI. Nothing is fetched at
runtime except the optional DM Sans web font, so the page works from a project page
(`username.github.io/Salita/`), a user page, or the local file system — every reference is inline
or relative.

## What it reuses from the app

The static build imports the real modules rather than copying them, so the words stay in sync:

- `src/lib/languages.ts` — the 28 languages, the curated phrase library, aliases, and usage notes
- `src/lib/lessons.ts` — beginner vocabulary and the reviewed cross-language bridge phrases
- `src/lib/translation.ts` — provider text cleaning, plausibility checks, token protection, and
  MyMemory match selection
- `src/lib/client.ts` — the streak calculation

## Translation order

1. The same language selected twice returns your text unchanged.
2. Your saved wording for that phrase (an explicit correction beats the shared library).
3. The curated phrase library, including multi-sentence composition. Unknown wording is never guessed.
4. The reviewed beginner vocabulary.
5. A live provider: your LibreTranslate instance if you configured one under Settings, then
   MyMemory, then Google's public endpoint. Results are labelled as machine translation.

Offline, steps 1–4 keep working; step 5 fails with a friendly message.

## Data

Phrases, collections, lesson progress, and profile details are stored in `localStorage` under
`salita.workspace.v1` (provider settings under `salita.prefs.v1`). The first visit seeds the same
starter workspace the server app seeds for a new account. Settings can export that workspace as
JSON, import it again, or reset to the starter data.

## Publishing to GitHub Pages

`.github/workflows/pages.yml` rebuilds and publishes the page on pushes to `main`. One-time setup:
repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
