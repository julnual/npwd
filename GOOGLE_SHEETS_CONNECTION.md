# Google Sheets connection

Guest data is saved only to the owner's bound Apps Script spreadsheet, not browser storage.
The public UI never receives WEDDING_API_KEY. Only the server POST handler attaches it.

Runtime settings: WEDDING_SHEETS_URL (the /exec URL) and WEDDING_API_KEY (secret).
The key must match Script Properties > WEDDING_API_KEY in the owner's Apps Script.
The script generates headers with setupWeddingSheets; its doPost receiver must be deployed.
Changing Script Properties does not require a new code deployment.

Submission contract: type rsvp or wish, UUID requestId, name. RSVP uses attendance yes/no,
guestCount (1–20 for yes, 0 for no), optional note (500 characters). Wishes use message
(2,000 characters). Names are limited to 100 characters. Match the receiver's v1 contract.
On retries the UI reuses the request ID for unchanged fields. The receiver deduplicates
by ID under a script lock and escapes formula prefixes before writing a row.
The UI reports success only for an acknowledged matching request ID, never HTTP status alone.

Connection status at implementation: URL supplied; awaiting owner's key pairing and
a real submission check. No real guest record has been written by the implementation tests.

Keep the site owner-only until its owner explicitly approves guest access. Before making
it public, review spam/rate-limit protections. Origin checking is a CSRF check, not authentication.
Do not publish guest lists, wishes, or secrets in the page or expose a Sheets read endpoint.
