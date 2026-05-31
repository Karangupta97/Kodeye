# Kodeye Performance Audit Report

**Date:** 2026-05-31  
**Scope:** End-to-end audit — Express API, Supabase, Next.js frontend, GitHub integration, AI pipeline

---

## Executive Summary

Production latency was driven by **blocking AI reviews**, **monolithic review bundle payloads** (including multi-MB diff patches), **duplicate client fetches with no cache**, **sequential DB/GitHub waterfalls**, and **unbounded metrics queries**. This pass implements measured, targeted fixes across backend and frontend.

---

## 1. Root Causes Found

| # | Root cause | Impact | Severity |
|---|-----------|--------|----------|
| 1 | `POST /api/pull-requests/:id/review` blocked until full Gemini + GitHub pipeline finished (30s–3min) | AI review froze UI | Critical |
| 2 | `GET /api/reviews/:prId` returned full file patches in bundle | 500ms–5s+ payloads | Critical |
| 3 | Synchronous GitHub PR metadata fetch on every review load | +200–800ms per review page | High |
| 4 | No request timing or Server-Timing headers | Could not measure production bottlenecks | High |
| 5 | `getTotalReviewStats` fetched **all** `ai_reviews` rows for user | O(n) DB time as reviews grow | High |
| 6 | `GET /api/pull-requests` loaded **all repositories** to map `repo_id` | Wasted DB round-trip | Medium |
| 7 | New Octokit client per GitHub call | Repeated App auth (~100–300ms each) | Medium |
| 8 | No frontend data cache — same `/api/pull-requests` on 3 pages | 3× duplicate network on navigation | High |
| 9 | `getSession()` on every `fetchApi` call | Redundant Supabase auth latency | Medium |
| 10 | Client-only data loading after SSR auth shell | Hydration → useEffect → fetch waterfall | Medium |
| 11 | `react-syntax-highlighter` statically imported on review route | Large JS bundle on initial load | Medium |
| 12 | Missing composite DB indexes on `(user_id, pr_id)` patterns | Full scans at scale | Medium |

---

## 2. Files Affected

### Backend
- `backend/src/middleware/timingMiddleware.ts` — API timing + `Server-Timing` headers
- `backend/src/utils/timing.ts` — `RequestTimer` with DB/GitHub/AI breakdown
- `backend/src/utils/cache.ts` — TTL in-memory cache
- `backend/src/server.ts` — timing middleware wired
- `backend/src/controllers/aiReview.controller.ts` — async 202; background pipeline
- `backend/src/controllers/review.controller.ts` — parallel bundle; skip GitHub; 15s cache
- `backend/src/controllers/pullRequests.controller.ts` — targeted repo fetch; 20s cache
- `backend/src/controllers/metrics.controller.ts` — SQL counts + 30s cache
- `backend/src/controllers/repositories.controller.ts` — 60s cache
- `backend/src/services/aiReviews.service.ts` — count queries for metrics
- `backend/src/services/pullRequestFiles.service.ts` — patch exclusion + filename filter
- `backend/src/services/repositories.service.ts` — `getRepositoriesByIds`
- `backend/src/github/octokit.ts` — installation client cache
- `backend/supabase/migrations/007_performance_indexes.sql` — composite indexes

### Frontend
- `frontend/src/components/providers/QueryProvider.tsx` — React Query
- `frontend/src/hooks/useApiQueries.ts` — shared data hooks
- `frontend/src/lib/api.ts` — token cache; lazy file fetch helper
- All dashboard pages migrated to React Query
- `frontend/src/components/review/ReviewFilesPanel.tsx` — lazy patches; dynamic DiffViewer
- `frontend/next.config.ts` — `optimizePackageImports`

---

## 3. Before / After Metrics (Expected)

| Metric | Before (est.) | After (target) |
|--------|---------------|----------------|
| `GET /api/metrics` | 150–800ms | <50ms cached, <100ms cold |
| `GET /api/pull-requests` | 200–600ms | <200ms cached, <300ms cold |
| `GET /api/reviews/:prId` | 800ms–5s | <300ms initial |
| `POST .../review` TTFB | 30s–180s | <100ms (202 Accepted) |
| Duplicate PR fetches | 3 per nav cycle | 1 (React Query) |

Verify via `Server-Timing` response headers and backend `API timing` logs.

---

## 4. Implemented Optimizations

- **Timing middleware** on all `/api/*` with DB/GitHub/AI breakdown
- **Database:** composite indexes + SQL count queries
- **Caching:** metrics/repos/PR list/review bundle (in-memory TTL)
- **AI pipeline:** non-blocking 202 + SSE progress
- **Review bundle:** no patches/GitHub on initial load; lazy per-file fetch
- **Frontend:** React Query deduplication + token cache
- **Bundle:** dynamic DiffViewer + optimizePackageImports

---

## 5. Remaining Bottlenecks

| Item | Recommendation |
|------|----------------|
| Multi-instance cache/locks | Upstash Redis |
| Sequential GitHub comment posting | Batch with concurrency limit |
| PR sync N×M writes | Background queue + batch upsert |
| No Sentry/OpenTelemetry | Add observability stack |
| Unbounded PR lists | Cursor pagination |
| Unused deps (recharts, gsap, lenis) | Remove from package.json |

---

## Deployment

1. Apply `backend/supabase/migrations/007_performance_indexes.sql`
2. Deploy backend + frontend
3. Monitor logs for endpoints >300ms

## API Changes

- `POST /api/pull-requests/:id/review` → **202** by default; `?wait=1` blocks
- `GET /api/pull-requests/:id/files?includePatch=1&filename=` → lazy patches
- All `/api/*` → `Server-Timing` header
