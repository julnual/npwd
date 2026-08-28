# GitHub Pages — PLOY & NAN

Target: https://julnual.github.io/npwd/

The existing design, photographs, gallery, RSVP and wishes forms are reused.
No Google Forms and no new spreadsheet are needed. The private Sites publication
and its server-side `/api/wedding` route remain unchanged.

## One-time update in the existing Google Apps Script project

1. Open the Google Sheet already collecting responses → Extensions → Apps Script.
2. Back up the current `Code.gs` text. Replace that file's contents with
   [`../apps-script/Code.gs`](../apps-script/Code.gs), then Save.
3. Do **not** press Run or rerun setup. Do not change Script Properties:
   `WEDDING_API_KEY` and `WEDDING_SPREADSHEET_ID` must retain their existing values.
4. Deploy → Manage deployments → select the **existing web app** → Edit (pencil).
5. Version → New version → Deploy. Execute as: **Me**. Who has access: **Anyone**.
   Keep the same `/exec` URL. Do not create a replacement deployment.
6. Open the existing `/exec` URL. Its health response should contain
   `"version":2` and `"ready":true`. It does not return guest records or secrets.

If `ready` is false, check the original Script Properties; do not generate a new
key or new spreadsheet. If existing headers were manually changed, restore the
original header names before submitting. No existing rows are deleted by v2.

## Publish after the receiver update

1. Repository Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. Actions → **Publish wedding to GitHub Pages** → Run workflow → branch **main**.
3. Wait for build and deploy to finish successfully, then open the target URL.
4. Test one RSVP and one wish yourself. Confirm both actual rows in the original
   Sheet, not just the UI message. Also test the original private Site's forms.

The workflow only starts manually. Uploading source alone does not publish it.
It checks the v2 receiver before deployment and never creates a test Sheet row.
If a test entry is created manually, delete that exact test row yourself afterwards.
For later edits, update source and run this workflow again.

## Development and verification

Node.js 22.13 or newer; dependencies are pinned in the root lockfile.

```sh
npm ci
npm run test:pages
npm run build:pages
node github-pages/check-receiver.mjs
```

Upload **only `dist/github-pages/`** to a static host, not the full source tree.
The root `npm run build` still builds the original full-stack Sites application.
The Pages-specific Vite adapter changes only the compiled form transport and
image paths. It fails if expected source patterns change. Asset paths are relative,
so the `/npwd/` repository prefix works without affecting the private Site.

## Security and limitations

- Never put `WEDDING_API_KEY`, real environment files, Sheet exports, or guest
  responses in GitHub or browser code. The `/exec` deployment URL is public.
- Google Sheets sharing settings are unchanged. There is no guest-list read API.
- Submission is intentionally public. Origin allowlisting and signed short-lived
  challenges are **not guest authentication or bot protection**: a determined
  caller can request challenges. There is a global limit of 60 new public writes
  per minute; Apps Script quotas can still be exhausted. Add a verified CAPTCHA
  through a suitable backend if stronger abuse protection becomes necessary.
- Browser transport uses an anonymous hidden Google iframe and native form POST.
  Success requires a matching Google-origin, channel and request-ID acknowledgement
  issued after Sheet write/flush. It never treats an opaque `no-cors` result as success.
- Google may use nested frames, so acknowledgements validate origin and random
  correlation IDs rather than equating the outer iframe with `event.source`.
- A timeout can occur after a real write. Retry unchanged data in the same page:
  the original form reuses its request ID, and v2 deduplicates it. Reloading the page
  starts a new request ID, so check the Sheet if you are unsure.
- Open the website directly, not inside an unrelated iframe. Privacy extensions
  blocking Google frames may prevent submission; the form will show an error.
- For a custom domain, update `SITE_ORIGIN` in `config.mjs` and the origin allowlist
  in `apps-script/Code.gs`, then redeploy both sides. No key changes are needed.

## Rollback

Use GitHub Actions to deploy the previous known-good source version. If reverting
Apps Script to v1, first stop public Pages submissions; v1 only supports the private
Site's keyed JSON API. Keep the existing deployment URL and Script Properties.

Verification performed during preparation: isolated receiver/transport tests and
production static build. Live cross-origin submission must still be checked after
the owner updates the existing Apps Script deployment.
