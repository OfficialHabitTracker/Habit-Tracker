# Habit Tracker

## Development

1. Configure `Server/.env` with the MySQL connection, `JWT_SECRET`, and email settings used for signup verification.
2. Start the API from `Server` with `npm run dev`.
3. Start the client from `Client` with `npm run dev`.
4. Open the Vite URL, then sign in. Direct links such as `/today`, `/tomorrow`, `/week`, and `/history` work and return to the requested page after sign-in.

The Vite server proxies `/api` requests to `http://localhost:5000`, so login cookies and page requests use the same browser origin.

## Production

Run `npm start` from `Server`. Its `prestart` script builds `Client`, and Express serves the built client and API from the same origin. Direct page URLs such as `http://localhost:5000/today` are handled by the client router.

The database must already contain the app's `users`, `habits`, `tomorrow_habits`, and `daily_logs` tables. Apply `Server/migrations/001_week_tracking.sql` once to add the daily habit snapshot and weekly notes tables.
