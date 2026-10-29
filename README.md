# Jadaun Legal — 3D website

A multi-page redesign for the Jadaun Legal practice (formerly the Wix site at
`princekumar997742.wixsite.com/jadaun-associates`). Dark editorial layout,
brass accents and a live WebGL hero composed of brass rings, a colonnade and a
glass obelisk.

The site has three pages: home (`index.html`), careers (`careers.html`) and the
website disclaimer (`disclaimer.html`).

## Run it locally

The page uses ES modules, so open it over HTTP rather than `file://`:

```powershell
cd "C:\Users\acer\OneDrive\Desktop\Jadaun-legal"
python -m http.server 4173
```

Then open <http://localhost:4173>.

## Publish (Vercel)

The site is plain static HTML with no build step. Vercel serves it directly and,
unlike GitHub Pages on a free account, it can deploy from a **private** repo.

### One-time setup

1. Sign in at [vercel.com](https://vercel.com) with the GitHub account that owns
   the repo (`akumr1083`).
2. Choose **Add New → Project**, then **Import Git Repository**. If the repo is
   not listed, open **GitHub → Settings → Applications → Vercel** and grant
   access to `Jadaun-legal`.
3. Leave the defaults:
   - **Framework preset:** Other
   - **Root directory:** `./`
   - **Build command:** empty
   - **Output directory:** empty (Vercel serves the repo root)
4. Click **Deploy**. The first deployment takes a few seconds.

The site goes live at `https://jadaun-legal.vercel.app` (the exact name depends
on availability; Vercel shows it after deployment).

### After that

Every push to `main` triggers a new production deployment. Pull requests get
their own preview URLs. To use a custom domain, open **Project → Settings →
Domains**, add the domain and point its DNS at Vercel.

### Notes

- `.nojekyll` is harmless on Vercel; it is only needed for GitHub Pages.
- No `vercel.json` is required. The relative asset paths work as-is.
- For a drag-and-drop deploy, `vercel.com/new` also accepts a folder — but the
  Git import gives you automatic redeploys.

### Alternative hosts

GitHub Pages works too, but needs a **public** repo on the free plan (Settings →
Pages → Deploy from a branch → `main` / root). Netlify and Cloudflare Pages can
also serve the folder with no build step.

## Files

```
index.html              home page: markup, content, metadata, JSON-LD
careers.html            careers page: tracks, criteria, application steps
disclaimer.html         website terms and Bar Council disclaimer
assets/css/style.css    design system, layout, responsive rules
assets/js/scene.js      Three.js hero (three r170 via CDN import map)
assets/js/app.js        nav, reveals, tilt, cursor, form, scroll progress
assets/img/             portraits, firm image and brand mark (from the Wix site)
favicon                 assets/img/favicon.png (256×256 emblem on near-black)
```

Images in `assets/img/`:

| File | Size | Used for |
| --- | --- | --- |
| `founder-abhay.jpg` | 1000×1250 | founder plate + team card 01 |
| `taijas-arya.jpg` | 900×1125 | team card 02 |
| `anjali.jpg` | 900×1125 | team card 03 |
| `prince-kumar.jpg` | 900×1125 | team card 04 |
| `akshay-kumar.jpg` | 900×1125 | team card 05 |
| `firm-about.jpg` | 1600×1200 | spare — reserved for the About band |
| `logo-jadaun.webp` | 1024×1024 | original Wix logo (source) |
| `logo-mark.png` | 256×204 | emblem only (scales + JL) — nav, loader, footer |
| `favicon.png` | 256×256 | browser tab icon |

## Design notes

- **Palette** — near-black `#07080A`, warm ink `#ECE8E0`, brass `#C6A15B` /
  `#E4C68A`. The only saturated colour is the brass, which keeps the 3D scene
  reading as metal rather than decoration.
- **Type** — Cormorant Garamond for display (light weight, tight leading), Inter
  for body and small caps labels. Labels are 10–11px with wide tracking.
- **3D** — one renderer inside the hero, paused when the hero scrolls out of view
  or the tab is hidden. Device pixel ratio is capped (1.8 desktop / 1.5 mobile),
  bloom and geometry counts drop on small screens, and the whole scene degrades
  to the CSS gradient if WebGL is unavailable. `prefers-reduced-motion` renders a
  single still frame.
- **Interaction** — scroll reveals, pointer-driven card tilt with a brass glow,
  magnetic buttons, a subtle custom cursor on fine-pointer devices, and a scroll
  progress hairline.
- **Brand** — the Wix emblem was cropped from the original 1024² WebP to a
  transparent 256×204 mark and sits in the nav, the intro loader and above the
  footer wordmark, with a matching 256×256 favicon. Each instance is a plain
  `<img>` with intrinsic dimensions, so it scales crisply and never shifts layout.
- **Accessibility** — skip link, visible focus rings, labelled form fields,
  `aria-expanded` on the menu button, reduced-motion support and a print
  stylesheet.
- **Team** — five cards (two advocates, three legal assistants), each with a
  LinkedIn button over the portrait and a labelled link target; the same profiles
  are listed in the `employee` schema.
- **Subpages** — careers and disclaimer reuse the home page's nav, footer and
  design tokens. They share `style.css` and `app.js`; only the home page loads
  `scene.js`, so the 3D hero does not run behind text-heavy pages.

## Things to swap before publishing

1. **Contact form — access key** — the form already posts to Web3Forms, but
   `index.html` still contains the placeholder `YOUR-WEB3FORMS-ACCESS-KEY`. Until
   a real key is pasted in, the form falls back to opening the visitor's mail
   client. See *Bookings and notifications* below.
2. **Portraits** — the founder plate and the five team cards already use the
   practice's own images. To swap one, replace the file in `assets/img/` with the
   same aspect ratio (4:5 for portraits) and keep the `width`/`height`
   attributes in `index.html` in sync. Faces sit high in frame; adjust
   `object-position` on `.plate__img` / `.person__photo img` if a crop is off.
3. **Domain / canonical** — add a canonical URL and absolute `og:image` once the
   site has a domain.
4. **Legal pages** — `disclaimer.html` already covers the Bar Council of India
   no-solicitation rule, the absence of an advocate–client relationship, no
   guarantee of results and governing law. Have the firm review the wording, and
   add a privacy note before collecting personal data through the form.

## Bookings and notifications

Two different things are often called "booking": an enquiry form, and a real
appointment slot. The site currently has the first; the second is easier to bolt
on than to build.

### 1. Where form submissions go

The form posts to **Web3Forms** (`assets/js/app.js`, `ENDPOINT`), which forwards
each submission to one or more email inboxes. Setup, about five minutes:

1. Go to `web3forms.com`, enter `advabhaysingh07@gmail.com`, and copy the access
   key they email you.
2. In `index.html`, replace `YOUR-WEB3FORMS-ACCESS-KEY` with that key.
3. Redeploy. Submit a test enquiry while logged into the inbox — it arrives
   within seconds and Web3Forms shows the sender's IP and spam score.

Until the key is filled in, the form gracefully falls back to `mailto:`.

Alternatives if you prefer:

| Service | Notes |
| --- | --- |
| **Formspree** | `action="https://formspree.io/f/xxxx"`; email + dashboard, free tier limited. |
| **Netlify Forms** | Only if hosting on Netlify; add `data-netlify="true"` and a hidden field. Zero JS. |
| **Google Forms / Apps Script** | Free, unlimited-ish, entries land in a Sheet; more setup. |
| **Your own backend** | Node/Supabase + Resend; full control, needs maintenance. |

### 2. How you actually get notified

Email alone is easy to miss. Recommended stack:

- **Email notification** — Web3Forms/Formspree send to your inbox immediately.
  Add a Gmail filter with a distinct label and a custom notification sound so it
  is not buried.
- **Phone push** — Gmail mobile app already pushes. For something louder, create
  a free Telegram bot (`@BotFather`), then use a Zapier/Make automation
  "new form submission → Telegram message". Telegram notifications bypass email
  filters and are near-instant.
- **WhatsApp** — Zapier/Make can post to a WhatsApp number; or use CallMeBot's
  free API from a Google Apps Script trigger.
- **Record keeping** — Web3Forms can forward submissions to a Google Sheet, which
  doubles as a simple consultation log and CRM.

### 3. Real appointment slots (recommended for "Book a consultation")

For actual booked consultations, use a scheduler instead of a form: it handles
time zones, availability, confirmations, reminders and rescheduling, and it
stops double-booking.

- **Cal.com** — free/open-source, India-friendly, calendar sync (Google/Outlook),
  email + SMS reminders, embeddable.
- **Calendly** — simplest, free tier, very familiar to clients.
- **Google Calendar appointment schedule** — no extra account, sends invites.

Typical implementation: keep the enquiry form for matters that need triage, and
make the hero "Book a consultation" button open `cal.com/your-handle/consult`
(or an embedded widget). You then receive the standard calendar notification
plus the booking confirmation email on every reservation.

Whatever you choose, add a consent line for personal data (name, phone, email)
before going live — required under India's DPDP Act, and the Bar Council's
advertising rules also apply to how a practice presents itself online.

## Performance

- No build step. The home page makes two CDN requests (`three` and the Google
  Fonts stylesheet); the subpages only load the fonts.
- `three` is imported as a module, so the page still renders and remains usable
  if the CDN is blocked — only the 3D layer is lost.
- Images: five photos + emblem, all resized and compressed locally (85–332 KB
  each, ~750 KB total). Below-the-fold images use `loading="lazy"`; the founder
  plate and portraits are 4:5 crops so the browser reserves space and nothing
  shifts while loading.
