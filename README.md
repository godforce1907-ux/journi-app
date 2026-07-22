# Journi

A calm, single-promise-at-a-time behavioural change app built around self-trust rather than productivity. This is the exact application as it exists today, packaged to run as a standalone Vite + React project outside the Claude.ai artifact environment it was originally built in.

## What's in this repo

```
journi/
├── index.html
├── package.json
├── vite.config.js
├── .gitignore
├── src/
│   ├── main.jsx        # entry point — installs the storage shim, then renders <App />
│   ├── App.jsx          # the complete app, copied over unmodified
│   └── storageShim.js   # see "Important: the storage shim" below
```

`src/App.jsx` is the exact file exported from the project — nothing in it was changed to make this export work. It has exactly two dependencies: `react` and `lucide-react`. No Tailwind, no other UI libraries.

## Setup

```bash
npm install
npm run dev
```

Then open the URL Vite prints (typically `http://localhost:5173`).

To build a production bundle:

```bash
npm run build
npm run preview
```

## Important: the storage shim

The app persists everything — the user's account, their Promise Roadmap, their Self-Trust evidence timeline, their commitment ceremony record, all of it — through a `window.storage` API (`get`/`set`/`delete`/`list`). That API is provided natively by the Claude.ai artifact runtime the app was built in; it does not exist in a plain browser.

`src/storageShim.js` polyfills the exact same interface using `localStorage`, so `App.jsx` runs completely unmodified. Every single storage call in `App.jsx` was already written defensively (wrapped in try/catch, resolving to safe defaults on failure), which is precisely what makes this drop-in replacement work without touching the app's code at all.

**What this means in practice:**
- Data persists per browser, per device. It does **not** sync across devices, and there is no real multi-user backend behind it.
- If you clear your browser's site data, all Promise history, Self-Trust evidence, and the Commitment Record are gone — there's no server copy.
- This is fine for local development and demoing, but it is not production-ready persistence. Before any real user-facing deployment, replace `storageShim.js` with a real backend (a small API backed by a real database is the natural next step — the shim's four-method interface is intentionally minimal so swapping it out doesn't require touching `App.jsx`).

See the project's own `Known Limitations` document (tracked outside this repo, from the original design process) for the complete list of intentionally deferred capabilities — static AI coaching, no scheduled notifications, no adaptive weekly roadmap, and others — none of which are bugs, all of which were conscious trade-offs for this stage.

## Deploying

Any static host works, since this builds to plain static files:

```bash
npm run build
```

This produces a `dist/` folder you can deploy to Vercel, Netlify, GitHub Pages, or any static file host. Note that wherever you deploy it, the storage shim above still only persists to each visitor's own browser — that limitation travels with the build, not just local dev.

## Pushing this to GitHub

From inside this project folder:

```bash
git init
git add .
git commit -m "Initial commit: Journi"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

(Create the empty repository on GitHub first — either at github.com/new, or via the GitHub CLI: `gh repo create <your-repo-name> --private --source=. --remote=origin`.)
