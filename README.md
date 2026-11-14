# Yash Earthing Solutions - Lead Management CRM (local checking version)

Browser-only React + Vite + TypeScript app. There is no backend: seed data in `src/data/*.json` is copied into
localStorage (key `yash_erp_local_v1`) on first load, and `src/services/db.ts` is the only code that reads or writes it.

Spec: [PRD.md](PRD.md). Design: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Demo data

- Use the role switcher in the header to act as Admin, Sales Manager, Sales Executive or Back Office.
- Settings (Admin only) has Export, Import and Reset for the localStorage database.
- `npm run seed:generate` regenerates the seed JSON files.

Roles and permissions are enforced in the browser only. This is a checking build, not production-grade security.

## Status

Phase 1 (scaffold, local JSON store, RBAC) is implemented. Leads, follow-ups, quotations, orders, finance, targets and
reports are placeholders for later phases.
