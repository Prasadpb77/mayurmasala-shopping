# Mayur Masala and Pooja Center — Website + Admin Dashboard

A full ordering website for a masala & pooja samagri shop: product catalog, cart,
COD checkout with anti-spam validation, live order tracking, and an admin
dashboard (Supabase Auth) to manage products, orders, and site content
(banner / about / footer). Order status updates are sent to customers via
free WhatsApp "click to chat" links — no WhatsApp Business API needed.

## Stack
- **Frontend & backend routes:** Next.js 14 (App Router) + TypeScript + Tailwind CSS — deploy on **Vercel**
- **Database, Auth, Storage:** **Supabase**
- **Admin login:** Supabase Auth (email/password)
- **Images & bill PDFs:** Supabase Storage buckets

---

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** → paste the entire contents of `supabase/schema.sql` → **Run**.
   This creates the `products`, `orders`, `site_settings` tables, RLS policies,
   the order-number generator, and two storage buckets (`product-images`, `bills`).
3. Go to **Authentication → Users** → **Add user** → create yourself an admin
   login (email + password). This is the only account that can access `/admin`.
   (There's no public sign-up — you add admin accounts manually, which is the
   right approach for a single-shop dashboard.)
4. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` public key

## 1.5 Add the service role key (required after the security hardening below)

Go to **Project Settings → API → service_role key**, copy it, and add it as
`SUPABASE_SERVICE_ROLE_KEY` in your `.env.local` / Vercel environment
variables. This is a **secret** key — never prefix it with `NEXT_PUBLIC_`,
never commit it, never expose it to the browser. It's used only inside
`app/api/orders/[id]/route.ts`, the single narrow server route that lets the
tracking/pay pages look up one order by its unguessable UUID, since the
`orders` table intentionally has no public read access at all (see the
security note below).

## 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SHOP_WHATSAPP=91XXXXXXXXXX      # shop's WhatsApp number, digits only, country code first
NEXT_PUBLIC_SHOP_NAME=Mayur Masala and Pooja Center
NEXT_PUBLIC_SHOP_ADDRESS=...
NEXT_PUBLIC_SHOP_PHONE=+91 XXXXX XXXXX
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app   # no trailing slash
```

`NEXT_PUBLIC_SITE_URL` is used to build the tracking links that go out on
WhatsApp, so set it to your real deployed URL once you have one (you can use
`http://localhost:3000` while developing).

## 3. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` for the shop, `http://localhost:3000/admin/login`
for the dashboard.

## 4. Add your logo, products, and content

- **Logo:** currently a 🪔 emoji placeholder in `components/Header.tsx`. Drop
  your logo file into `/public/logo.png` and swap the emoji span for an
  `<Image src="/logo.png" .../>` — I can wire this in once you send the file.
- **Products:** add them from `/admin/products` (name, photo, price,
  description, category). No code changes needed.
- **Banner / About / Footer:** edit live from `/admin/settings`.
- **Phone / address / WhatsApp number:** set via the environment variables above.

## 5. Deploy to Vercel

1. Push this project to a GitHub repo.
2. Import the repo in [vercel.com](https://vercel.com/new).
3. Add the same environment variables from `.env.local` in Vercel's
   **Project Settings → Environment Variables**.
4. Deploy. Update `NEXT_PUBLIC_SITE_URL` to the final Vercel URL (or your
   custom domain) and redeploy so tracking links are correct.

---

## How each requested feature works

**Cart & checkout (COD only)**
Cart is client-side (localStorage) via `components/CartContext.tsx`. Checkout
form (`app/checkout/page.tsx`) collects name, phone (WhatsApp preferred),
and address.

**Anti-spam validation** (`lib/validation.ts`)
- Name: letters only, 3–60 chars (blocks link/number spam).
- Phone: must be a real 10-digit Indian mobile number (6-9 start), with or
  without `+91`.
- Address: 10–300 chars, blocks pasted URLs.
- Hidden **honeypot field** on the checkout form — invisible to humans,
  frequently auto-filled by bots, so any submission with it filled is silently
  rejected.
- Validation runs both in the browser and again in `app/api/orders/route.ts`
  server-side, so it can't be bypassed by editing the page.

**Order tracking**
On submit, an order row is created with a random UUID and the customer is
redirected to `/track/[order-id]` — that URL is their permanent tracking link
(share it again any time; it also works if they bookmark it). The page polls
every 15s so status changes reflect without a manual refresh.

**Admin dashboard** (`/admin`, protected by Supabase Auth via `AdminGuard`)
- **Orders tab:** filter by status, move an order through
  Received → Processing → Out for Delivery → Delivered via a dropdown, mark
  **Payment Received** independently at any point (works before or at
  delivery, since it's COD), and upload the **delivery bill as a PDF** — the
  upload button appears once an order reaches "Out for Delivery" (or once a
  bill already exists, so it can be replaced). The PDF goes to the `bills`
  storage bucket and its public link is saved on the order and shown on the
  customer's tracking page.
- **Send WhatsApp Update button:** opens `https://wa.me/<phone>?text=...`
  (the free click-to-chat feature — no WhatsApp Business API/Twilio needed).
  The message is generated live from the order's *current* status and item
  list, so whatever stage the order is in when you click it is what gets sent.
- **Products tab:** add/edit/delete items with name, photo (uploaded to the
  `product-images` bucket), price, description, category, and a
  show/hide toggle.
- **Site Settings tab:** edit the top marketing banner (with on/off toggle),
  the "Our Story" about section, and footer tagline/hours — all saved to the
  `site_settings` table and reflected on the live site within ~30 seconds
  (the homepage revalidates every 30s).

**Instagram Reels (hero section)**
Manage from `/admin/settings` → paste up to 3 reel links (open the reel on
Instagram → Share → Copy Link). These replace the hero graphic on the
homepage using Instagram's **official embed script** (`instagram.com/embed.js`)
— no scraping, so views/likes stay live and it's fully compliant. Leave all
three blank to show the default diya/chili graphic instead. If you've already
run the original schema, run `supabase/migrations/003_instagram_reels.sql`
once to add this setting.

**Google Reviews (5-star)**
Google doesn't provide a free public feed of a business's reviews, and pulling
them programmatically needs a paid Google Places API key — so this is built
as a **curated testimonials section** instead: go to `/admin/reviews`, copy a
5-star review's text and reviewer name from your actual Google Business
listing, and paste it in. It appears on the homepage (above the footer) in a
card with a Google "G" mark and star rating. Only reviews marked **5 stars**
and **"Show on website"** appear publicly — you can hide or delete any time.
Two buttons sit above the cards:
- **"See All Reviews"** → links straight to your real Google Maps listing
- **"Write a Review"** → links to Google's write-a-review page for your listing

Both links come from `NEXT_PUBLIC_GOOGLE_MAPS_URL` and
`NEXT_PUBLIC_GOOGLE_WRITE_REVIEW_URL` in your env vars (already pre-filled
with your listing's details in `.env.example` — double check the "Write a
Review" link opens the right listing once deployed, since it's built from the
place's internal ID and Google occasionally changes this URL format).

If you'd rather not manually copy reviews, run the migration in
`supabase/migrations/002_reviews.sql` and just leave the reviews table empty —
the section simply won't render, and the two Google buttons can be added
directly in the About section instead if you prefer.

**Structured delivery address + PIN code auto-fill**
Checkout now collects Address Line 1, Address Line 2 (optional), PIN code,
City, and State separately instead of one free-text box. Typing a 6-digit PIN
code automatically looks up the city via India Post's free public API
(`api.postalpincode.in`, no key needed) and fills in City + State — State
defaults to "Maharashtra" and both remain editable if the lookup is wrong or
the PIN isn't found. If you already ran the original schema, run
`supabase/migrations/004_structured_address.sql` once to add the new columns
(old orders keep displaying fine via their original combined address).

**Product image zoom / lightbox**
Clicking any product photo (on the homepage) opens a full-size zoomed popup
— tap the backdrop or the × to close. A small 🔍 icon appears on hover as a
visual cue. Built with `components/LightboxContext.tsx`, wired in globally via
the root layout so it's available anywhere product images are shown.

**Bill generation & printing — no payment data baked into bills**
Bills (PDF, browser print, and RawBT print) **never contain a UPI QR code or
payment link** — a generated/printed file is something that could in
principle be swapped or regenerated, so nothing about where money should go
lives inside it. UPI payment prompts live only in the WhatsApp "Out for
Delivery" message (see below), built fresh each time from the locked,
SQL-only-editable setting — never from anything baked into a file.

All generation happens **server-side** now, in API routes the browser can
only trigger by order id, never by supplying its own data:
- **"Generate Bill"** → `POST /api/admin/bill` (requires a valid admin
  session) — builds the 58mm PDF server-side, uploads it to the `bills`
  bucket, saves the link on the order. That link then shows up automatically
  on the customer's tracking page and in the WhatsApp status update.
- **"Print Bill (Browser)"** → `POST /api/admin/receipt` (requires a valid
  admin session) — builds a print-ready 58mm HTML receipt server-side and
  opens it in a new window with the browser's print dialog.
- **"Print via RawBT"** → `GET /api/print-bill?id=<order-id>` — a public,
  id-keyed endpoint (same trust model as order tracking: the id is an
  unguessable UUID, no listing/scraping possible) that returns the receipt as
  a JSON "rows" payload, in the same format used by the companion
  [mayurmasala-bllling](https://github.com/Prasadpb77/mayurmasala-bllling)
  billing app. Tapping this button opens a `rawbt:` link, which the
  [RawBT Android app](https://www.rawbt.com/) intercepts, fetches, and sends
  straight to a connected ESC/POS thermal printer.
- **"Upload Custom Bill (PDF)"** — the manual upload option is still there
  in case you ever want to attach a different PDF instead of the
  auto-generated one.

**Order management safeguards**
- **Delete Order** — every order card in `/admin` has a "Delete Order" button
  that asks "Are you sure?" with the order number and customer name before
  removing it permanently. Requires the new delete RLS policy — run
  `supabase/migrations/005_return_status_and_delete.sql` once if your project
  already existed.
- **Confirmation when reverting a delivered order** — if an order is already
  "Delivered" and you change its status back to anything else, a confirm
  dialog appears first ("...are you sure you want to move it back to...")
  to prevent accidental clicks from undoing a completed delivery.
- **New status: Return / Not Delivered** — for orders that come back or
  couldn't be delivered. Selectable from the same status dropdown as any
  other stage. It's an exception state, so it's excluded from the customer's
  normal 4-step tracking timeline — instead, the tracking page shows a clear
  "this order was returned / could not be delivered, please contact the shop"
  banner. The same migration file above adds this status to the database.

**Security hardening: orders table locked down**
A review found the original setup allowed the anon key (visible in any
website's JS — not a secret) to read every order via the Supabase REST API
directly, bypassing the app's "look up one order by id" intention. Fixed:
- **No public SELECT on `orders` at all.** The tracking page (`/track/[id]`)
  and pay page (`/pay/[id]`) now fetch a single order through a server API
  route (`app/api/orders/[id]/route.ts`) using the service role key — the
  anon key can no longer list or scrape customer orders under any
  circumstances, even by calling the Supabase API directly from outside
  the app.
- **Forged inserts blocked at the database level.** A trigger recomputes
  `total` from the submitted items and force-resets `status`,
  `payment_received`, and `bill_url` to safe defaults on every insert —
  so a forged "already delivered, already paid, wrong total" order can't
  be created however the insert request is made, not just through the
  checkout form.
- **`bill_url` constrained to your own storage bucket.** Even a compromised
  admin session can't repoint a bill link at an external phishing/QR page —
  the database rejects any URL that isn't under your Supabase Storage
  `bills` bucket.

If you already ran the original schema, run
`supabase/migrations/008_lock_down_orders.sql` once, **and** add the
`SUPABASE_SERVICE_ROLE_KEY` environment variable described in step 1.5 above
— the tracking/pay pages will stop working without it.

**UPI payments (WhatsApp pay link only) — set via SQL, read-only in dashboard**
Your UPI ID is deliberately **not editable from the admin dashboard** — it's
shown there as read-only for reference only. This means even if the site's
admin login is ever compromised, no one can silently redirect where customer
payments go through the website UI. You set/change it by running one SQL
statement directly in your Supabase project's **SQL Editor** (which runs as
the project owner and bypasses this restriction):

```sql
update site_settings
set value = '{"vpa": "yourshop@okbank", "payee_name": "Your Shop Name"}'
where key = 'upi';
```

Once set, the **WhatsApp update sent for "Out for Delivery"** includes a
"Pay via UPI" link. It points to `/pay/[order-id]` on your own site —
WhatsApp only makes `https://` links tappable, not `upi://` links directly,
so this page auto-opens the customer's UPI app on their phone, and shows a
QR + amount as a fallback if that doesn't fire (e.g. on desktop). This QR is
generated fresh on that page from the real, locked settings — it is never
baked into any bill/PDF/print file (see above).
- The pay link **automatically disappears once you mark an order's payment
  as Received** — no point showing a payment prompt for a paid order.
- This is a plain UPI deep link, not a payment gateway — money goes straight
  to your bank account, no fees, but there's no automatic confirmation. You
  still tap **Payment Received** manually once you see it land, same as
  before.
- Use a **bank-handle VPA** (e.g. `shopname@okaxis`) rather than a
  phone-number-linked one — the VPA is publicly readable (by design, so the
  pay page can render the QR without login), and a phone-linked VPA would
  expose that number.

If you already ran the original schema, run these two migrations once, in
order: `supabase/migrations/006_upi_payments.sql` (adds the setting) then
`supabase/migrations/007_upi_readonly.sql` (locks dashboard writes to it).

**1992 heritage story**
Default "Our Story" copy in the schema (`site_settings.about`) is written
around the shop being Pimpri's oldest and most trusted masala & pooja store
since 1992 — edit the wording any time from `/admin/settings` once you share
more specific history/details.

---

## What I still need from you
- Shop logo file (png/svg, ideally transparent background)
- Exact shop address & phone number for the footer/about section
- Any specific milestones/anecdotes from the shop's history for "Our Story"
- Your Supabase project URL + anon key, and the admin email/password you created

Once I have these, I can wire the logo in and tighten the About copy —
everything else is already live and functional.
