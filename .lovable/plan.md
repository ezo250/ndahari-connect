
# Ndahari — Build Plan

A demo platform connecting **Employees** (workers) with **Employers** (clients), moderated by **Admins**. Everything runs as a realistic demo (no real MoMo API — payment confirmations are simulated and admin-approved).

## Tech & Design

- **Stack:** TanStack Start + Lovable Cloud (auth + Postgres + storage for ID/license uploads).
- **Design:** Inspired by the logo — deep royal blue (`#1E3A8A` / navy) + bright accent blue, clean rounded cards, generous whitespace, subtle motion. Light + dark themes. Uploaded logo used in navbar/footer.
- **i18n:** Custom lightweight translation context with EN / FR / RW (Kinyarwanda). Language switcher in navbar, persisted in localStorage.
- **Search:** Working global search filtering employee cards by name, category, location.

## Roles & Auth

- Single sign-up entry, choose **Employee** or **Employer**. Admin accounts seeded (demo admin login provided on the auth page).
- Roles stored in a separate `user_roles` table with `has_role()` security-definer function (never on profiles).
- RLS on every table.

## Employee flow

1. **Sign up:** first name, last name, email, phone, location (with "Use my live location" button via `navigator.geolocation` storing lat/lng), category (Driver, Bartender, Barista, Chef, Houseboy/girl, Motari, Private driver, Barber, Dry cleaner, Car washer, Phone/Computer repair, Mechanic, Tailor, Gardener, Nanny, Security guard, Cleaner, Waiter, Electrician, Plumber), and price fee.
2. **If Driver:** upload driving license (front + back) and national ID (front + back) to Lovable Cloud storage, pick license category A–F.
3. **Post-signup modal:** shows MoMo code `*182*8*1*332991*<amount>#` with registration fee (fetched from admin settings), two buttons:
   - **"I'll pay later (Dormant)"** → account created but `status = dormant`, hidden from public listings, can browse jobs but can't apply.
   - **"I've paid"** → shows admin contact number modal to confirm; sets `status = pending_activation` until admin approves.
4. **Employee dashboard:** profile picture upload, edit profile, change password, theme toggle, message admin (inbox thread), subscription status & renewal countdown, **"Activate / Renew account"** button re-opens the payment modal. Browse & apply to jobs (requires active status; upload resume + cover letter per job).

## Employer (Client) flow

1. **Sign up:** first name, last name, email, phone, password + confirm.
2. **Find workers:** pick a category + enter location (or use live location). A **beautiful animated map-like view** shows nearby employee cards with a **ping/pulse animation** on the closest ones (sorted by Haversine distance). Cards show name, category, location, price fee, avatar — **phone number hidden**.
3. Click **"Reserve"** → payment modal with client fee & MoMo code → "I've paid" → creates a `reservation` for admin review.
4. **Employer dashboard:** my reservations with status (pending / confirmed / in-service / completed), post custom job listings, message admin.

## Admin flow

Admin panel with tabs:
- **Dashboard:** stats (users, active employees, reservations, revenue simulated).
- **Users:** list all, filter by role/status, activate / deactivate / delete, view uploaded documents.
- **Reservations:** see who reserved whom, mark payment confirmed → **"Pair & mark In-Service"** → reveals employee phone to that employer only + marks employee as in-service.
- **Applications:** review job applications, accept/reject.
- **Jobs:** create jobs, choose **Public** (visible to active employees) or **Private** (admin-only note), define required documents (resume / cover letter toggles).
- **Settings:** registration fee, client fee, subscription duration (days), admin contact phone, MoMo code prefix.
- **Messages:** inbox from users.

## Data model (Lovable Cloud)

```
profiles(id, first_name, last_name, email, phone, avatar_url, language, theme)
user_roles(user_id, role)                       -- enum: admin | employee | employer
employee_profiles(user_id, category, location_text, lat, lng, price_fee,
                  status, subscription_expires_at, license_category,
                  id_front_url, id_back_url, license_front_url, license_back_url)
jobs(id, admin_id, title, description, category, is_public,
     requires_resume, requires_cover_letter, created_at)
applications(id, job_id, employee_id, resume_url, cover_letter_url, status)
reservations(id, employer_id, employee_id, status, payment_confirmed, created_at)
messages(id, from_user, to_admin_bool, body, created_at)
settings(key, value)                            -- singleton row for fees/durations
payments(id, user_id, purpose, amount, momo_code, confirmed, created_at)
```

Every table gets `GRANT`s + RLS policies (employees see own docs, employers see own reservations & don't see employee phones until pairing, admins see all via `has_role`).

## Routes

```text
/                       Landing (hero, categories, featured active employees)
/auth                   Login / Signup (role picker)
/browse                 Public listing of active employees (search + filters)
/employee/dashboard     (gated)
/employer/dashboard     (gated) — includes animated "Find nearby" view
/admin                  (gated, admin role)
```

## Creative extras (added polish)

- **Ping animation** on nearest employee cards on the employer map view.
- **Category chips** with emoji icons on landing.
- **Live subscription countdown** with color-coded urgency.
- **Toast notifications** for all admin actions.
- **Dark mode** with proper design tokens.
- **Skeleton loaders** on lists.
- **Testimonial-style featured worker section** on landing.

## Demo seed

Migration seeds: 1 admin (`admin@ndahari.rw`), ~10 employees across categories with lat/lng around Kigali, 2 employers, a couple of jobs, default settings (registration 2000 RWF, client fee 1000 RWF, subscription 30 days, admin phone `+250 788 000 000`, MoMo code `*182*8*1*332991`).

## Out of scope for the demo

- Real MoMo integration (simulated + admin-approved).
- Real SMS/email (in-app messaging only).
- Native mobile app.

---

Approve and I'll implement in one pass: enable Lovable Cloud → migrations + seed → i18n + design system → auth + role routing → employee/employer/admin dashboards → landing & browse with search → animated nearby view.
