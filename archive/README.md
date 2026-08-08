# Archive — static prototype

Retired dual-theme HTML dashboard (formerly root `index.html` / `legacy-dashboard.html`).

**Not the live app.** Daily care lives in `apps/web` + `apps/api`.

## Why it remains

Browser `localStorage` keys (`c_*`, `a_*`, `a_tail`) from the prototype may still hold history. This page exists so you can:

1. Open [`legacy-dashboard.html`](./legacy-dashboard.html) in a browser (same origin that logged the data, if possible).
2. Click **Export for app**.
3. Import the JSON in Care → **Settings → Migrate from static page**.

## Do not

- Treat this as the production UI
- Deploy it as the public site
- Keep logging here after migration (new entries stay in this browser only)
