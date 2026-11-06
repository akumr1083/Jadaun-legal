# Jadaun Legal — advocates website

A multi-page redesign for the Jadaun Legal practice (formerly the Wix site at
`princekumar997742.wixsite.com/jadaun-associates`). Warm ivory editorial layout,
champagne-gold accents and a Supreme Court artwork in the hero, with the
tricolour fluttering as a live canvas overlay.

The site has three pages: home (`index.html`), careers (`careers.html`) and the
website disclaimer (`disclaimer.html`).

## Run it locally

The site is plain static HTML with no build step. Serve it over HTTP so the
relative paths and the consent gate behave exactly as they do in production:

```powershell
cd "C:\Users\AKSHAY\Desktop\Jadaun-legal"
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
their own preview URLs.

### Custom domain

The site is live at **https://www.jadaunlegal.com**, with `jadaunlegal.com`
redirecting to it. The domain is registered at Hostinger and uses Hostinger's
DNS (`byte.dns-parking.com`, `pixel.dns-parking.com`); Vercel serves the site.

Records at Hostinger:

| Type | Name | Value | TTL |
|---|---|---|---|
| `A` | `@` | `216.198.79.1` | 300–3600 |
| `CNAME` | `www` | `8cd0c4bf0be2b1ca.vercel-dns-017.com` | 300–3600 |

Vercel shows the exact values under **Project → Settings → Domains** — use those
if they ever change. Delete any leftover parking records first, and do not keep
the legacy `76.76.21.21` / `cname.vercel-dns.com` pair alongside the current one.

`www` is the primary domain and the apex redirects to it with a 308. To flip
that, change the redirect direction in Vercel and update `canonical`, `og:url`
and `sitemap.xml` to match.

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
careers.html            careers page: roles, criteria, application form
disclaimer.html         website terms and Bar Council disclaimer
assets/css/style.css    design system, layout, responsive rules
assets/js/flag.js       animated tricolour canvas over the hero artwork
assets/js/app.js        nav, reveals, tilt, cursor, enquiry form, progress
assets/js/careers.js    application validation, email fallback, submission
assets/js/careers-config.js  Supabase endpoint + fallback contact email
supabase/schema.sql     application table, RLS and private resume bucket
supabase/functions/submit-application/index.ts  upload, insert, attach CV, notify
assets/img/             portraits, Supreme Court hero and brand mark
favicon                 assets/img/favicon.png (256×256 emblem on warm ivory)
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
| `supreme-court-hero.jpg` | 1325×1187 | hero artwork (building, statue and flag) |
| `logo-jadaun.webp` | 1024×1024 | original Wix logo (source) |
| `logo-mark.png` | 256×204 | emblem only (scales + JL) — nav, loader, footer |
| `favicon.png` | 256×256 | browser tab icon |

## Design notes

- **Palette** — warm ivory `#F5F0E6` and soft beige `#E8DCC8` grounds, light
  cream `#FAF7F0` cards, soft tan `#D8CBB8` hairlines, champagne gold `#B08D57`
  accents and deep espresso `#302820` text. A deeper brass `#7D5D2A` is used for
  small gold labels so they keep AA contrast on the light grounds. Section
  backgrounds alternate ivory and beige to separate the content bands, and the
  footer is a solid espresso block with ivory type.
- **Type** — Cormorant Garamond for display (light weight, tight leading), Inter
  for body and small caps labels. Labels are 10–11px with wide tracking. The
  careers application card adds Playfair Display for its headings only.
- **Hero art** — a single golden-beige illustration of the Supreme Court of India,
  cropped so the dome, the statue and the flag sit on the right of the hero. It is
  already painted in the site palette, so it needs only a light contrast lift and
  the layered ivory gradients that fade it into the page. On desktop it fills the
  right ~62% of the viewport; at 900px and below it becomes a top band with the
  copy underneath.
- **Flag** — `flag.js` cuts the tricolour out of the hero artwork with a polygon
  mask, then redraws it in vertical strips with two travelling sine offsets and
  soft fold shading, so the cloth flutters while the pole, wall and building stay
  still. The animation pauses when the hero leaves the viewport or the tab is
  hidden, and `prefers-reduced-motion` renders one still frame.
- **Interaction** — scroll reveals, pointer-driven card tilt with a soft gold
  glow, magnetic buttons, a subtle custom cursor on fine-pointer devices, and a
  scroll progress hairline. Cream cards lift slightly on hover with a fine tan
  border turning champagne gold; there are no heavy shadows or flashy motion.
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
  design tokens. They share `style.css` and `app.js`; the careers page also loads
  `careers.js` and `careers-config.js`, while only the home page loads `flag.js`,
  so the hero animation never runs behind text-heavy pages.
- **Careers form** — ivory card on the light page ground, rounded 9px fields with
  tan hairlines, champagne focus rings and Playfair Display for the form headings
  (the rest of the site keeps Cormorant Garamond). Fields are grouped into five
  numbered fieldsets, the CV dropzone supports drag-and-drop and replacement, and
  errors appear inline beside the field they belong to.
- **Entry gate** — `index.html` and `careers.html` open with a Bar Council style
  notice. Choosing **I agree** stores `jl-disclaimer-accepted-v1` in
  `localStorage` and removes the gate; **I do not agree** shows a short message.
  The gate traps focus, locks background scrolling and is skipped when storage
  already holds the acceptance. `disclaimer.html` has no gate so the text stays
  reachable. Bump the key's version in both the head script and `app.js` when the
  notice wording changes.

## Things to swap before publishing

1. **Careers backend — optional** — the form currently collects an optional
   resume link and opens a pre-filled email, asking the candidate to attach the
   CV. That needs no backend. If the firm later wants applications stored in a
   database, deploy the Supabase project in `supabase/` and set `submitEndpoint`
   in `assets/js/careers-config.js`. See *Careers application portal* below.
2. **Contact form — access key** — the form already posts to Web3Forms, but
   `index.html` still contains the placeholder `YOUR-WEB3FORMS-ACCESS-KEY`. Until
   a real key is pasted in, the form offers Gmail, Outlook or the visitor's
   default mail app. See *Bookings and notifications* below.
3. **Portraits** — the founder plate and the five team cards already use the
   practice's own images. To swap one, replace the file in `assets/img/` with the
   same aspect ratio (4:5 for portraits) and keep the `width`/`height`
   attributes in `index.html` in sync. Faces sit high in frame; adjust
   `object-position` on `.plate__img` / `.person__photo img` if a crop is off.
4. **Domain / canonical** — done. The site is live at
   `https://www.jadaunlegal.com` with canonical URLs and absolute `og:image`
   metadata. `robots.txt` and `sitemap.xml` are not in this repository yet.
   If the primary domain ever changes, update the `canonical`, `og:url`,
   `twitter:image` and `og:image` tags in all three HTML files.
5. **Legal pages** — `disclaimer.html` already covers the Bar Council of India
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

Until the key is filled in, submitting the form reveals three choices:
**Gmail** and **Outlook** open a pre-filled compose window in a new tab, while
**Default mail app** uses `mailto:` and hands off to whatever the visitor has
configured in their browser or operating system. Nothing is sent until the
visitor presses Send in that app.

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

## Careers application portal

`careers.html` contains the full application form: six positions, personal and
professional details, an optional resume link, the mandatory declaration and the
exact success message requested by the firm. Validation and submission live in
`assets/js/careers.js`.

**Default flow (no backend).** The candidate can paste a shareable link to their
CV (Google Drive, Dropbox, OneDrive or a portfolio page). On submit, the browser
opens a pre-filled email with every field, including the link, and asks the
candidate to attach the CV before sending. Nothing is stored on the site — the
application arrives in `advabhaysingh07@gmail.com`.

**Optional upgrade — Supabase.** The repository also contains a complete
Supabase backend that stores applications and CVs and emails the firm with the
file attached. Deploy it and set `submitEndpoint` in `careers-config.js` to
switch the form from email to online submission. The rest of this section
describes that setup.

```
careers.html
  └─ careers.js  ──POST multipart──▶  Supabase Edge Function
                                      ├─ validate fields + CV signature
                                      ├─ upload CV to private "resumes" bucket
                                      ├─ insert row in job_applications
                                      └─ email the firm via Resend,
                                         with the CV attached
```

The browser sends the real file contents as `multipart/form-data`; the function
reads those bytes once, uploads them to private storage and Base64-encodes the
same bytes for the email attachment. A filename alone is never enough: if the
upload fails, the function returns an error and the application is not stored.

Candidate rows and resumes are never readable with the public anon key. The
function uses the service role on the server, and the dashboard is the only
review surface.

### 1. Create the database and bucket

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).
   It creates `job_applications`, enables RLS with no public policies, and
   creates the private `resumes` bucket (5 MB limit, PDF/DOC/DOCX only).

### 2. Deploy the Edge Function

Install the CLI, sign in and link the project:

```powershell
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
```

Deploy the function and set its secrets:

```powershell
supabase functions deploy submit-application --no-verify-jwt

supabase secrets set `
  RESEND_API_KEY=re_your_key `
  CAREERS_NOTIFY_EMAIL=advabhaysingh07@gmail.com `
  CAREERS_FROM_EMAIL="Jadaun Legal Careers <careers@yourdomain.com>" `
  ALLOWED_ORIGIN=https://jadaunlegal.vercel.app
```

`--no-verify-jwt` is appropriate because the form is public; the function
validates every field, checks the file signature and rate-limits by IP. If you
prefer Supabase's JWT gate, deploy without the flag and paste the project's
**anon** key into `careers-config.js` (never the service-role key).

`RESEND_API_KEY` is optional. Without it, applications are still stored and
reviewable in Supabase; only the email notification is skipped. To send mail,
create a [Resend](https://resend.com) account, verify your domain and use a
sender on that domain. `CAREERS_NOTIFY_EMAIL` is the inbox that receives each
application.

The notification email includes every field the candidate submitted and attaches
the original PDF, DOC or DOCX file (`attachments` in the Resend API, Base64
encoded). The function sends the email only after the storage upload and the
database insert succeed. A Resend `Idempotency-Key` based on the application ID
prevents duplicate notifications. Resend allows 40 MB per email after encoding;
the 5 MB CV cap stays well inside it. If Resend rejects the attachment
(`400`, `413` or `422`), the function retries once without the attachment and
includes a seven-day signed download link instead, so the firm is still notified.

### 3. Connect the page

Edit `assets/js/careers-config.js`:

```js
window.JADAUN_CAREERS = {
  submitEndpoint:
    "https://<your-project-ref>.supabase.co/functions/v1/submit-application",
  supabaseAnonKey: "", // only needed if JWT verification is enabled
  maxResumeMB: 5,
  contactEmail: "advabhaysingh07@gmail.com",
};
```

Commit and redeploy. The “online applications are not connected” notice
disappears as soon as a valid `submitEndpoint` is present.

### 4. Review applications

In the Supabase dashboard:

- **Table Editor → job_applications** — filter by `position` for position-wise
  review, set `status` (`new`, `reviewing`, `shortlisted`, `interview`,
  `rejected`, `hired`) and add private `internal_notes`. CSV export is available
  from the same screen.
- **Storage → resumes** — files are stored under `YYYY/MM/<application-id>-<name>`.
  The bucket is private; use the dashboard download button, the email attachment,
  or the seven-day signed link in the notification email.

Useful SQL:

```sql
select position, count(*) as total
from public.job_applications
group by position
order by total desc;

select full_name, email, mobile, position, created_at, status
from public.job_applications
where position = 'Internship'
order by created_at desc;
```

### 5. What is protected

- **No public database access.** RLS is enabled and anon/authenticated have no
  policies; `anon` and `authenticated` are also revoked on the table.
- **No public files.** The `resumes` bucket is private with no storage policies.
  Only the service role (inside the function) and the authenticated dashboard
  can touch it.
- **Server-side checks.** The function repeats every client validation, checks
  PDF/DOC/DOCX magic bytes, caps the CV at 5 MB and limits each IP to five
  applications per ten minutes.
- **Spam and duplicates.** A hidden honeypot and a per-page `client_token`
  (unique in Postgres) stop bot traffic and accidental double inserts.
- **Private notification attachments.** The CV travels as an email attachment,
  not a public URL. The backup download link is a seven-day signed URL, and the
  bucket itself stays private.
- **No candidate data in the page.** The HTML contains no candidate records,
  keys or resume paths.

### 6. Honest fallback until it is connected

If `submitEndpoint` is empty, the page shows a clear notice and changes the
button to **Continue by email**. The form still validates every field, then
offers a pre-filled `mailto:` with all the answers plus a **Copy application
details** button. Browsers cannot attach a file to a `mailto:` link, so the
candidate must attach the CV in their email app before sending; the page says so
explicitly. The success message is only shown after the Edge Function returns a
real `2xx`; the site never fakes a submission.

### 7. Test the upload and attachment

With the endpoint and `RESEND_API_KEY` configured, submit one application for
each file type and confirm the received email:

1. **PDF** — the attachment opens in a PDF reader and matches the uploaded file.
2. **DOC** — the original Word 97–2003 file arrives unchanged.
3. **DOCX** — the original Word file arrives unchanged.
4. **Over 5 MB** — rejected in the browser before any request; the form is not
   submitted and no email is sent.
5. **Unsupported type** (for example `.exe` renamed to `.pdf`) — rejected by the
   extension check or the PDF/DOC/DOCX signature check on both client and server.

Also check the failure path: temporarily revoke storage access and submit. The
form should show “We couldn't upload your resume to secure storage, so your
application was not submitted”, keep every answer, and send no email.

The attachment payload itself can be verified without sending mail:

```powershell
deno test --allow-env supabase/functions/submit-application/index_test.ts
```

The test Base64-encodes sample PDF, DOC and DOCX bytes, decodes the Resend
payload and checks that it matches the uploaded file exactly, including the
filename, MIME type and idempotency key. It also checks the signed-link fallback
when Resend rejects an attachment.

### 8. Privacy and retention

The declaration records consent to processing for recruitment. Before go-live,
add a privacy note covering who can access applications, how long they are kept
and how a candidate can request deletion (India's DPDP Act applies). Restrict
Supabase dashboard access to the firm, do not forward CVs outside the hiring
process, and delete old applications and their storage objects on a schedule.

## Performance

- No build step. The only third-party request is the Google Fonts stylesheet.
- The hero uses one compressed JPEG (`supreme-court-hero.jpg`, ~375 KB) with
  `fetchpriority="high"`; the flag is drawn on a small canvas from that same
  image, so there is no second image download.
- Images: five photos + emblem, all resized and compressed locally (85–332 KB
  each, ~750 KB total). Below-the-fold images use `loading="lazy"`; the founder
  plate and portraits are 4:5 crops so the browser reserves space and nothing
  shifts while loading.
