# Habit Tracker

## Development

1. Configure `Server/.env` with the MySQL connection, `JWT_SECRET`, and email settings used for signup verification.
2. Start the API from `Server` with `npm run dev`.
3. Start the client from `Client` with `npm run dev`.
4. Open the Vite URL, then sign in. Direct links such as `/today`, `/tomorrow`, `/week`, and `/history` work and return to the requested page after sign-in.

The Vite server proxies `/api` requests to `http://localhost:5000`, so login cookies and page requests use the same browser origin.

## Production

Run `npm start` from `Server`. Its `prestart` script builds `Client`, and Express serves the built client and API from the same origin. Direct page URLs such as `http://localhost:5000/today` are handled by the client router.

Deploy the frontend and API as two Vercel projects from this repository. Set the Client project's Root Directory to `Client` and the Server project's Root Directory to `Server`; each directory has its own `vercel.json`. The Client project builds the Vite app to `Client/dist` and rewrites browser routes such as `/login` to the app entry page. The Server project deploys the Express API as a Vercel function and includes its SQL migrations.

Set `VITE_API_URL` in the Client project's Environment Variables to the Server project's plain HTTPS origin (no Markdown link formatting or `/api` suffix). For the current deployment use `https://habit-tracker-server-roan.vercel.app`. In the Server project, set `CLIENT_ORIGIN` to `https://habit-tracker-seven-ebon.vercel.app`. Multiple allowed origins can be comma-separated. The API uses credentialed CORS and secure cross-site cookies on Vercel.

In the Server project's Environment Variables, add `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME=Habit_Tracker`, and `JWT_SECRET`. `DB_HOST` and `DB_PORT` must match the remote MySQL provider; `localhost` refers to the Vercel function itself, not your computer. `PORT` is only for running Express locally; Vercel manages the web port for the deployed function, so do not open or forward your computer's port. The first API request automatically creates the configured database if needed and applies the additive SQL migrations under `Server/migrations`; the Aiven user therefore needs permission to create a database and tables. You can also run `npm --prefix Server run db:migrate` manually. The remote database must allow connections from Vercel in its provider's public access and network rules. For Aiven, set `DB_SSL=true` and `DB_SSL_CA` to the project CA certificate to verify and encrypt the database connection. `DB_CONNECTION_LIMIT` is optional and defaults to 5.

Email verification also needs SMTP settings in the **Server Vercel project's** Environment Variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`. Vercel cannot read `Server/.env` from your computer. For Gmail, use `smtp.gmail.com`, port `587`, `SMTP_SECURE=false`, your Gmail address for `SMTP_USER` and `SMTP_FROM`, and a Google App Password for `SMTP_PASS` (Google requires 2-Step Verification for App Passwords; see [Google's instructions](https://support.google.com/accounts/answer/185833)). After saving the variables, redeploy the Server project. Never commit real SMTP passwords to GitHub.

Create two Vercel projects from the same repository: set one Root Directory to `Client` and the other to `Server`. Keep each project on its matching directory so Vercel reads that directory's `vercel.json`.

The database must already contain the app's `users`, `habits`, `tomorrow_habits`, and `daily_logs` tables. Apply `Server/migrations/001_week_tracking.sql` for daily habit snapshots and weekly notes, and `Server/migrations/002_pending_signups.sql` for durable email verification codes.
