# Navigation bug — root cause analysis

## Bug #1: Multiple sidebar items highlighted

**Root cause:** Several nav items shared the same `href` while using loose matchers (`prefix` or duplicate `exact` on the same path).

| Items | Shared `href` | Matcher | Result on `/settings` |
|-------|---------------|---------|------------------------|
| Integrations, Team, Settings | `/settings` | `prefix` | All 3 active |
| Risk Insights, Reports, Overview | `/dashboard` | `exact` | Risk + Reports + Overview active on `/dashboard` |

`isNavActive()` was evaluated **per item independently**, so every item whose matcher passed was styled active — not a React key bug.

## Bug #2: AI Reviews opens Pull Requests

**Root cause:** `AI Reviews` nav entry had `href: "/pull-requests"` (only `match: "reviews"` affected highlight on `/reviews/*`, not the link target).

## Fix strategy

1. **Unique `href` per nav item** — one route per sidebar entry.
2. **`resolveActiveNavId(pathname)`** — returns exactly one `id` (priority-ordered rules).
3. **`isNavItemActive(pathname, id)`** — `resolveActiveNavId(pathname) === id`.
4. New App Router pages for missing routes.
5. `/dashboard` → redirect to `/overview` for backward compatibility.
