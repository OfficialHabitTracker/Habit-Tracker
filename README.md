# Habit Tracker

## Development

1. Configure `Server/.env` with the MySQL connection, `JWT_SECRET`, and email settings used for signup verification.
2. Start the API from `Server` with `npm run dev`.
3. Start the client from `Client` with `npm run dev`.
4. Open the Vite URL, then sign in. Direct links such as `/today`, `/tomorrow`, `/week`, and `/history` work and return to the requested page after sign-in.

The Vite server proxies `/api` requests to `http://localhost:5000`, so login cookies and page requests use the same browser origin.

## Production

Run `npm start` from `Server`. Its `prestart` script builds `Client`, and Express serves the built client and API from the same origin. Direct page URLs such as `http://localhost:5000/today` are handled by the client router.

For a full Vercel deployment, set the Vercel project's Root Directory to the repository root. The root `vercel.json` builds the Vite client and installs the Express server dependencies; root `server.js` exports the API as a Vercel Express function. The route rewrites send app URLs such as `/login` to the Vite entry page so React Router can render them.

Add `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `JWT_SECRET` to the Vercel project's Environment Variables. `DB_HOST` must point to a MySQL server reachable from Vercel; `localhost` refers to the Vercel function itself, not your computer. `DB_CONNECTION_LIMIT` is optional and defaults to 5. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` there as well if signup email verification should work. Apply `Server/migrations/001_week_tracking.sql`, `Server/migrations/002_pending_signups.sql`, and the other required table schemas to that cloud database.

If the Vercel project's Root Directory is set to `Client`, only the static frontend is deployed; the Express API in `Server` will not be included.

The database must already contain the app's `users`, `habits`, `tomorrow_habits`, and `daily_logs` tables. Apply `Server/migrations/001_week_tracking.sql` for daily habit snapshots and weekly notes, and `Server/migrations/002_pending_signups.sql` for durable email verification codes.
