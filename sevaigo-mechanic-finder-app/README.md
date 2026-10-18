# SevaiGo

A mobile-first, installable roadside mechanic finder built with Next.js App Router, Leaflet/OpenStreetMap, PostgreSQL, and Drizzle ORM.

## Run locally

1. Set `DATABASE_URL` in `.env` to a PostgreSQL database.
2. Install dependencies with `npm install`.
3. Apply the schema with `npx drizzle-kit push`.
4. Run `npm run dev`.

The first visit seeds eight clearly labeled **sample** Chennai workshops to make the finder explorable. They are demonstration listings with demonstration contact numbers. Real owner-submitted listings remain hidden until approved.

## Admin setup

Set `SEVAIGO_ADMIN_EMAIL` and `SEVAIGO_ADMIN_PASSWORD` (at least eight characters) in the server environment **before the first visit**. SevaiGo creates an admin account for that email if it does not exist. Sign in with those credentials to open **Approvals** in the sidebar. Do not place credentials in client-side `NEXT_PUBLIC_*` variables.

## Features

- GPS emergency search within 5 km, interactive map, vehicle/service filters, availability and rating sorting, direct call, Google Maps directions, and WhatsApp/SMS sharing.
- Email/password accounts with secure hashed passwords and HTTP-only sessions; guest emergency use needs no account.
- Saved shops, vehicles, breakdown history, reviews, in-app notifications, owner registration and live availability/pricing updates, and admin approval.
- English/Tamil interface, light/dark theme, and a last-known-list fallback if a refresh fails offline.

Map tiles come from OpenStreetMap and directions open Google Maps. SMS OTP, Google OAuth, background push through FCM, and payments require provider credentials and are not configured in this standalone build. Admin/application notifications are available in-app.
