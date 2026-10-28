# Habit Tracker

## Development

1. Configure `Server/.env` with the MySQL connection, `JWT_SECRET`, and email settings used for signup verification.
2. Start the API from `Server` with `npm run dev`.
3. Start the client from `Client` with `npm run dev`.
4. Open the Vite URL, then sign in. Direct links such as `/today`, `/tomorrow`, `/week`, and `/history` work and return to the requested page after sign-in.

The Vite server proxies `/api` requests to `http://localhost:5000`, so login cookies and page requests use the same browser origin.

## Production

Run `npm start` from `Server`. Its `prestart` script builds `Client`, and Express serves the built client and API from the same origin. Direct page URLs such as `http://localhost:5000/today` are handled by the client router.

For a Vercel frontend deployment, the root `vercel.json` builds `Client` when the Vercel project root is this repository. If the Vercel project root is set to `Client`, `Client/vercel.json` supplies the client-side route rewrites. Both configurations send app page URLs such as `/login` to the Vite entry page so React Router can render them.

The Vercel frontend configuration does not deploy the Express API in `Server`. For login, signup, and habit data to work in production, deploy the API separately and route the client's `/api` requests to it, or deploy the Express server with a host that supports this app's production server setup.

The database must already contain the app's `users`, `habits`, `tomorrow_habits`, and `daily_logs` tables. Apply `Server/migrations/001_week_tracking.sql` once to add the daily habit snapshot and weekly notes tables.
