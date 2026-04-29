# SEAN LABS — Portfolio

Production-ready personal portfolio built with vanilla HTML/CSS/JS, deployed via **Cloudflare Pages** with automated push-to-deploy.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5 · CSS3 · Vanilla JS |
| Hosting | Cloudflare Pages |
| Contact Backend | Cloudflare Worker + Resend |
| Fonts | Google Fonts (Bebas Neue, IBM Plex) |

---

## Project Structure

```
/
├── index.html          # Main portfolio page (single-file)
├── worker.js           # Cloudflare Worker — contact form handler
├── _headers            # Cloudflare Pages security headers
├── _redirects          # URL redirects (SPA fallback)
└── README.md
```

---

## Local Development

```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/portfolio.git
cd portfolio

# Serve locally (Python, no install needed)
python3 -m http.server 3000
# Open http://localhost:3000

# Or use VS Code Live Server extension
```

The contact form auto-detects `localhost` and shows a dev-mode success message without hitting the Worker.

---

## Deploy to Cloudflare Pages

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "feat: initial portfolio"
git remote add origin https://github.com/YOUR_USERNAME/portfolio.git
git push -u origin main
```

### 2. Connect to Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**
2. Click **Create application → Pages → Connect to Git**
3. Select your `portfolio` repository
4. Set build settings:
   - **Framework preset**: None
   - **Build command**: *(leave blank)*
   - **Build output directory**: `/` (or leave blank)
5. Click **Save and Deploy**

Your site is live at `https://portfolio-xxx.pages.dev` within ~30 seconds.

### 3. Custom Domain (Optional)

In your Pages project → **Custom domains** → Add your domain (e.g. `alexrivera.dev`). Cloudflare auto-provisions SSL.

---

## Contact Form Worker Setup

### Deploy the Worker

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login
wrangler login

# Deploy worker
wrangler deploy worker.js --name portfolio-contact
```

### Set Environment Variables

```bash
wrangler secret put RESEND_API_KEY    # your Resend.com API key
wrangler secret put TO_EMAIL          # your email (e.g. alex@example.com)
wrangler secret put FROM_EMAIL        # verified sender (e.g. noreply@alexrivera.dev)
wrangler secret put ALLOWED_ORIGIN    # your Pages URL (e.g. https://alexrivera.dev)
```

### Wire it to Your Portfolio

In `index.html`, find this line:
```js
const WORKER_ENDPOINT = '/api/contact';
```

Replace with your Worker URL:
```js
const WORKER_ENDPOINT = 'https://portfolio-contact.YOUR_SUBDOMAIN.workers.dev/';
```

Or add a **Pages Function** route so `/api/contact` proxies to the Worker automatically (zero CORS config needed).

---

## Lighthouse Targets

| Category | Target | Tips |
|---|---|---|
| Performance | 90+ | All assets inline, no render-blocking JS, Google Fonts use `display=swap` |
| Accessibility | 90+ | ARIA labels on all nav/form, semantic HTML5, focus-visible styles |
| Best Practices | 90+ | HTTPS-only, security headers via `_headers` |
| SEO | 90+ | Meta description, semantic headings, no orphan links |

---

## Customizing Content

All content is in `index.html`. Search for these comments to find each section:

- `<!-- ─── HERO ─── -->` → Your name, hook, stats
- `<!-- ─── PROJECTS ─── -->` → Add/remove `<article class="project-item">` blocks
- `<!-- ─── RESUME ─── -->` → Skills + experience
- `<!-- ─── CONTACT ─── -->` → Social links

---

## License

MIT — fork freely, remove attribution, make it yours.
