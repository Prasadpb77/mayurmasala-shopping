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
