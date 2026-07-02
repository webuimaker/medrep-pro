# MedRep Pro — Deployment Guide

This folder is a complete, ready-to-deploy package: the app + a free,
git-based CMS (Decap CMS) so you can add/edit doctors and products without
touching code.

## What's in here

```
index.html            → the app itself (open this to run it)
content-loader.js      → fetches content/*.json at runtime and feeds the app
content/
  doctors.json          → all doctors (edit via /admin or directly)
  products.json          → all products, already linked to real images
  categories.json         → the 3 catalogue tabs (Ortho / General / Eye)
images/uploads/         → the 33 real product images, extracted and named
admin/
  index.html             → Decap CMS admin panel (loads at yoursite.com/admin)
  config.yml               → defines what fields show up in the CMS
netlify.toml            → hosting config (no build step needed)
```

## Step 1 — Push to GitHub

```bash
cd cms
git init
git add .
git commit -m "Initial MedRep Pro deployment"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

(If you already have a GitHub repo for this, just copy these files into it
and push instead.)

## Step 2 — Deploy on Netlify (free tier)

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
2. Connect your GitHub account and pick this repo
3. Build settings: leave **Build command** empty and **Publish directory** as `.` (this is a static site — no build step)
4. Click **Deploy**

## Step 3 — Turn on the CMS login (Identity + Git Gateway)

This is what lets you log into `/admin` and have your edits committed to GitHub automatically.

1. In your Netlify site dashboard → **Site configuration → Identity → Enable Identity**
2. Under Identity settings → **Registration**, set to "Invite only" (so random people can't sign up)
3. Under Identity → **Services**, enable **Git Gateway**
4. Go to **Identity** tab (top nav) → **Invite users** → invite yourself by email
5. Check your email, accept the invite, set a password

## Step 4 — Point your subdomain at Netlify

1. In Netlify → **Domain management → Add a domain** → enter `medrep.webuimaker.com`
2. Netlify will show you a CNAME target (something like `your-site-name.netlify.app`)
3. In your DNS provider (wherever `webuimaker.com` is managed), add:
   ```
   CNAME   medrep   your-site-name.netlify.app
   ```
4. Wait a few minutes for DNS to propagate — Netlify auto-issues a free SSL certificate once it verifies

## Step 5 — Start editing content

Visit `https://medrep.webuimaker.com/admin`, log in, and you'll see three
collections: **Doctors**, **Products**, **Catalogue Categories**. Every save
commits straight to your GitHub repo and the live site updates within a
minute or two.

To add a new product with a photo: open **Products → Product List**, click
**Add**, fill in the fields, and use the image field to upload — it goes into
`images/uploads/` in your repo automatically.

## Everything here is free

- **Decap CMS** — open source, no license cost
- **Netlify** — free tier covers Identity, Git Gateway, hosting, and SSL for a project this size
- **GitHub** — free for public or free-tier private repos

## Notes

- No build tool, bundler, or `node_modules` needed — this is intentionally
  plain HTML/CSS/JS so any one on your team can read and edit it.
- `content-loader.js` is the only "glue" file — it turns the three JSON
  files into the exact shape the app already expects. You shouldn't need to
  touch it unless you change the JSON structure.
