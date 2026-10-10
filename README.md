# CGPA Calc

A free, fully offline CGPA calculator and grade planner for university students. Add your courses, see your live CGPA per semester and overall, plan what grades you need to hit a target, and preview "what-if" grade changes — all in the browser, no account, no server.

## 1. Problem being solved

Students constantly estimate their CGPA by hand or in spreadsheets, and "what do I need to reach a 3.5?" usually means re-deriving the weighted-average formula every time. CGPA Calc gives a live, always-correct answer plus a target planner and what-if previews, with an editable grade scale for universities whose mappings differ.

## 2. Implemented features

- **Course management** — add/remove courses with name, credits, letter grade, and semester grouping; grades changeable inline.
- **Live CGPA** — overall CGPA plus per-semester GPA, recalculated on every change.
- **Target planner** — enter a target CGPA and remaining credits; shows the required average grade point and whether the target is reachable on your scale.
- **What-if preview** — try a different grade on any course and see the projected CGPA and delta before applying.
- **Editable grade scale** — default 4.0 scale (A=4.0 … F=0.0); every point value is editable, with one-click reset.
- **Persistence** — everything saved in `localStorage`; survives reloads.
- **Export / import** — one-click JSON backup download and restore, with file validation.
- **Responsive UI** — clean cards layout on desktop, single-column on mobile; empty states throughout.

## 3. Technology stack

- Plain HTML, CSS, and JavaScript — no frameworks, no build step, no dependencies.
- Browser `localStorage` for persistence; `Blob` + `FileReader` for export/import.

## 4. Prerequisites

Any modern browser (Chrome, Edge, Firefox, Safari). Nothing to install.

## 5. Installation instructions

No installation. Clone or download the repository and open `index.html`, or serve the folder with any static server:

```bash
git clone https://github.com/fahad3235/cgpa-calc.git
cd cgpa-calc
python3 -m http.server 8000   # then open http://localhost:8000
```

## 6. Local development commands

There is no build step. Edit files and reload the page.

```bash
python3 -m http.server 8000
```

## 7. Environment variable setup

None — the app is fully offline and uses no environment variables or API keys.

## 8. Testing instructions

Automated headless-Chromium checks (Playwright) live outside the repo; run them with:

```bash
cd /tmp/cgpa-test   # test script location used during development
python3 -m pytest test_cgpa.py -v
```

The suite covers: zero console errors; CGPA math against hand-computed values (3cr A=4.0 + 3cr B+=3.3 → 3.65); per-semester GPA; target-planner math (incl. impossible targets); what-if projection; persistence across reload; export/import round-trip; rejection of invalid inputs (empty name, zero/negative credits, credits > 12, malformed import file); editable scale recalculation.

## 9. Deployment instructions

GitHub Pages compatible — it is a static site. Push to GitHub, then enable Pages: repository Settings → Pages → Deploy from a branch → `main` / `/ (root)`.

## 10. Known limitations

- Data lives in per-browser `localStorage`; use Export for backups or moving devices.
- Grade scale max is capped at 4.3 per entry; some universities use different conventions — edit the scale to match yours.
- Amounts round to 2 decimals; credits support 0.5 steps.
- No repeated-course replacement rules (some universities drop the lower attempt) — model those manually.

## 11. Current project status

v1 complete and verified: 25/25 automated checks passing, zero console errors. No backend planned.

## 12. License

MIT — see LICENSE.
