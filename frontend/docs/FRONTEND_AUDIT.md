# Kodeye AI — Frontend Audit Report

**Date:** 2026-05-30  
**Scope:** Full frontend (`frontend/src`)

---

## Executive Summary

The frontend had a solid dark-theme foundation (`kodeye.css`) but suffered from **duplicated shells**, **inconsistent layout**, a **default Next.js landing page**, **no shared design primitives**, **missing Zustand** (listed in stack but unused), **incomplete route protection**, and **uneven loading/error UX**. This audit drove a unified design system, `AppShell`, and page-level hardening.

---

## Phase 1 — Architecture Findings

| Area | Finding | Severity |
|------|---------|----------|
| Layout | `DashboardShell` + `ReviewShell` duplicate 90% of sidebar/header | High |
| Routing | `/` still default Next.js starter; no product landing | High |
| Auth | Middleware missing `/pull-requests`, `/reviews` | High |
| State | No global UI state; sidebar collapse not persisted | Medium |
| Data | Per-page `useEffect` + `fetchApi`; no shared hooks except reviews | Low (acceptable) |
| Dead code | `gsap`, `lenis`, `@radix-ui/react-accordion` unused in `src/` | Low |

---

## Phase 2–3 — Design System Gaps (Before Fix)

- Buttons/cards via CSS classes only — no typed React API
- No `Input`, `Badge`, `Skeleton`, `EmptyState`, `ErrorState` components
- Typography ad-hoc per page (`text-2xl`, `text-3xl` mixed)
- Light mode tokens exist but some hardcoded colors bypass tokens

---

## Phase 4 — Responsiveness

| Issue | Location |
|-------|----------|
| Review page analytics hidden below `xl` with no mobile fallback | `reviews/[prId]/page.tsx` |
| DashboardShell no mobile nav drawer (logo only) | `DashboardShell` |
| Horizontal overflow risk on wide diff tables | `DiffViewer` |
| Duplicate nav keys (fixed: `key={link.label}`) | `DashboardShell` |

---

## Phase 5–6 — Layout & Sidebar

- Inconsistent `max-w-6xl` vs full-bleed review layout
- Breadcrumb used `link.href === pathname` — wrong for AI Reviews & nested routes
- No collapsible / icon-only sidebar

---

## Phase 7 — Theme

- `ThemeProvider` correct (`class`, default dark)
- `suppressHydrationWarning` on `<html>` — good
- Charts/diffs use CSS variables — OK in dark/light

---

## Phase 8 — Typography

- No scale tokens (`--kd-text-h1`, etc.)
- Inconsistent heading weights

---

## Phase 9 — Animation

- Framer Motion duplicated variants per page
- `ReviewProcessing` simulated steps vs SSE (acceptable UX)
- Blob animations always on — consider `prefers-reduced-motion`

---

## Phase 10 — Performance

- `DiffViewer` + SyntaxHighlighter per line — heavy (mitigated: line cap + expand)
- No `React.memo` on list cards (acceptable at current scale)
- Recharts only on review analytics panel

---

## Phase 11 — Accessibility

| Issue | Fix |
|-------|-----|
| Mobile menu button missing `aria-label` | Added in AppShell |
| Export dropdown hover-only | Keyboard-focusable patterns |
| Missing skip link | Added skip-to-content |
| Focus rings inconsistent | Global `:focus-visible` in CSS |

---

## Phase 12–13 — Errors & Loading

| Page | Before | After |
|------|--------|-------|
| Dashboard | Spinner implicit via empty N/A | Skeleton + ErrorState |
| Repositories | Silent fail → empty list | ErrorState + EmptyState |
| Pull Requests | Good error UI | Reuse shared components |
| Settings | Placeholder only | Structured settings UI |
| Landing `/` | Next.js default | Product landing + auth CTA |

---

## Phase 14 — Data UI

- PR list: no search/filter (future enhancement noted)
- Tables not used — card lists OK for MVP

---

## Phase 15 — Page Status

| Page | Status |
|------|--------|
| Landing `/` | Redesigned |
| Login | Already strong |
| Dashboard | Enhanced loading/errors |
| Pull Requests | Shared components |
| Repositories | Shared components |
| AI Review | Uses AppShell immersive mode |
| Settings | Expanded |
| Risk/Reports/Team | Nav links → dashboard placeholders |

---

## Implemented Improvements

1. **`AppShell`** — unified sidebar (collapse, mobile drawer, persisted state)
2. **Design system** — `Button`, `Badge`, `Input`, `Skeleton`, `EmptyState`, `ErrorState`, `PageHeader`
3. **`lib/navigation.ts`** + **`lib/motion.ts`** — single source of truth
4. **`stores/ui-store.ts`** (Zustand) — sidebar + mobile menu
5. **CSS** — typography scale, focus, containers, `prefers-reduced-motion`
6. **Middleware** — protect `/pull-requests`, `/reviews`
7. **Landing page** — production marketing page
8. **Settings** — appearance + account sections

---

## Remaining Recommendations (Post-Sprint)

1. Add PR search/filter + pagination
2. Mobile analytics drawer on review page
3. Shared `usePullRequests` / `useRepositories` hooks
4. Remove unused deps (`gsap`, `lenis`) or use intentionally
5. E2E tests (Playwright) for auth + critical paths
6. Virtualize diff viewer for 1000+ line files

---

## QA Checklist

- [x] `npm run build` passes
- [x] Unique React keys in navigation
- [x] Protected routes include reviews + pull-requests
- [x] Theme toggle works in settings + header
- [x] Mobile drawer opens/closes with backdrop
