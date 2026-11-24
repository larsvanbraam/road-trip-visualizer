# Improvement plan

Status after the Vite+ migration: `vp check` passes with 0 errors (11 lint warnings), `vp build` succeeds in
~0.4s. Ordered by value for effort.

## 1. Finish the migration (small)

- [ ] Decide on the package manager. `vp migrate` picked **pnpm** because no manager was declared; the
      old `package-lock.json` was removed. Run `vp env pin` to declare it, or switch back to npm.
- [ ] Fix the 11 lint warnings (`vp check`): unused imports (`Box`, `Typography`), `unbound-method` in
      Navigation/Sidebar, floating `html2canvas` promise, useless default values.
- [ ] Add `vp check` + `vp build` to CI (GitHub Actions). There is none today.
- [ ] Update the README (setup, env var names, `vp dev` / `vp build`). The env vars are now `VITE_*`.
- [ ] Replace placeholder `public/` assets (CRA logos, `theme-color`) with real ones.

## 2. Security and config (small, do soon)

- [ ] **Restrict the Google API key** in Google Cloud Console to your site's HTTP referrers and to the
      Maps JavaScript + Sheets APIs. It is exposed in the client bundle by design, so restriction is
      the only protection. Rotate it, since the old key sat in a local `.env` for years.
- [ ] Keep `.env.example` as the documented contract; validate env at startup and show a friendly error
      if the key is missing.
- [ ] README mentions `VITE_SHEET_ID` / `OUTPUT_PATH` flows that no longer exist in code. Remove stale
      docs, along with the unused `.idea/` folder from the repo.

## 3. Dependency modernisation (medium)

| Area                | Now               | Target                                  | Notes                                                                                   |
| ------------------- | ----------------- | --------------------------------------- | --------------------------------------------------------------------------------------- |
| React               | 18                | 19                                      | Check `@react-google-maps/api` and MUI compat first                                     |
| MUI                 | 5                 | 7                                       | Codemods exist; main work is `Grid` and theme changes                                   |
| react-router        | 6.9 (data router) | 7                                       | Mostly drop-in                                                                          |
| **Recoil**          | 0.7               | **Jotai or Zustand**                    | Recoil is archived and unmaintained; state is small (`sheetState`) so the swap is cheap |
| `use-google-sheets` | 2.x               | keep, or replace with a 30-line `fetch` | Package is thin and its types are not exported properly (I worked around it)            |
| `lodash-es`         | whole lib         | inline `kebabCase`                      | Used once, in `ScreenshotButton`                                                        |
| TypeScript          | 5.9               | 6/7 when stable                         |                                                                                         |

## 4. Code quality (medium)

- [ ] Finish or remove the half-done `onMouseover` handler in `Directions.tsx` (uncommitted WIP with a
      `console.log` and an unused dependency).
- [ ] Add tests with **Vitest** (`vp test`). CRA's tests were already commented out. Start with
      `parseGoogleSheetData` (pure, easy) and the stop-ordering logic.
- [ ] Add loading/error states for Sheets failures (private sheet, wrong ID, quota).
- [ ] Cache Directions API results (in-memory cache exists in `Directions.tsx`; persist to
      `sessionStorage` to cut billed requests on reload).
- [ ] Tighten types: replace `as RoadTripStop` casts in the parser with a validated mapping (e.g. zod).

## 5. Performance (small)

- [ ] Main bundle is **907 kB** (256 kB gzip). Lazy-load routes (`EnterSheetId`, `Home`) and load
      `html2canvas` with a dynamic `import()` only when the screenshot button is clicked.
- [ ] Import MUI icons by path or via the Vite+ tree-shaking defaults and verify with a bundle report.
- [ ] Self-host the Roboto font (`@fontsource/roboto`) instead of the Google Fonts `<link>`.

## 6. Product ideas (later)

- Shareable URLs (`/?sheet=<id>`) instead of only local state.
- Per-day stats (distance, drive time totals), elevation and cost estimates.
- Export trip as GPX/KML.
- PWA offline support: `manifest.json` already exists, add a service worker.
- Accessibility pass (keyboard navigation of the day list, contrast on the map overlay).

## Suggested order

1. Section 1 + 2 in one PR (about half a day).
2. Recoil replacement + lodash removal + lazy loading (one PR).
3. React 19 / MUI 7 / Router 7 upgrade (own PR, test thoroughly against a real sheet).
4. Tests and error states, then product ideas.
