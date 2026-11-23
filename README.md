# Feminine Movement

The client app for Yuval's heels dance classes in Beer Sheva. Expo (React Native) + Supabase.

## Run it on your phone
1. On this repo's GitHub page: **Code → Codespaces → Create codespace on main**.
2. In the terminal at the bottom, type `bash setup.sh` and press Enter (first time takes a few minutes).
3. Scan the QR code with the iPhone camera. The app opens in **Expo Go**.

Next time: open the same codespace, type `npx expo start --tunnel`.

## What's where
- `app/` – the screens (login, onboarding, home, schedule, journey, profile, shop, about, admin)
- `src/` – theme, Supabase client, shared UI, texts to finalise (`texts.ts`), the 400 daily messages
- `supabase/` – database schema and rules (already applied to the live project)

## Admin
Yuval's account gets admin rights in the database (`profiles.is_admin`). Admin can add Tuesday classes,
change class size, see who's coming, cancel a class, load a class card after payment, and upload journey videos.

## Website (docs/)
The client website lives in `docs/` and is served by GitHub Pages at
https://yuvraha5.github.io/feminine-movement/ — plain HTML/CSS/JS, no build step.
Settings to edit at the top of `docs/app.js`: WhatsApp number, studio address.
Subscriptions: `supabase/003_subscriptions.sql` (monthly renewal runs nightly via pg_cron).
