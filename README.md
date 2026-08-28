# PLOY & NAN — In Full Bloom

Wedding website source for Ploy and Nan · 22 November 2026.

## Current status

This repository contains the source and photographs copied from the existing Sites website. RSVP and wishes remain connected to Google Sheets through the existing server-side `/api/wedding` handler. The owner has successfully tested both forms on the existing website.

**This is a full-stack source repository, not a GitHub Pages static export.** Uploading it does not move the working backend to GitHub Pages. Do not enable Pages expecting the forms to work: Pages cannot execute the server handler or hold its runtime secrets. No replacement Google Forms are needed.

The existing Sites publication and its access settings have not been changed by this source upload.

## Development

- Node.js >=22.13.0
- Linux with GNU timeout, curl and flock
- Install: `npm run install:ci`
- Development: `npm run dev`
- Production build: `npm run build`

The site uses React, Vinext and a Cloudflare-compatible Worker. Application code is in `app/`; photos are in `public/images/`; the server-side Google Sheets adapter is in `lib/wedding-responses.ts`.

## Secrets and responses

Set `WEDDING_SHEETS_URL` and `WEDDING_API_KEY` only in the hosting runtime. `.env.example` intentionally contains no values. Never add a real `.env` file, a private connection key, guest responses or a spreadsheet export to this public repository. Never put the API key in browser code or a static build.

## Remaining GitHub Pages migration work

To serve the website at `https://julnual.github.io/npwd/`, a static frontend export with `/npwd/`-compatible asset paths and an approved public backend is required. The current Sites publication is owner-only, so its protected endpoint cannot be used as a public guest backend without a separate access decision. The existing Apps Script and Google Sheet can be retained.
