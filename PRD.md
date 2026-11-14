# ENTERPRISE PROMPT v3 - LOCAL CHECKING VERSION: Yash Earthing ERP - Lead Management System

Build a production-ready, demo-ready Lead Management CRM for Yash Earthing Solutions Pvt Ltd, Pune, Maharashtra. This version is ONLY for checking / demo. No backend, no database server. Everything runs in browser with LOCAL JSON + localStorage.

> This spec replaces all earlier versions. Where a rule and edge case conflict, edge case wins. Build phases in order. Each phase must be runnable on its own.

## 1. PRODUCT VISION
- Product: Yash Earthing ERP - Lead Management Suite
- Core rule: Lead Management is the product. Quotations, Orders, Payments exist only to serve lead conversion. Every sub-module links back to a lead.
- Inspiration: LeadSquared + Zoho CRM + 【entity-HubSpot¦canonical_name=HubSpot】 - simplified for Indian B2B field sales.
- Business: Manufacturer of earthing products: Chemical Pipe-in-Pipe Earth Electrode 3 Mtr, ESE Lightning Arrester, GI Earthing Strip 25x3mm, Copper Earth Busbar, Chemical Earthing Compound.
- Customers: Builders, telecom tower companies, factories, hospitals, IT parks, solar plants, schools - Pune, Mumbai, Nashik, Nagpur, Aurangabad, Kolhapur, Satara.
- North star: No lead is ever lost, forgotten, or stuck without a next action. A lead without a next follow-up is a system defect.

## 2. TECH STACK - LOCAL ONLY, DO NOT CHANGE
- React + Vite + TypeScript (strict mode)
- TailwindCSS + shadcn/ui-style components
- Zustand for state management
- LOCAL DATA STORE ONLY: Local JSON files + localStorage + IndexedDB via Dexie.js (optional, but localStorage is primary)
- Recharts, Framer Motion, Lucide icons
- React Router
- NO backend, NO Node.js, NO Express, NO PostgreSQL, NO Drizzle ORM, NO Firebase, NO Supabase.
- npm run dev -> port 5173. npm run build -> zero TypeScript errors, zero console errors.

### 2.1 Local JSON Data Store - HOW IT MUST WORK
This is for checking, so data must be simple and visible:
- Source of truth files in `src/data/`:
    - `users.json`, `leads.json`, `quotes.json`, `orders.json`, `invoices.json`, `payments.json`, `recovery.json`, `products.json`, `targets.json`, `audit.json`, `settings.json`
- On first load: App loads seed JSON from `src/data/`, copies it to localStorage key `yash_erp_local_v1`, and uses localStorage as live DB.
- Every Create / Update / Delete writes to localStorage instantly and updates UI instantly. Refresh must keep data.
- Add buttons in Settings: `Reset Demo Data` (reload from JSON files), `Export All Data JSON` (download localStorage as JSON), `Import JSON` (upload JSON to restore).
- All writes go through ONE service layer `src/services/db.ts` with functions: getLeads(), saveLead(), deleteLead(), etc. Never write localStorage directly from components.
- Idempotency: Every mutating action uses an `actionId` / dedup key, resubmit never double-creates.
- All timestamps: ISO strings, display in Asia/Kolkata. Today boundaries use IST.
- Offline by definition. tel: / wa.me links may not open - degrade gracefully.

## 3. PERSONAS - DESIGN FOR NON-TECHNICAL USERS
Every screen answers: What is this? What do I do next? What happens if I click this? Big buttons, wizards, tooltips, simple words, success toasts, empty states with next step. No dead buttons, no blank pages, no jargon.

| Role | Person | Can do | Cannot do |
| Admin / Owner | Yash Admin | Everything: users, roles, permissions, reassign any lead, settings, master data, audit log, reset data | - |
| Sales Manager | Rajesh Patil | Team pipeline, unassigned leads, assign/reassign, approve Won-without-quote, targets, reports, quotations view | Change system settings, edit permissions, delete users |
| Sales Executive | Rahul More, Priya Sharma, Amit Patil | Only own assigned leads: call, log outcome, set follow-up, request quote, mark Won / Lost | See other executives leads, costs, margins, admin settings |
| Back Office | Sneha Deshmukh | Quote requests, quotations, orders, inventory, dispatch, payments, recovery | See executive private notes, delete leads, admin settings |

## 4. RBAC & PRIVACY - CLIENT-SIDE, ENFORCE STRICTLY
- Single `can(role, permission)` check drives sidebar, routes, buttons, and list queries. Never hide button in UI but allow action in store - guard both layers.
- Restricted route -> friendly Access Denied card: "This section is private for Admin. Contact Admin if you need access." + Go Back button.
- Role Switcher in header simulates login - this is demo model, not real auth. Switching role must instantly filter data.
- Access matrix:
    - Dashboard: All roles, own scope only
    - My Leads / All Leads: Executive own only, Manager team + unassigned, Back Office none, Admin all
    - Follow-ups / Calls: Executive own, Manager team, Admin all
    - Quotations: Executive request + own view, Manager view all, Back Office full, Admin full
    - Orders / Inventory: Manager view, Back Office full, Admin full
    - Finance / Recovery: Manager view, Back Office full, Admin full
    - Targets: Executive own, Manager team, Admin all
    - Reports: Manager + Admin only
    - Team & Attendance: Executive own check-in, Manager team, Admin all
    - Admin Control Center: Admin only
- Audit trail: Every create/update/status-change/assignment writes {who, role, what, entityId, before -> after, timestamp}. Shown in lead timeline and Admin -> Audit Log.

## 5. INFORMATION ARCHITECTURE
- /dashboard - role-based command center
- /leads - Lead Management core
    - /leads/inbox - live capture + simulator
    - /leads/my-leads - executive assigned leads
    - /leads/kanban - pipeline board
    - /leads/followups - list + calendar
    - /leads/calls - call logs / global activity
    - /leads/duplicates - duplicate review queue
    - /leads/lost - lost bucket
- /quotations, /orders, /finance, /targets, /reports, /team, /admin, /settings

## 6. CORE MODULE: LEAD MANAGEMENT
### 6.1 Lead Capture & Inbox
- Lead code: LD-YYMMDD-XXX, sequential per day, generated inside same write.
- Sources: Direct, 【entity-JustDial¦canonical_name=JustDial】, TradeIndia, Website, Referral, Excel Import.
- Simulator: Buttons 【entity-JustDial¦canonical_name=JustDial】 / TradeIndia / Website lead. Auto Mode: one new lead every 20s -> toast + inbox badge. Turning off stops timer. No runaway timers.
- 【entity-JustDial¦canonical_name=JustDial】 logic: Drop leads whose company matches "Yash Earthing Solutions Pvt Ltd" case/spacing-insensitive.
- Excel Import: Upload CSV + Download Sample Template. Validates phone per row, imports valid rows, reports row errors, bad rows skipped never silently dropped.
- Phone normalization: 9876543210, 09876543210, +919876543210 -> +91 98765 43210. Invalid -> inline error, do not save.
- Duplicate detection: Normalized phone exists -> modal "This phone already exists as LD-XXXX" with Merge (attach to existing, log timeline) or Create Anyway (flag possibleDuplicate, appears in /leads/duplicates). Default = blocked.
- Lead fields: Company, Contact Person, Phone, Email, City, State, Product Required, Variant/Specs, Expected Value (Rs), Source, Assigned To, Status, Lead Score, Next Follow-up, Notes, GSTIN, Address, Raw Query.
- GSTIN: Optional, if present validate 15-char pattern. Show inline format error, do not hard-block.

### 6.2 Assignment Engine
- Round-robin: New leads auto-assign one-by-one to checked-in Sales Executives.
- Attendance: Header Checked-In toggle (executive only). Team page shows who is in. Only checked-in get leads.
- Capacity: Max 15 active (non-Won/Lost) leads per executive, skip when full.
- Edge cases:
    - Nobody checked in / all at capacity -> lead goes to Unassigned, visible to Manager/Admin with badge, Manager gets notification. Re-enters round-robin when capacity frees on check-in or lead close.
    - Executive deactivated / checked out with open leads -> leads stay assigned but appear in Manager "needs attention", Manager can bulk-reassign.
    - Manual reassign -> requires reason, logged: "Assigned to Rahul More by Rajesh Patil - 'new enquiry from his city' at 10:32 AM".
- Assignment history in timeline.

### 6.3 Lifecycle
New -> Contacted -> Qualified -> Quote Requested -> Negotiation -> Won and any stage -> Lost
- Forward-only. Skipping stages -> guardrail message explaining missing step. Lost is terminal except Admin Re-open (logged).
- Won: Requires linked Accepted quotation OR Manager/Admin explicit approval with reason, logged.
- Lost: Mandatory modal - Reason (Price High, Competitor, No Requirement, No Response, Budget Issue, Other) + notes. Lost leads go to Lost bucket, never deleted.
- Scoring: Auto 0-100 -> Hot 80+ red, Warm 50-79 amber, Cold <50 grey. Inputs: source weight, expected value, city tier, response speed, completed follow-ups. Recompute on each event, show breakdown on hover.

### 6.4 Lead Detail - Single Source of Truth
- Left: Contact card, company, person, phone with Call Now (tel:), WhatsApp (wa.me), address, score with breakdown, status.
- Center: Timeline - calls, status, assignments, notes, quotes, follow-ups, audit entries, newest first, filterable.
- Right: Big "What To Do Next?" box - Log a Call / Set Follow-up / Request Quote / Mark Won / Mark Lost. Buttons that don't apply are disabled with tooltip why, never invisible, never dead.
- Guardrail: No pending follow-up -> red banner "This lead has no next follow-up. Set one now or it will be lost."

### 6.5 Follow-ups, Calls, SLA, Notifications
- Follow-up list: Today / Overdue (red, worst-first) / Upcoming. Actions: Call Now, Mark Done, Reschedule, Snooze.
- Log Call modal: Outcome Connected, Busy, Callback Requested, Invalid Number, Not Reachable, duration, notes, next follow-up date/time. Saves to timeline. Submit disables during save.
- SLA: New lead must be contacted within 2 hours of assignment (configurable in Admin). Breach -> badge + notification to Manager. SLA is elapsed-hours, document in README.
- Notifications: In-app bell with unread count. Events: new lead assigned, unassigned lead, SLA breach, overdue follow-up, quote request, quote status change, payment overdue. Click -> deep-links to entity. No push/email.

### 6.6 Bulk & Productivity
- Search: name, company, phone normalized match. Filters: source, status, assignee, city, date range, score band.
- Bulk: Change status, assign to rep, export CSV, delete (Admin only, confirm + audit).
- Kanban: Stage columns, Move To dropdown updates lead + timeline, stage-jump guardrails apply.
- Follow-ups: List / Kanban / Calendar views.

## 7. SUB-MODULES
### A. Quotations
- Executive -> Request Quote -> auto-assign to Back Office via round-robin.
- Quote editor: line items product, qty, rate, discount, freight. GST: Maharashtra -> CGST 9% + SGST 9%, other states -> IGST 18%. Live totals: subtotal, tax, freight, grand total. Amounts in Rs, 2 decimals, Indian grouping Rs 1,23,456.00.
- Number QT-YYYY-XXXX. Statuses: Draft -> UnderReview -> Ready -> Sent -> Accepted / Revised / Rejected.
- Actions: Send, Revise (new revision, old kept), Accept, Clone, Print/PDF letterhead terms bank details. Only Accepted unlocks Convert to Order.
- Edge: Editing Sent quote forces Revise, not in-place mutation.

### B. Orders & Inventory
- Accepted quote -> Convert to Order 1 click (SO-YYYY-XXXX), carrying line items.
- Approve & reserve: Available -> Reserved per line. Insufficient stock -> block, show per-line shortage, allow Manager/Admin Exception Approval (reason logged).
- Dispatch: Full or partial, multiple trips. Each trip deducts only shipped qty from On Hand and Reserved, tracks Shipped/Pending. Idempotent - resubmit never double-deducts.
- Status: Pending -> Approved -> Partially Dispatched -> Dispatched -> Delivered / Cancelled. Cancel releases reservation.
- Inventory: Product, Available, Reserved, On Hand. Low-stock red badge (threshold editable). Edit stock: Admin/Back Office only, with audit.

### C. Payments & Recovery
- Invoice INV-YYMM-XXXX from order: GST breakdown, E-Way bill no., vehicle no.
- Payment modal: % (25/50/75/100 buttons) or Rs. Live Balance = Total - Received. Overpayment blocked.
- Status: Pending -> PartialReceived -> FullReceived. Ageing buckets 0-30 / 31-60 / 61-90 / 90+.
- Recovery: Invoice overdue >30 days with balance >0 -> auto recovery task for Back Office. Log Recovery Call: Outcome PromiseToPay, CallAgain, Dispute, PaidInFull, Unreachable, promised amount <= balance (2-decimal), promise date. "Customer Paid Full" one-click settles -> Recovered.

### D. Targets & Reports
- Targets per rep monthly/quarterly: target vs achieved revenue, calls logged, conversion %, progress bars.
- Reports: Funnel conversion, source performance, rep leaderboard, follow-up compliance, recovery performance, product-wise revenue. All export CSV.

## 8. ADMIN CONTROL CENTER (Admin only)
Tabs: Users (add, change role, activate/deactivate) / Permissions Matrix (role x module toggles that actually hide sidebar and block routes) / Assignment Rules (round-robin on/off, checked-in-only on/off, max leads per rep, SLA hours) / Masters (lead sources, lost reasons, products, cities) / Audit Log / Data (export JSON, import JSON, reset demo data).

## 9. DASHBOARDS
- Admin: Total leads, new today, unassigned, conversion %, pipeline value, outstanding Rs, overdue follow-ups, SLA breaches.
- Manager: Team leads, team performance, unassigned queue, overdue follow-ups, top performer.
- Executive: My leads, today's follow-ups, my calls today, my conversion, target progress, ranked next actions.
- Back Office: Pending quote requests, orders to dispatch, payments due, recovery due.
- Widgets: Funnel chart, source donut, rep leaderboard, today's follow-ups, recent leads feed, simulator status.

## 10. DESIGN SYSTEM
- Dark navy sidebar #0F172A, white content, emerald #10B981 primary, amber warnings, red overdue.
- Cards rounded-2xl soft shadows, clean type. Header: global search, notification bell, Live Lead simulator button, role switcher, checked-in toggle.
- Fully responsive (executive often on phone), skeleton loaders, polished empty states with CTA, Lucide icons only - no emojis in UI.

## 11. DATA & SEED
Seed on first load when localStorage empty (flag in localStorage, Reset reseeds):
- 60 leads across all stages and score bands, 25 customers, 15 quotations, 12 orders, 8 invoices, 10 recovery cases - seeded with realistic past timestamps so dashboards/ageing show real data.
- Users: 1 Admin, 1 Manager, 3 Executives, 1 Back Office.
- 6 products with stock and rates.
- All CRUD via Dexie/localStorage service layer, UI updates instantly.

## 12. DATA MODEL - LOCAL JSON FILES
- users.json - id, name, role, active, checkedIn, lastCheckIn
- leads.json - id(code), company, contact, phoneNormalized, email, city, state, product, variant, expectedValue, source, assignedTo, status, score, nextFollowUpAt, lostReason, possibleDuplicate, createdAt, updatedAt
- timeline.json - id, leadId, type, payload, actorId, at
- followups.json - id, leadId, dueAt, status, note
- quotes.json - QT number, leadId, status, revision, totals, assignedTo, items[]
- orders.json - SO number, quoteId, status, reservation per line, dispatches[]
- invoices.json + payments.json - INV number, orderId, amounts, received, status
- recovery.json - invoiceId, assignedTo, calls[]
- products.json - id, name, rate, onHand, reserved, lowStockAt
- targets.json, audit.json, notifications.json, settings.json, masters.json
- actions.json - dedupKey, entityRef, result (for idempotency)

## 13. BUILD PLAN - PHASES, VERIFIED IN ORDER
Phase 1 - Scaffold + local JSON store + auth/RBAC. Vite+TS scaffold, folder layout, Dexie/localStorage service, seed JSON, role switcher, can() guard, Access Denied, audit trail. Verify: refresh persists, every role sees only its nav.
Phase 2 - Lead core. Inbox, capture form, phone normalization, duplicate flow, round-robin with edge cases, My Leads, lead detail 3-pane, scoring.
Phase 3 - Follow-ups, calls, SLA, notifications, kanban, bulk, duplicates queue.
Phase 4 - Quotations incl. GST logic, revisions, PDF.
Phase 5 - Orders & inventory incl. reservation, partial dispatch, idempotency, exceptions.
Phase 6 - Finance & recovery incl. payments, ageing, recovery workflow.
Phase 7 - Admin center, targets, reports, dashboard polish, README.
After each phase: report what works + demo happy path. Do not start N+1 until N passes.

## 14. ACCEPTANCE CRITERIA
1. npm run dev on 5173, npm run build clean, zero console errors.
2. Full sequence works: Create Lead -> Auto Assign -> Log Call -> Contacted -> Qualified -> Request Quote -> Back Office prepares -> Sent -> Accepted -> Convert to Order -> Approve & Reserve -> Partial Dispatch -> Invoice -> Pay 50% -> Pay rest -> Recovery path -> Closed.
3. Edge cases: no check-in -> unassigned queue, capacity full -> skip, duplicate phone -> merge dialog, stock shortage -> block + exception path, Lost requires reason, Won requires quote/approval, all survive refresh.
4. Role test: executive sees only own leads, manager sees team not admin, back office sees quotes/orders only, admin sees everything.
5. No dead UI. README covers run, roles, workflow, admin guide, and explains this is LOCAL JSON version for checking.
6. Structure: src/pages, src/components, src/store, src/db, src/services, src/utils, src/data/*.json, src/data/seed.ts
