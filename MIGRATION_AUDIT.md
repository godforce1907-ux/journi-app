# JOURNI — Runtime Migration Audit
### Claude Artifact → Standard React/Vite Project

Every Claude-specific API, global, import, build assumption, and environment dependency in `App.jsx` was inspected directly (grep + manual trace), not assumed clean from prior work. This covers the full file — no new features, no redesigns.

---

## Checklist

| # | Item | Status | Detail |
|---|---|---|---|
| 1 | `window.storage` (get/set/delete/list) | ✅ Already migrated | 12 call sites, all `get`/`set`/`delete` with `shared=false` — `list()` is never actually called. Replaced with `src/storageShim.js`, a `localStorage`-backed polyfill matching the exact same signatures. `App.jsx` required zero changes because every call was already wrapped in try/catch. |
| 2 | `postMessage` / parent-frame communication | ✅ N/A — never used | Full-file scan found zero references. Nothing to migrate. |
| 3 | `sendPrompt` / Visualizer-specific globals | ✅ N/A — never used | Not referenced anywhere. This app never used the Visualizer or any inter-tool messaging. |
| 4 | References to `claude.ai`, `anthropic`, or "artifact" | ✅ N/A — never used | Zero matches across the entire file. |
| 5 | External npm dependencies | ✅ Already migrated | Exactly two: `react` and `lucide-react`. Both in `package.json` at compatible versions. No Tailwind (confirmed zero `className` usage in the whole file — 100% inline styles), no other UI libraries despite several being available in the artifact environment (recharts, d3, mathjs, etc. were never actually imported). |
| 6 | Network calls (`fetch`, `XMLHttpRequest`) | ✅ N/A — never used | Zero network calls in the app itself. The only external network dependency is Google Fonts (#7 below), not a Claude dependency. |
| 7 | Google Fonts `@import` | ✅ Already portable | Standard `@import url(...)` inside a `<style>` tag pointing at `fonts.googleapis.com`. This is ordinary web behavior, not artifact-specific — it made the identical external request inside the artifact too. Needs outbound internet access to load correctly in any environment, same as before. |
| 8 | `process.env` / `import.meta.env` / environment variables | ✅ N/A — never used | Zero references. No hidden environment-variable assumptions anywhere. |
| 9 | `crypto.randomUUID()` / secure-context APIs | ✅ N/A — never used | Event IDs are generated with `Date.now() + Math.random()`, which works identically on plain `http://localhost` — no HTTPS/secure-context requirement introduced. |
| 10 | JSX / build transform assumptions | ✅ Already migrated | Standard JSX only — no custom pragma, no `React.createElement` calls to account for. Compiles cleanly under Vite's default `@vitejs/plugin-react` (verified via a full TypeScript syntax parse of the file, zero errors). |
| 11 | React version / rendering model | ✅ Already migrated | `package.json` pins React 18, matching what the app was built against. Root render updated to `ReactDOM.createRoot` (React 18 API). |
| 12 | React 18 `<StrictMode>` double-invocation | ⚠️ Needs manual work (resolved at scaffold level, not in `App.jsx`) | See "Findings requiring judgment" below — this is the one genuine environment-behavior mismatch found. |
| 13 | localStorage quota vs. the artifact's stated storage limits | ⚠️ Needs manual work (awareness, not urgent) | See below. |
| 14 | Simulated phone-frame viewport (390×780 fixed layout) | ✅ Already portable | Pure CSS/layout, renders identically in any browser. Not an artifact assumption — it's a deliberate design choice to simulate a mobile screen, unrelated to migration. |
| 15 | Authentication (OTP / Google / Apple sign-in) | ❌ Cannot be migrated automatically | Already fully simulated/mocked *inside* `App.jsx` itself — there was never a real Claude or third-party auth dependency to remove. Nothing to migrate here; a real identity provider is a backend decision, out of scope for "before connecting a backend." |
| 16 | Push notifications | ❌ Cannot be migrated automatically | Never implemented — the app only ever showed static notification *previews*. There is no Claude-specific notification API being removed; this is a feature that doesn't exist yet, not a migration gap. |

---

## Findings requiring judgment (not just search-and-replace)

### `<React.StrictMode>` and one non-idempotent effect

Vite's default scaffold wraps the app in `<React.StrictMode>`, which intentionally double-invokes effects on mount in development (not production) to help surface bugs. The Claude.ai artifact runtime this app was built and tested in does not do this.

Tracing all 21 `useEffect` blocks in `App.jsx`: 10 already use a `cancelled`-flag pattern (safe), and two Stuck Flow effects that log evidence on a dependency change (`blocker`, `feeling`) are safe in practice because those dependencies are `null` at mount and only become truthy later, outside StrictMode's mount-time double-invoke window. Two others (`PROMISE_RESCHEDULED` on shrink, and the breathing-reset completion) already use a `useRef` guard, which is StrictMode-safe by design.

**One effect is not protected:** the Stuck Flow's mount-time `STUCK_FLOW_ENTERED` logging (`useEffect(() => { onEvidence(...) }, [])` — an unguarded, dependency-free effect. Under StrictMode's dev double-invoke, this would log two `STUCK_FLOW_ENTERED` events every time someone enters the Stuck Flow, in development only.

**Resolution:** removed `<React.StrictMode>` from `src/main.jsx` rather than patching `App.jsx`, since StrictMode was scaffolding added during export, not part of the original tested app — this restores parity with the app's previously-tested behavior instead of silently introducing a new duplicate-logging bug. This is flagged ⚠️ rather than marked fully resolved because it's a deliberate trade-off, not a clean fix: real production hardening should eventually re-enable StrictMode (it catches other real classes of bugs) and add a mount-guard `useRef` to that one effect first.

### localStorage capacity vs. the artifact's storage semantics

The original `window.storage` API enforces limits per-key (documented at up to 5MB per value). Browser `localStorage` instead enforces a much smaller **total** quota per origin (commonly 5–10MB combined, varying by browser) — a materially different constraint. The Evidence Timeline (`journi-evidence-timeline`) is the one value in this app that grows unbounded over time, since it's an append-only event log with no pruning or archiving logic. For any individual beta user over weeks of real usage, this is very unlikely to be an issue in the short term, but it is a genuine ceiling that didn't meaningfully exist in the same form before. Not fixed here (would require adding timeline pruning/archiving logic to `App.jsx`, which is a feature change, out of scope for this audit) — flagged for whoever designs the real backend, since a proper datastore removes this constraint entirely.

---

## Verdict

**Zero Launch Blockers.** Every genuine Claude-specific runtime dependency (`window.storage`) has been fully replaced with a standard web equivalent, verified call-signature-for-call-signature rather than assumed compatible. Everything else audited either never existed in the first place (auth, notifications, network calls, artifact messaging) or is a general web-platform consideration (Google Fonts reachability, localStorage quota) unrelated to Claude specifically.

The one real environment-behavior mismatch found — StrictMode's dev-mode double-invocation exposing one non-idempotent effect — has been resolved at the scaffold level, with the underlying fragility in `App.jsx` documented rather than silently patched around, so it can be addressed properly (a one-line `useRef` guard) whenever StrictMode is re-enabled.

**JOURNI is ready to run on any standard React/Vite development environment, before a backend is connected.**

---

## Coach responses

The coach uses keyword-matched templates, not adaptive AI. It can route to relevant categories (energy, time, doubt, resistance, overwhelm) based on keywords, but cannot understand full sentence intent — e.g. it won't recognize when a user proposes an alternative plan (like "I'll do it tomorrow instead") and respond to that specific offer. Fixing this properly would require replacing the template system with a real AI model call (e.g. Claude API) with conversation context. Deferred until post-validation.
