export type ISODate = string;
export type Paise = number;

export const ROLES = ['ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'BACK_OFFICE'] as const;
export type Role = (typeof ROLES)[number];
export type ActorRole = Role | 'SYSTEM';

export interface Base {
  id: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  createdBy: string;
  updatedBy: string;
  deletedAt: ISODate | null;
}

export interface User extends Base {
  name: string;
  email: string;
  phone: string;
  role: Role;
  managerId: string | null;
  active: boolean;
  checkedIn: boolean;
  lastCheckInAt: ISODate | null;
  lastCheckOutAt: ISODate | null;
  maxActiveLeadsOverride: number | null;
}

export const LEAD_STATUSES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'QUOTE_REQUESTED',
  'NEGOTIATION',
  'WON',
  'LOST',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const LEAD_SOURCES = [
  'DIRECT',
  'JUSTDIAL',
  'TRADEINDIA',
  'WEBSITE',
  'REFERRAL',
  'EXCEL_IMPORT',
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];
export const LOST_REASONS = [
  'PRICE_HIGH',
  'COMPETITOR',
  'NO_REQUIREMENT',
  'NO_RESPONSE',
  'BUDGET_ISSUE',
  'OTHER',
] as const;
export type LostReason = (typeof LOST_REASONS)[number];

export interface ScoreBreakdown {
  source: number;
  value: number;
  cityTier: number;
  responseSpeed: number;
  followups: number;
}

export interface Lead extends Base {
  company: string;
  companyKey: string;
  contactPerson: string;
  phoneRaw: string;
  phoneNormalized: string;
  alternatePhones: string[];
  email: string | null;
  city: string;
  state: string;
  address: string | null;
  gstin: string | null;
  gstinValid: boolean | null;
  productId: string | null;
  variant: string | null;
  expectedValuePaise: Paise;
  source: LeadSource;
  rawQuery: string | null;
  notes: string | null;
  status: LeadStatus;
  assignedTo: string | null;
  assignedAt: ISODate | null;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  nextFollowUpAt: ISODate | null;
  firstContactedAt: ISODate | null;
  slaDueAt: ISODate | null;
  slaBreachedAt: ISODate | null;
  wonAt: ISODate | null;
  wonQuotationId: string | null;
  wonApproval: { approvedBy: string; reason: string; at: ISODate } | null;
  wonApprovalRequest: { requestedBy: string; reason: string; at: ISODate } | null;
  lostAt: ISODate | null;
  lostReason: LostReason | null;
  lostNotes: string | null;
  possibleDuplicate: boolean;
  duplicateOfId: string | null;
  duplicateResolvedAt: ISODate | null;
  mergedIntoId: string | null;
}

export type TimelineType =
  | 'CREATED'
  | 'STATUS_CHANGED'
  | 'ASSIGNED'
  | 'REASSIGNED'
  | 'UNASSIGNED'
  | 'CALL_LOGGED'
  | 'NOTE'
  | 'FOLLOWUP_CREATED'
  | 'FOLLOWUP_DONE'
  | 'FOLLOWUP_RESCHEDULED'
  | 'FOLLOWUP_SNOOZED'
  | 'QUOTE_REQUESTED'
  | 'QUOTE_STATUS'
  | 'ORDER_CREATED'
  | 'INVOICE_CREATED'
  | 'PAYMENT_RECEIVED'
  | 'MERGED'
  | 'DUPLICATE_FLAGGED'
  | 'SLA_BREACHED'
  | 'WON_APPROVAL_REQUESTED'
  | 'REOPENED'
  | 'SCORE_CHANGED';

export interface TimelineEntry {
  id: string;
  leadId: string;
  type: TimelineType;
  payload: Record<string, unknown>;
  visibility: 'PUBLIC' | 'PRIVATE';
  actorId: string;
  actorRole: ActorRole;
  at: ISODate;
}

export interface FollowUp extends Base {
  leadId: string;
  assignedTo: string;
  dueAt: ISODate;
  type: 'CALL' | 'VISIT' | 'WHATSAPP' | 'EMAIL';
  status: 'PENDING' | 'DONE' | 'CANCELLED';
  note: string | null;
  rescheduleCount: number;
  snoozedUntil: ISODate | null;
  completedAt: ISODate | null;
  completedBy: string | null;
  outcomeNote: string | null;
  overdueNotifiedAt: ISODate | null;
}

export type CallOutcome = 'CONNECTED' | 'BUSY' | 'CALLBACK_REQUESTED' | 'INVALID_NUMBER' | 'NOT_REACHABLE';
export interface Call extends Base {
  leadId: string;
  userId: string;
  outcome: CallOutcome;
  durationSec: number;
  notes: string | null;
  calledAt: ISODate;
  nextFollowUpId: string | null;
}

export interface LineItem {
  lineId: string;
  productId: string;
  productName: string;
  hsn: string;
  unit: string;
  qty: number;
  ratePaise: Paise;
  discountPct: number;
  lineTotalPaise: Paise;
}

export interface Totals {
  subtotalPaise: Paise;
  discountPaise: Paise;
  taxablePaise: Paise;
  cgstPaise: Paise;
  sgstPaise: Paise;
  igstPaise: Paise;
  freightPaise: Paise;
  grandTotalPaise: Paise;
}

export const QUOTE_STATUSES = [
  'DRAFT',
  'UNDER_REVIEW',
  'READY',
  'SENT',
  'ACCEPTED',
  'REVISED',
  'REJECTED',
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
export type TaxMode = 'INTRA' | 'INTER';

export interface Quotation extends Base {
  number: string;
  revision: number;
  isLatest: boolean;
  previousRevisionId: string | null;
  leadId: string;
  requestedBy: string;
  requestNote: string | null;
  assignedTo: string;
  status: QuoteStatus;
  customerState: string;
  taxMode: TaxMode;
  items: LineItem[];
  freightPaise: Paise;
  totals: Totals;
  validUntil: ISODate;
  terms: string;
  sentAt: ISODate | null;
  acceptedAt: ISODate | null;
  rejectedAt: ISODate | null;
  rejectionReason: string | null;
  clonedFromId: string | null;
  orderId: string | null;
}

export const ORDER_STATUSES = [
  'PENDING',
  'APPROVED',
  'PARTIALLY_DISPATCHED',
  'DISPATCHED',
  'DELIVERED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderLine {
  lineId: string;
  productId: string;
  productName: string;
  qty: number;
  ratePaise: Paise;
  discountPct: number;
  reservedQty: number;
  shippedQty: number;
  invoicedQty: number;
}

export interface Dispatch {
  dispatchId: string;
  tripNo: number;
  at: ISODate;
  by: string;
  vehicleNo: string | null;
  ewayBillNo: string | null;
  lines: { lineId: string; qty: number }[];
  invoiceId: string | null;
}

export interface Order extends Base {
  quotationId: string;
  leadId: string;
  status: OrderStatus;
  lines: OrderLine[];
  totals: Totals;
  approvedAt: ISODate | null;
  approvedBy: string | null;
  exception: {
    approvedBy: string;
    reason: string;
    at: ISODate;
    shortages: { lineId: string; shortQty: number }[];
  } | null;
  dispatches: Dispatch[];
  deliveredAt: ISODate | null;
  cancelledAt: ISODate | null;
  cancelReason: string | null;
}

export interface Product extends Base {
  sku: string;
  name: string;
  category: string;
  hsn: string;
  unit: string;
  ratePaise: Paise;
  costPaise: Paise;
  gstRatePct: number;
  active: boolean;
  onHand: number;
  reserved: number;
  lowStockAt: number;
}

export type InvoiceStatus = 'PENDING' | 'PARTIAL_RECEIVED' | 'FULL_RECEIVED';
export interface Invoice extends Base {
  orderId: string;
  leadId: string;
  dispatchIds: string[];
  invoiceDate: ISODate;
  taxMode: TaxMode;
  lines: LineItem[];
  totals: Totals;
  ewayBillNo: string | null;
  vehicleNo: string | null;
  receivedPaise: Paise;
  balancePaise: Paise;
  status: InvoiceStatus;
}

export type PaymentMode = 'CASH' | 'NEFT' | 'RTGS' | 'UPI' | 'CHEQUE';
export interface Payment extends Base {
  invoiceId: string;
  amountPaise: Paise;
  mode: PaymentMode;
  reference: string | null;
  receivedAt: ISODate;
  recoveryId: string | null;
}

export type RecoveryStatus = 'OPEN' | 'PROMISED' | 'DISPUTED' | 'RECOVERED' | 'CLOSED';
export type RecoveryOutcome = 'PROMISE_TO_PAY' | 'CALL_AGAIN' | 'DISPUTE' | 'PAID_IN_FULL' | 'UNREACHABLE';
export interface RecoveryCall {
  id: string;
  at: ISODate;
  by: string;
  outcome: RecoveryOutcome;
  promisedAmountPaise: Paise | null;
  promiseDate: ISODate | null;
  notes: string | null;
}
export interface RecoveryCase extends Base {
  invoiceId: string;
  leadId: string;
  assignedTo: string;
  trigger: 'AUTO_OVERDUE' | 'MANUAL';
  status: RecoveryStatus;
  calls: RecoveryCall[];
  nextActionAt: ISODate | null;
  recoveredAt: ISODate | null;
}

export interface Target extends Base {
  userId: string;
  periodType: 'MONTHLY' | 'QUARTERLY';
  periodKey: string;
  revenueTargetPaise: Paise;
  callsTarget: number;
  conversionTargetPct: number;
}

export type NotificationType =
  | 'LEAD_ASSIGNED'
  | 'LEAD_UNASSIGNED'
  | 'SLA_BREACH'
  | 'FOLLOWUP_OVERDUE'
  | 'QUOTE_REQUESTED'
  | 'QUOTE_STATUS'
  | 'PAYMENT_OVERDUE'
  | 'WON_APPROVAL_REQUESTED'
  | 'NEEDS_ATTENTION'
  | 'LOW_STOCK'
  | 'DATA_RECOVERED';
export interface AppNotification extends Base {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  link: string;
  read: boolean;
  readAt: ISODate | null;
  dedupKey: string;
}

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'RESTORE'
  | 'STATUS_CHANGE'
  | 'ASSIGN'
  | 'REASSIGN'
  | 'STOCK_EDIT'
  | 'EXCEPTION_APPROVAL'
  | 'PERMISSION_CHANGE'
  | 'SETTINGS_CHANGE'
  | 'IMPORT'
  | 'EXPORT'
  | 'RESET'
  | 'LOGIN'
  | 'CHECK_IN'
  | 'CHECK_OUT';
export interface AuditEntry {
  id: string;
  at: ISODate;
  actorId: string;
  actorRole: ActorRole;
  action: AuditAction;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  actionId: string | null;
}

export interface ActionRecord {
  actionId: string;
  label: string;
  actorId: string;
  result: unknown;
  createdAt: ISODate;
}

export const MODULES = [
  'dashboard',
  'leads',
  'followups',
  'quotations',
  'orders',
  'finance',
  'targets',
  'reports',
  'team',
  'admin',
  'settings',
] as const;
export type Module = (typeof MODULES)[number];
export type PermissionOverrides = Partial<Record<Role, Partial<Record<Module, boolean>>>>;

export interface Settings {
  company: {
    name: string;
    address: string;
    gstin: string;
    state: string;
    phone: string;
    email: string;
    bank: { name: string; account: string; ifsc: string; branch: string };
    quoteTerms: string[];
  };
  assignment: {
    roundRobinEnabled: boolean;
    checkedInOnly: boolean;
    maxActiveLeadsPerExec: number;
    slaHours: number;
    rrPointerExecutive: string | null;
    rrPointerBackOffice: string | null;
  };
  scoring: {
    sourceWeights: Record<LeadSource, number>;
    valueBands: { minPaise: Paise; points: number }[];
    cityTiers: Record<string, 1 | 2 | 3>;
  };
  inventory: { defaultLowStockAt: number };
  finance: { recoveryAfterDays: number; gstOnFreight: boolean };
  simulator: { autoMode: boolean; intervalSec: number };
  permissions: PermissionOverrides;
  masters: {
    leadSources: string[];
    lostReasons: string[];
    cities: { name: string; state: string; tier: number }[];
    states: string[];
  };
  anchorDate: ISODate;
  seed: { seedVersion: number; seededAt: ISODate | null };
}

export interface Collections {
  users: User[];
  leads: Lead[];
  timeline: TimelineEntry[];
  followups: FollowUp[];
  calls: Call[];
  quotes: Quotation[];
  orders: Order[];
  products: Product[];
  invoices: Invoice[];
  payments: Payment[];
  recovery: RecoveryCase[];
  targets: Target[];
  notifications: AppNotification[];
  audit: AuditEntry[];
  actions: ActionRecord[];
}
export type CollectionName = keyof Collections;
export const COLLECTION_NAMES: CollectionName[] = [
  'users',
  'leads',
  'timeline',
  'followups',
  'calls',
  'quotes',
  'orders',
  'products',
  'invoices',
  'payments',
  'recovery',
  'targets',
  'notifications',
  'audit',
  'actions',
];

export interface Database {
  schemaVersion: number;
  revision: number;
  seededAt: ISODate;
  sequences: Record<string, number>;
  collections: Collections;
  settings: Settings;
}
