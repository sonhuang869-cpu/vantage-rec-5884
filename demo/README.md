# VantageRec — Automated Reconciliation Engine

Premium enterprise reconciliation platform for investment management and financial services teams. Built for Nigerian and international finance professionals.

## Features

- **Automated reconciliation engine** — imports two data sources (portfolio book vs custodian statement), runs configurable matching logic, and classifies every item as: Matched, Partial Match, Unmatched A, or Unmatched B
- **New Reconciliation wizard** — 3-step workflow: load Source A → load Source B → configure matching rules → run
- **Detailed results view** — tabbed breakdown with sortable, searchable tables; variance amounts highlighted in red/amber
- **Exception management** — full lifecycle workflow: Open → Under Review → Escalated / Resolved; comment threads; priority badges
- **Analytics & Reports** — match rate trend, item breakdown charts, variance trend, exportable summary table
- **Persistent demo data** — all reconciliation runs and exception actions survive page refresh (localStorage)
- **Reset demo** — Settings → Reset Demo Data restores original seed data

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS (custom design system: deep navy sidebar + amber accent)
- React Router v6
- Radix UI primitives (dialog, select, tabs)
- Recharts for analytics
- PapaParse for CSV upload
- Sonner for notifications

## Routes

| Path | Description |
|------|-------------|
| `/` | Dashboard — overview, match rate trend, exception summary |
| `/reconcile` | All reconciliation runs |
| `/reconcile/new` | New reconciliation wizard |
| `/reconcile/:id` | Reconciliation detail — matched/partial/unmatched tabs |
| `/exceptions` | Exception management |
| `/reports` | Analytics and export |
| `/settings` | Organisation settings and demo reset |

## Demo Data

Seed data represents **Prestige Asset Management (internal book)** vs **First Custodian Nigeria (custodian statement)** for October and September 2024, with realistic Nigerian equity and fixed income transactions:

- **Perfectly matched:** ~23 equity + bond + T-bill transactions
- **Partial matches (amount discrepancy):** ~6 items with ₦7,500–₦230,000 variance (accrued interest, fee differences)
- **Unmatched A (only in book):** 3 items (pending settlement not yet with custodian)
- **Unmatched B (only in custodian):** 2 items (counterparty book entries missing from internal records)

Securities: MTN Nigeria, Dangote Cement, Zenith Bank, Access Holdings, Airtel Africa, BUA Foods, Seplat Energy, FGN Bonds, 91/182-day Treasury Bills.

## Running Locally

```bash
npm install
npm run dev        # development server at http://localhost:5173
npm run build      # production build to dist/
npm run typecheck  # type-check without building
```

## Deployment

Configured for Vercel SPA deployment. `vercel.json` rewrites all routes to `/index.html`.

```bash
vercel deploy --prod
```

## Limitations

- Authentication is simulated (single user: Adaeze Okonkwo, Operations Lead)
- File exports (PDF/Excel) show a success toast but do not produce real files
- Data is stored in browser localStorage; clearing site data resets to defaults
- No real backend — all reconciliation logic runs client-side
