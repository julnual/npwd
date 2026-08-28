# PLOY & NAN — In Full Bloom

Wedding website · 22 November 2026 · โรงแรมเกียรตินคร จ.นครศรีธรรมราช

## GitHub Pages migration

The static frontend and existing-Google-Sheets receiver update are prepared.
**The owner must update the existing Apps Script deployment before publishing.**
This repository upload alone does not mean the GitHub Pages site is live.

- Target: https://julnual.github.io/npwd/
- [Setup and publishing instructions](github-pages/README.md)
- [Apps Script v2 — replace the existing Code.gs](apps-script/Code.gs)
- [Manual publishing workflow](.github/workflows/github-pages.yml)

The original layout, photographs, gallery, RSVP and wishes forms are reused.
No replacement Google Forms or spreadsheet is required. The private original
Sites publication and its access settings remain unchanged.

## Commands

Node.js >=22.13.0. Install dependencies with `npm ci`.

| Target | Build | Tests |
| --- | --- | --- |
| GitHub Pages static site | `npm run build:pages` | `npm run test:pages` |
| Original full-stack Sites app | `npm run build` | `npm test` |

The Pages artifact is `dist/github-pages/`. It uses relative asset paths and a
Google Apps Script acknowledgement bridge; it does not use the private server's
`/api/wedding` endpoint. The original server handler is preserved for Sites.

## Privacy and secrets

Never commit real `.env` files, `WEDDING_API_KEY`, private connection keys, guest
responses or Sheet exports to this public repository. Keep the original key and
spreadsheet ID in Apps Script's existing Script Properties. The new public
submission flow validates input and limits write rate, but is not bot-proof or
guest authentication. Google Sheets sharing remains unchanged and no guest-list
read endpoint is provided. See the setup guide for limitations and rollback.
