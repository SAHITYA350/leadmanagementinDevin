// Generates the seed JSON files in src/data/. Deterministic: same output every run.
// Dates are absolute ISO strings around ANCHOR; the app shifts them to "now" on first load.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
mkdirSync(OUT, { recursive: true });

const ANCHOR = Date.parse('2026-11-14T06:30:00.000Z'); // 12:00 IST
const HOUR = 3600_000;
const DAY = 24 * HOUR;
const iso = (ms) => new Date(ms).toISOString();
const at = (daysAgo, hour = 0) => ANCHOR - daysAgo * DAY + hour * HOUR;

let s = 2026;
const rand = () => {
  s |= 0;
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pad = (n, w) => String(n).padStart(w, '0');
const istDate = (ms) => new Date(ms + 5.5 * HOUR);
const yymmdd = (ms) => {
  const d = istDate(ms);
  return `${pad(d.getUTCFullYear() % 100, 2)}${pad(d.getUTCMonth() + 1, 2)}${pad(d.getUTCDate(), 2)}`;
};

const base = (createdMs, by, updatedMs = createdMs, updatedBy = by) => ({
  createdAt: iso(createdMs),
  updatedAt: iso(updatedMs),
  createdBy: by,
  updatedBy,
  deletedAt: null,
});

// ---------- users ----------
const users = [
  ['USR-001', 'Yash Admin', 'admin@yashearthing.in', '+919822000001', 'ADMIN', null, false],
  [
    'USR-002',
    'Rajesh Patil',
    'rajesh.patil@yashearthing.in',
    '+919822000002',
    'SALES_MANAGER',
    'USR-001',
    true,
  ],
  [
    'USR-003',
    'Rahul More',
    'rahul.more@yashearthing.in',
    '+919822000003',
    'SALES_EXECUTIVE',
    'USR-002',
    true,
  ],
  [
    'USR-004',
    'Priya Sharma',
    'priya.sharma@yashearthing.in',
    '+919822000004',
    'SALES_EXECUTIVE',
    'USR-002',
    true,
  ],
  [
    'USR-005',
    'Amit Patil',
    'amit.patil@yashearthing.in',
    '+919822000005',
    'SALES_EXECUTIVE',
    'USR-002',
    false,
  ],
  [
    'USR-006',
    'Sneha Deshmukh',
    'sneha.deshmukh@yashearthing.in',
    '+919822000006',
    'BACK_OFFICE',
    'USR-001',
    true,
  ],
].map(([id, name, email, phone, role, managerId, checkedIn]) => ({
  id,
  ...base(at(400), 'SYSTEM'),
  name,
  email,
  phone,
  role,
  managerId,
  active: true,
  checkedIn,
  lastCheckInAt: checkedIn ? iso(at(0, -3)) : iso(at(1, -3)),
  lastCheckOutAt: checkedIn ? iso(at(1, 6)) : iso(at(1, 6)),
  maxActiveLeadsOverride: null,
}));
const EXECS = ['USR-003', 'USR-004', 'USR-005'];

// ---------- products ----------
const products = [
  [
    'PRD-001',
    'YE-CPE-3M',
    'Chemical Pipe-in-Pipe Earth Electrode 3 Mtr',
    'Earth Electrodes',
    '85359090',
    'Nos',
    4500,
    3100,
    180,
    20,
  ],
  [
    'PRD-002',
    'YE-ESE-LA',
    'ESE Lightning Arrester',
    'Lightning Protection',
    '85354010',
    'Nos',
    38500,
    27000,
    24,
    5,
  ],
  [
    'PRD-003',
    'YE-GIS-253',
    'GI Earthing Strip 25x3mm',
    'Strips & Conductors',
    '72123090',
    'Mtr',
    95,
    62,
    3500,
    300,
  ],
  ['PRD-004', 'YE-CEB-01', 'Copper Earth Busbar', 'Busbars', '74071090', 'Nos', 6200, 4300, 60, 10],
  [
    'PRD-005',
    'YE-CEC-25',
    'Chemical Earthing Compound (25 kg bag)',
    'Compounds',
    '38249900',
    'Bag',
    1350,
    820,
    15,
    20,
  ],
  ['PRD-006', 'YE-EPC-PL', 'Polymer Earth Pit Cover', 'Accessories', '39259010', 'Nos', 750, 420, 140, 25],
].map(([id, sku, name, category, hsn, unit, rate, cost, onHand, lowStockAt]) => ({
  id,
  ...base(at(400), 'USR-001'),
  sku,
  name,
  category,
  hsn,
  unit,
  ratePaise: rate * 100,
  costPaise: cost * 100,
  gstRatePct: 18,
  active: true,
  onHand,
  reserved: 0,
  lowStockAt,
}));
const productById = Object.fromEntries(products.map((p) => [p.id, p]));
const qtyRange = {
  'PRD-001': [6, 30],
  'PRD-002': [1, 4],
  'PRD-003': [100, 500],
  'PRD-004': [2, 6],
  'PRD-005': [4, 12],
  'PRD-006': [6, 30],
};

// ---------- companies (25) ----------
const companies = [
  ['Kolte Infra Developers', 'Pune', 'Maharashtra'],
  ['Skyline Telecom Towers Pvt Ltd', 'Mumbai', 'Maharashtra'],
  ['Sahyadri Care Hospitals', 'Pune', 'Maharashtra'],
  ['Deccan Auto Components', 'Pune', 'Maharashtra'],
  ['Nashik Agro Foods Pvt Ltd', 'Nashik', 'Maharashtra'],
  ['Orange City Solar Parks', 'Nagpur', 'Maharashtra'],
  ['Ajanta Packaging Industries', 'Aurangabad', 'Maharashtra'],
  ['Panchganga Textiles', 'Kolhapur', 'Maharashtra'],
  ['Kaas Valley Schools Trust', 'Satara', 'Maharashtra'],
  ['Hinjewadi Tech Park LLP', 'Pune', 'Maharashtra'],
  ['Western Ghats Builders', 'Mumbai', 'Maharashtra'],
  ['Godavari Cold Storage', 'Nashik', 'Maharashtra'],
  ['Vidarbha Steel Rolling Mills', 'Nagpur', 'Maharashtra'],
  ['Marathwada Solar Energy', 'Aurangabad', 'Maharashtra'],
  ['Konkan Hospitals Pvt Ltd', 'Mumbai', 'Maharashtra'],
  ['Shivneri Infra Projects', 'Pune', 'Maharashtra'],
  ['Warana Dairy Products', 'Kolhapur', 'Maharashtra'],
  ['Gujarat Sunrays Solar Pvt Ltd', 'Ahmedabad', 'Gujarat'],
  ['Karnataka Telecom Infra', 'Bengaluru', 'Karnataka'],
  ['Pimpri Precision Castings', 'Pune', 'Maharashtra'],
  ['Thane Data Centre Services', 'Mumbai', 'Maharashtra'],
  ['Satara Engineering Works', 'Satara', 'Maharashtra'],
  ['Nagpur Metro Contractors JV', 'Nagpur', 'Maharashtra'],
  ['Goa Coastal Resorts', 'Panaji', 'Goa'],
  ['Pune Smart Schools Foundation', 'Pune', 'Maharashtra'],
];
const contacts = [
  'Sanjay Kulkarni',
  'Meera Joshi',
  'Anil Deshpande',
  'Kavita Pawar',
  'Vikram Shinde',
  'Neha Gokhale',
  'Suresh Jadhav',
  'Pooja Bhosale',
  'Manoj Chavan',
  'Swati Kale',
  'Rohit Naik',
  'Anjali Mehta',
  'Prakash Gaikwad',
  'Deepa Iyer',
  'Nitin Wagh',
  'Rupali Salunkhe',
  'Ganesh Mane',
  'Shweta Rao',
  'Harish Patel',
  'Lata Nair',
  'Kiran Thakur',
  'Yogesh Sawant',
  'Asha Kadam',
  'Mahesh Gupta',
  'Sunita Ghorpade',
];
const companyKey = (name) =>
  name
    .toLowerCase()
    .replace(/private\s*limited/g, 'pvtltd')
    .replace(/[^a-z0-9]/g, '');

// ---------- scoring ----------
const sourceWeights = {
  REFERRAL: 25,
  WEBSITE: 20,
  DIRECT: 20,
  JUSTDIAL: 15,
  TRADEINDIA: 15,
  EXCEL_IMPORT: 10,
};
const cityTier = {
  Pune: 1,
  Mumbai: 1,
  Bengaluru: 1,
  Ahmedabad: 1,
  Nashik: 2,
  Nagpur: 2,
  Aurangabad: 2,
  Panaji: 2,
  Kolhapur: 3,
  Satara: 3,
};
const valueBands = [
  { minPaise: 1000000_00, points: 25 },
  { minPaise: 500000_00, points: 20 },
  { minPaise: 200000_00, points: 15 },
  { minPaise: 50000_00, points: 10 },
  { minPaise: 0, points: 5 },
];
const tierPoints = { 1: 20, 2: 14, 3: 8 };
function score(source, valuePaise, city, responsePts, fuPts) {
  const breakdown = {
    source: sourceWeights[source],
    value: valueBands.find((b) => valuePaise >= b.minPaise).points,
    cityTier: tierPoints[cityTier[city]],
    responseSpeed: responsePts,
    followups: fuPts,
  };
  return { score: Object.values(breakdown).reduce((a, b) => a + b, 0), scoreBreakdown: breakdown };
}

// ---------- GST ----------
const round = (n) => Math.round(n);
function lineTotal(qty, ratePaise, discountPct) {
  return round(qty * ratePaise * (1 - discountPct / 100));
}
function totals(items, state, freightPaise) {
  const subtotalPaise = items.reduce((a, i) => a + i.qty * i.ratePaise, 0);
  const taxablePaise = items.reduce((a, i) => a + i.lineTotalPaise, 0);
  const intra = state === 'Maharashtra';
  const cgstPaise = intra ? round(taxablePaise * 0.09) : 0;
  const sgstPaise = intra ? round(taxablePaise * 0.09) : 0;
  const igstPaise = intra ? 0 : round(taxablePaise * 0.18);
  return {
    subtotalPaise,
    discountPaise: subtotalPaise - taxablePaise,
    taxablePaise,
    cgstPaise,
    sgstPaise,
    igstPaise,
    freightPaise,
    grandTotalPaise: taxablePaise + cgstPaise + sgstPaise + igstPaise + freightPaise,
  };
}

// ---------- leads (60) ----------
// status plan: 12 WON (orders), 1 NEGOTIATION, 2 QUOTE_REQUESTED, 10 QUALIFIED, 13 CONTACTED, 14 NEW (4 unassigned), 8 LOST
const plan = [
  ...Array(12).fill('WON'),
  'NEGOTIATION',
  'QUOTE_REQUESTED',
  'QUOTE_REQUESTED',
  ...Array(10).fill('QUALIFIED'),
  ...Array(13).fill('CONTACTED'),
  ...Array(14).fill('NEW'),
  ...Array(8).fill('LOST'),
];
// lead creation (days ago) for the 12 WON leads, derived from their invoice/order timeline below
const wonCreatedDaysAgo = [120, 85, 78, 62, 52, 48, 19, 24, 21, 16, 14, 30];
const lostReasons = [
  'PRICE_HIGH',
  'COMPETITOR',
  'NO_REQUIREMENT',
  'NO_RESPONSE',
  'BUDGET_ISSUE',
  'OTHER',
  'PRICE_HIGH',
  'COMPETITOR',
];
const lostNotes = {
  PRICE_HIGH: 'Customer felt our electrode rate is 12% above local supplier.',
  COMPETITOR: 'Went with an existing vendor who supplies their other sites.',
  NO_REQUIREMENT: 'Project postponed to next financial year.',
  NO_RESPONSE: 'No response after 5 calls and 2 WhatsApp messages.',
  BUDGET_ISSUE: 'Budget cut for electrical works this quarter.',
  OTHER: 'Customer asked for a product we do not manufacture (UPS earthing kit).',
};
const sources = ['JUSTDIAL', 'TRADEINDIA', 'WEBSITE', 'REFERRAL', 'DIRECT', 'EXCEL_IMPORT'];
const usedPhones = new Set();
function newPhone() {
  for (;;) {
    const p = `${pick(['9', '8', '7'])}${pad(int(0, 999999999), 9)}`;
    if (!usedPhones.has(p)) {
      usedPhones.add(p);
      return p;
    }
  }
}
const rawFormats = [
  (p) => p,
  (p) => `0${p}`,
  (p) => `+91 ${p.slice(0, 5)} ${p.slice(5)}`,
  (p) => `91${p}`,
  (p) => `${p.slice(0, 5)}-${p.slice(5)}`,
];
const rawQueries = {
  JUSTDIAL: 'Need chemical earthing for new building, please call',
  TRADEINDIA: 'Looking for bulk price of GI strip and electrodes',
  WEBSITE: 'Enquiry from website contact form',
  REFERRAL: null,
  DIRECT: null,
  EXCEL_IMPORT: null,
};
const productInterest = ['PRD-001', 'PRD-002', 'PRD-003', 'PRD-004', 'PRD-005', 'PRD-006'];
const seqByDay = {};
const leads = [];
let unassignedLeft = 4;
let rr = 0;
plan.forEach((status, i) => {
  const [company, city, state] = companies[i % 25];
  let createdDaysAgo;
  if (status === 'WON') createdDaysAgo = wonCreatedDaysAgo[i];
  else if (status === 'NEW') createdDaysAgo = i % 3 === 0 ? 0 : int(1, 3);
  else if (status === 'LOST') createdDaysAgo = int(20, 70);
  else createdDaysAgo = int(3, 25);
  const createdMs = at(createdDaysAgo, status === 'NEW' && createdDaysAgo === 0 ? -int(1, 5) : -int(0, 4));
  const day = yymmdd(createdMs);
  seqByDay[day] = (seqByDay[day] ?? 0) + 1;
  const id = `LD-${day}-${pad(seqByDay[day], 3)}`;
  const phone = newPhone();
  const source = sources[i % sources.length];
  const unassigned = status === 'NEW' && unassignedLeft > 0 && i >= 48;
  if (unassigned) unassignedLeft--;
  const assignedTo = unassigned ? null : EXECS[rr++ % 3];
  const assignedAt = assignedTo ? createdMs + 5 * 60_000 : null;
  const contacted = status !== 'NEW';
  const firstContactedAt = contacted ? createdMs + int(1, 4) * HOUR : null;
  const responsePts = !contacted ? 0 : firstContactedAt - assignedAt <= 2 * HOUR ? 15 : 4;
  const fuPts = {
    WON: 15,
    NEGOTIATION: 15,
    QUOTE_REQUESTED: 14,
    QUALIFIED: 13,
    CONTACTED: 6,
    NEW: 0,
    LOST: 4,
  }[status];
  const productId = productInterest[i % 6];
  const expectedValuePaise = [int(20, 60), int(100, 400), int(500, 1500)][i % 3] * 1000_00;
  const sc = score(source, expectedValuePaise, city, responsePts, fuPts);
  const slaDueAt = assignedAt ? assignedAt + 2 * HOUR : null;
  const breached = status === 'NEW' && assignedAt && ANCHOR > slaDueAt;
  const lostReason = status === 'LOST' ? lostReasons[i - 52] : null;
  leads.push({
    id,
    ...base(
      createdMs,
      source === 'DIRECT' ? 'USR-002' : 'SYSTEM',
      createdMs + (contacted ? 2 * DAY : HOUR),
      assignedTo ?? 'SYSTEM',
    ),
    company,
    companyKey: companyKey(company),
    contactPerson: contacts[i % 25],
    phoneRaw: rawFormats[i % rawFormats.length](phone),
    phoneNormalized: `+91${phone}`,
    alternatePhones: [],
    email: `${contacts[i % 25].split(' ')[0].toLowerCase()}@${companyKey(company).slice(0, 14)}.in`,
    city,
    state,
    address: null,
    gstin: i % 4 === 0 ? `27AABCY${pad(1000 + i, 4)}K1Z${i % 9}` : i % 11 === 5 ? '27ABCDE1234' : null,
    gstinValid: i % 4 === 0 ? true : i % 11 === 5 ? false : null,
    productId,
    variant: productId === 'PRD-001' ? '3 Mtr / 80mm' : null,
    expectedValuePaise,
    source,
    rawQuery: rawQueries[source],
    notes: null,
    status,
    assignedTo,
    assignedAt: assignedAt ? iso(assignedAt) : null,
    ...sc,
    nextFollowUpAt: null,
    firstContactedAt: firstContactedAt ? iso(firstContactedAt) : null,
    slaDueAt: slaDueAt ? iso(slaDueAt) : null,
    slaBreachedAt: breached ? iso(slaDueAt + 60_000) : null,
    wonAt: null,
    wonQuotationId: null,
    wonApproval: null,
    wonApprovalRequest: null,
    lostAt: status === 'LOST' ? iso(createdMs + 9 * DAY) : null,
    lostReason,
    lostNotes: lostReason ? lostNotes[lostReason] : null,
    possibleDuplicate: false,
    duplicateOfId: null,
    duplicateResolvedAt: null,
    mergedIntoId: null,
  });
});
// two "Create Anyway" duplicates for the duplicates queue
for (const [dupIdx, origIdx] of [
  [41, 30],
  [44, 33],
]) {
  leads[dupIdx].phoneNormalized = leads[origIdx].phoneNormalized;
  leads[dupIdx].phoneRaw = leads[origIdx].phoneNormalized.slice(3);
  leads[dupIdx].possibleDuplicate = true;
  leads[dupIdx].duplicateOfId = leads[origIdx].id;
}

// ---------- quotations (15) ----------
const DEFAULT_TERMS = [
  'Prices are ex-works Pune. Freight extra as mentioned.',
  'Payment: 50% advance, balance within 30 days of invoice.',
  'Delivery: 7-10 working days from order confirmation.',
  'Quotation valid for 30 days from the date of issue.',
  'Installation charges, if required, will be quoted separately.',
];
const quotes = [];
function makeItems(n, forceProducts = []) {
  const ids = [...forceProducts];
  while (ids.length < n) {
    const p = pick(productInterest);
    if (!ids.includes(p)) ids.push(p);
  }
  return ids.map((pid, k) => {
    const p = productById[pid];
    const [a, b] = qtyRange[pid];
    const qty = int(a, b);
    const discountPct = pick([0, 0, 5, 7.5, 10]);
    return {
      lineId: `L${k + 1}`,
      productId: pid,
      productName: p.name,
      hsn: p.hsn,
      unit: p.unit,
      qty,
      ratePaise: p.ratePaise,
      discountPct,
      lineTotalPaise: lineTotal(qty, p.ratePaise, discountPct),
    };
  });
}
const quoteStatusPlan = [...Array(12).fill('ACCEPTED'), 'SENT', 'UNDER_REVIEW', 'DRAFT'];
quoteStatusPlan.forEach((status, q) => {
  const lead = leads[q]; // leads 0..11 WON, 12 NEGOTIATION, 13-14 QUOTE_REQUESTED
  const created = Date.parse(lead.createdAt) + 3 * DAY;
  // q9 => pending order with Chemical Compound shortage (18 bags needed, 15 on hand)
  const force = q === 9 ? ['PRD-005'] : q === 7 ? ['PRD-002'] : [];
  const items = makeItems(q === 9 ? 1 : int(1, 3), force);
  if (q === 9) {
    items[0].qty = 18;
    items[0].lineTotalPaise = lineTotal(18, items[0].ratePaise, items[0].discountPct);
  }
  const freightPaise = pick([0, 1500_00, 2500_00, 3500_00]);
  const t = totals(items, lead.state, freightPaise);
  const number = `QT-2026-${pad(q + 1, 4)}`;
  const sentAt = ['ACCEPTED', 'SENT'].includes(status) ? created + 2 * DAY : null;
  const acceptedAt = status === 'ACCEPTED' ? created + 5 * DAY : null;
  quotes.push({
    id: `${number}-R0`,
    ...base(created, lead.assignedTo, acceptedAt ?? sentAt ?? created + HOUR, 'USR-006'),
    number,
    revision: 0,
    isLatest: true,
    previousRevisionId: null,
    leadId: lead.id,
    requestedBy: lead.assignedTo,
    requestNote: 'Please prepare quotation as discussed on call.',
    assignedTo: 'USR-006',
    status,
    customerState: lead.state,
    taxMode: lead.state === 'Maharashtra' ? 'INTRA' : 'INTER',
    items,
    freightPaise,
    totals: t,
    validUntil: iso(created + 30 * DAY),
    terms: DEFAULT_TERMS.join('\n'),
    sentAt: sentAt ? iso(sentAt) : null,
    acceptedAt: acceptedAt ? iso(acceptedAt) : null,
    rejectedAt: null,
    rejectionReason: null,
    clonedFromId: null,
    orderId: null,
  });
  if (status === 'ACCEPTED') {
    lead.expectedValuePaise = t.grandTotalPaise;
    lead.wonAt = iso(acceptedAt);
    lead.wonQuotationId = `${number}-R0`;
    Object.assign(
      lead,
      score(lead.source, t.grandTotalPaise, lead.city, lead.scoreBreakdown.responseSpeed, 15),
    );
  }
});

// ---------- orders (12) + invoices (8) ----------
const orderPlan = [
  [
    'DELIVERED',
    [
      { daysAgo: 95, part: 'first' },
      { daysAgo: 75, part: 'rest' },
    ],
  ],
  ['DELIVERED', [{ daysAgo: 70, part: 'all' }]],
  ['DELIVERED', [{ daysAgo: 64, part: 'all' }]],
  ['DISPATCHED', [{ daysAgo: 48, part: 'all' }]],
  ['DISPATCHED', [{ daysAgo: 38, part: 'all' }]],
  ['PARTIALLY_DISPATCHED', [{ daysAgo: 34, part: 'first' }]],
  ['PARTIALLY_DISPATCHED', [{ daysAgo: 5, part: 'first' }]],
  ['APPROVED', []],
  ['APPROVED', []],
  ['PENDING', []],
  ['PENDING', []],
  ['CANCELLED', []],
];
const orders = [];
const invoices = [];
const invSeq = {};
let tripSeq = 0;
orderPlan.forEach(([status, invPlan], o) => {
  const quote = quotes[o];
  const lead = leads[o];
  const orderMs = Date.parse(quote.acceptedAt) + DAY;
  const number = `SO-2026-${pad(o + 1, 4)}`;
  quote.orderId = number;
  const lines = quote.items.map((it) => ({
    lineId: it.lineId,
    productId: it.productId,
    productName: it.productName,
    qty: it.qty,
    ratePaise: it.ratePaise,
    discountPct: it.discountPct,
    reservedQty: 0,
    shippedQty: 0,
    invoicedQty: 0,
  }));
  const approved = !['PENDING', 'CANCELLED'].includes(status);
  const approvedMs = orderMs + 4 * HOUR;
  const dispatches = [];
  for (const ip of invPlan) {
    const tripMs = at(ip.daysAgo, -2);
    const dlines = lines
      .map((l) => {
        const pending = l.qty - l.shippedQty;
        const qty = ip.part === 'first' ? Math.max(1, Math.floor(l.qty / 2)) : pending;
        return { lineId: l.lineId, qty: Math.min(qty, pending) };
      })
      .filter((d) => d.qty > 0);
    dlines.forEach((d) => {
      const l = lines.find((x) => x.lineId === d.lineId);
      l.shippedQty += d.qty;
      l.invoicedQty += d.qty;
    });
    const d = istDate(tripMs);
    const ym = `${pad(d.getUTCFullYear() % 100, 2)}${pad(d.getUTCMonth() + 1, 2)}`;
    invSeq[ym] = (invSeq[ym] ?? 0) + 1;
    const invId = `INV-${ym}-${pad(invSeq[ym], 4)}`;
    tripSeq++;
    const dispatchId = `DSP-${pad(tripSeq, 4)}`;
    const vehicleNo = `MH12${pick(['AB', 'KT', 'PQ', 'XY'])}${int(1000, 9999)}`;
    const ewayBillNo = `${int(1000, 9999)}${int(10000000, 99999999)}`;
    dispatches.push({
      dispatchId,
      tripNo: dispatches.length + 1,
      at: iso(tripMs),
      by: 'USR-006',
      vehicleNo,
      ewayBillNo,
      lines: dlines,
      invoiceId: invId,
    });
    const invLines = dlines.map((dl) => {
      const qi = quote.items.find((x) => x.lineId === dl.lineId);
      return { ...qi, qty: dl.qty, lineTotalPaise: lineTotal(dl.qty, qi.ratePaise, qi.discountPct) };
    });
    const freight = invoices.some((x) => x.orderId === number) ? 0 : quote.freightPaise;
    const t = totals(invLines, lead.state, freight);
    invoices.push({
      id: invId,
      ...base(tripMs, 'USR-006'),
      orderId: number,
      leadId: lead.id,
      dispatchIds: [dispatchId],
      invoiceDate: iso(tripMs),
      taxMode: quote.taxMode,
      lines: invLines,
      totals: t,
      ewayBillNo,
      vehicleNo,
      receivedPaise: 0,
      balancePaise: t.grandTotalPaise,
      status: 'PENDING',
    });
  }
  for (const l of lines) {
    if (['APPROVED', 'PARTIALLY_DISPATCHED'].includes(status)) l.reservedQty = l.qty - l.shippedQty;
  }
  const lastTrip = dispatches.length ? Date.parse(dispatches[dispatches.length - 1].at) : null;
  orders.push({
    id: number,
    ...base(
      orderMs,
      lead.assignedTo,
      lastTrip ?? (approved ? approvedMs : orderMs),
      approved ? 'USR-006' : lead.assignedTo,
    ),
    quotationId: quote.id,
    leadId: lead.id,
    status,
    lines,
    totals: quote.totals,
    approvedAt: approved ? iso(approvedMs) : null,
    approvedBy: approved ? 'USR-006' : null,
    exception: null,
    dispatches,
    deliveredAt: status === 'DELIVERED' ? iso(lastTrip + 3 * DAY) : null,
    cancelledAt: status === 'CANCELLED' ? iso(orderMs + 2 * DAY) : null,
    cancelReason:
      status === 'CANCELLED' ? 'Customer changed site plan; order cancelled before dispatch.' : null,
  });
});
for (const p of products) {
  p.reserved = orders.reduce(
    (a, o) => a + o.lines.filter((l) => l.productId === p.id).reduce((b, l) => b + l.reservedQty, 0),
    0,
  );
  if (p.reserved > p.onHand) throw new Error(`reserved > onHand for ${p.id}`);
}

// ---------- payments + recovery (10 cases) ----------
const payments = [];
const recovery = [];
let paySeq = 0;
let rcSeq = 0;
const pctOf = (invc, pct) => Math.round((invc.totals.grandTotalPaise * pct) / 100);
function pay(invc, amountPaise, ms, mode, recoveryId = null) {
  paySeq++;
  payments.push({
    id: `PAY-${pad(paySeq, 4)}`,
    ...base(ms, 'USR-006'),
    invoiceId: invc.id,
    amountPaise,
    mode,
    reference: mode === 'CASH' ? null : `${mode}${int(100000, 999999)}`,
    receivedAt: iso(ms),
    recoveryId,
  });
  invc.receivedPaise += amountPaise;
  invc.balancePaise = invc.totals.grandTotalPaise - invc.receivedPaise;
  invc.status = invc.balancePaise === 0 ? 'FULL_RECEIVED' : 'PARTIAL_RECEIVED';
  invc.updatedAt = iso(ms);
}
function rcase(invc, trigger, status, createdMs, calls, extra = {}) {
  rcSeq++;
  const id = `RC-${pad(rcSeq, 4)}`;
  const lastCall = calls.length ? Date.parse(calls[calls.length - 1].at) : createdMs;
  recovery.push({
    id,
    ...base(createdMs, trigger === 'AUTO_OVERDUE' ? 'SYSTEM' : 'USR-006', lastCall, 'USR-006'),
    invoiceId: invc.id,
    leadId: invc.leadId,
    assignedTo: 'USR-006',
    trigger,
    status,
    calls: calls.map((c, k) => ({
      id: `${id}-C${k + 1}`,
      by: 'USR-006',
      promisedAmountPaise: null,
      promiseDate: null,
      notes: null,
      ...c,
    })),
    nextActionAt: null,
    recoveredAt: null,
    ...extra,
  });
  return id;
}
const inv = invoices;
const invDay = (i, d) => Date.parse(inv[i].invoiceDate) + d * DAY;
// INV 1: 50% paid, then recovered in full
pay(inv[0], pctOf(inv[0], 50), invDay(0, 10), 'NEFT');
{
  const id = rcase(
    inv[0],
    'AUTO_OVERDUE',
    'RECOVERED',
    invDay(0, 31),
    [
      { at: iso(invDay(0, 32)), outcome: 'CALL_AGAIN', notes: 'Accounts head on leave, call next week.' },
      { at: iso(invDay(0, 40)), outcome: 'PAID_IN_FULL', notes: 'RTGS done for full balance.' },
    ],
    { recoveredAt: iso(invDay(0, 40)) },
  );
  pay(inv[0], inv[0].balancePaise, invDay(0, 40), 'RTGS', id);
}
// INV 2: recovered in full
{
  const id = rcase(
    inv[1],
    'AUTO_OVERDUE',
    'RECOVERED',
    invDay(1, 31),
    [{ at: iso(invDay(1, 33)), outcome: 'PAID_IN_FULL', notes: 'Cheque collected from site office.' }],
    { recoveredAt: iso(invDay(1, 33)) },
  );
  pay(inv[1], inv[1].balancePaise, invDay(1, 33), 'CHEQUE', id);
}
// INV 3: 50% paid, earlier manual case closed, now promised
pay(inv[2], pctOf(inv[2], 50), invDay(2, 3), 'UPI');
rcase(inv[2], 'MANUAL', 'CLOSED', invDay(2, 15), [
  {
    at: iso(invDay(2, 15)),
    outcome: 'CALL_AGAIN',
    notes: 'Customer asked for a copy of the E-Way bill. Sent; case closed.',
  },
]);
rcase(
  inv[2],
  'AUTO_OVERDUE',
  'PROMISED',
  invDay(2, 31),
  [
    {
      at: iso(at(2, -1)),
      outcome: 'PROMISE_TO_PAY',
      promisedAmountPaise: inv[2].balancePaise,
      promiseDate: iso(at(-5)),
      notes: 'Will release balance after month-end closing.',
    },
  ],
  { nextActionAt: iso(at(-5)) },
);
// INV 4: unpaid, earlier manual case closed, now disputed
rcase(inv[3], 'MANUAL', 'CLOSED', invDay(3, 18), [
  {
    at: iso(invDay(3, 18)),
    outcome: 'CALL_AGAIN',
    notes: 'Purchase team needed GST invoice re-sent. Done; case closed.',
  },
]);
rcase(
  inv[3],
  'AUTO_OVERDUE',
  'DISPUTED',
  invDay(3, 31),
  [
    {
      at: iso(at(6)),
      outcome: 'DISPUTE',
      notes: 'Customer says 2 electrodes were damaged in transit. Manager to review.',
    },
  ],
  { nextActionAt: iso(at(-1)) },
);
// INV 5: 30% paid, earlier manual case closed, now open
pay(inv[4], pctOf(inv[4], 30), invDay(4, 7), 'NEFT');
rcase(inv[4], 'MANUAL', 'CLOSED', invDay(4, 20), [
  { at: iso(invDay(4, 20)), outcome: 'CALL_AGAIN', notes: 'Reminder call before due date. Closed.' },
]);
rcase(
  inv[4],
  'AUTO_OVERDUE',
  'OPEN',
  invDay(4, 31),
  [{ at: iso(at(3)), outcome: 'UNREACHABLE', notes: 'Phone switched off.' }],
  { nextActionAt: iso(at(0, 3)) },
);
// INV 6 and INV 7: unpaid, open
rcase(inv[5], 'AUTO_OVERDUE', 'OPEN', invDay(5, 31), [], { nextActionAt: iso(at(0, 2)) });
rcase(inv[6], 'AUTO_OVERDUE', 'OPEN', invDay(6, 31), [], { nextActionAt: iso(at(-1)) });
// INV 8: 25% advance, not overdue yet
pay(inv[7], pctOf(inv[7], 25), invDay(7, 1), 'UPI');

// ---------- targets ----------
const targets = [];
let tgSeq = 0;
for (const userId of EXECS) {
  for (const [periodType, periodKey, rev, calls, conv] of [
    ['MONTHLY', '2026-11', 800000_00, 120, 25],
    ['MONTHLY', '2026-10', 750000_00, 110, 25],
    ['QUARTERLY', '2026-Q4', 2400000_00, 360, 25],
  ]) {
    tgSeq++;
    targets.push({
      id: `TG-${pad(tgSeq, 3)}`,
      ...base(at(45), 'USR-002'),
      userId,
      periodType,
      periodKey,
      revenueTargetPaise: rev,
      callsTarget: calls,
      conversionTargetPct: conv,
    });
  }
}

// ---------- audit ----------
const audit = [
  {
    id: 'AU-0001',
    at: iso(at(400)),
    actorId: 'SYSTEM',
    actorRole: 'SYSTEM',
    action: 'CREATE',
    entityType: 'settings',
    entityId: 'settings',
    before: null,
    after: { note: 'Initial company setup' },
    reason: null,
    actionId: null,
  },
  {
    id: 'AU-0002',
    at: iso(at(45)),
    actorId: 'USR-002',
    actorRole: 'SALES_MANAGER',
    action: 'CREATE',
    entityType: 'target',
    entityId: 'TG-001',
    before: null,
    after: { periodKey: '2026-11' },
    reason: null,
    actionId: null,
  },
  {
    id: 'AU-0003',
    at: iso(at(10)),
    actorId: 'USR-006',
    actorRole: 'BACK_OFFICE',
    action: 'STOCK_EDIT',
    entityType: 'product',
    entityId: 'PRD-005',
    before: { onHand: 40 },
    after: { onHand: 15 },
    reason: 'Physical stock count: 25 bags damaged by water leakage',
    actionId: null,
  },
  {
    id: 'AU-0004',
    at: iso(at(1, -3)),
    actorId: 'USR-005',
    actorRole: 'SALES_EXECUTIVE',
    action: 'CHECK_OUT',
    entityType: 'user',
    entityId: 'USR-005',
    before: { checkedIn: true },
    after: { checkedIn: false },
    reason: null,
    actionId: null,
  },
];

// ---------- settings ----------
const settings = {
  company: {
    name: 'Yash Earthing Solutions Pvt Ltd',
    address: 'Plot 14, MIDC Bhosari, Pune, Maharashtra 411026',
    gstin: '27AABCY1234K1Z5',
    state: 'Maharashtra',
    phone: '+912027120000',
    email: 'sales@yashearthing.in',
    bank: { name: 'HDFC Bank', account: '50200012345678', ifsc: 'HDFC0001234', branch: 'Bhosari, Pune' },
    quoteTerms: DEFAULT_TERMS,
  },
  assignment: {
    roundRobinEnabled: true,
    checkedInOnly: true,
    maxActiveLeadsPerExec: 15,
    slaHours: 2,
    rrPointerExecutive: 'USR-005',
    rrPointerBackOffice: 'USR-006',
  },
  scoring: { sourceWeights, valueBands, cityTiers: cityTier },
  inventory: { defaultLowStockAt: 20 },
  finance: { recoveryAfterDays: 30, gstOnFreight: false },
  simulator: { autoMode: false, intervalSec: 20 },
  permissions: {},
  masters: {
    leadSources: sources,
    lostReasons: ['PRICE_HIGH', 'COMPETITOR', 'NO_REQUIREMENT', 'NO_RESPONSE', 'BUDGET_ISSUE', 'OTHER'],
    cities: [...new Set(companies.map(([, c, st]) => `${c}|${st}`))].map((k) => {
      const [name, state] = k.split('|');
      return { name, state, tier: cityTier[name] };
    }),
    states: ['Maharashtra', 'Gujarat', 'Karnataka', 'Goa', 'Madhya Pradesh', 'Telangana', 'Delhi'],
  },
  anchorDate: iso(ANCHOR),
  seed: { seedVersion: 1, seededAt: null },
};

const files = {
  users,
  products,
  leads,
  quotes,
  orders,
  invoices,
  payments,
  recovery,
  targets,
  audit,
  settings,
};
for (const [name, data] of Object.entries(files)) {
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify(data, null, 2) + '\n');
}
console.log(
  Object.entries(files)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.length : 'object'}`)
    .join(', '),
  `| companies: ${new Set(leads.map((l) => l.company)).size}`,
);
