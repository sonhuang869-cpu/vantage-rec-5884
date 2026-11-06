export type TransactionType =
  | 'EQUITY_BUY'
  | 'EQUITY_SELL'
  | 'BOND_BUY'
  | 'BOND_SELL'
  | 'TBILL_PURCHASE'
  | 'TBILL_MATURITY'
  | 'DIVIDEND'
  | 'COUPON'
  | 'FX_PURCHASE'
  | 'FEES'

export type AssetClass = 'EQUITY' | 'FIXED_INCOME' | 'TBILL' | 'CASH' | 'FX'

export interface Transaction {
  id: string
  reference: string
  valueDate: string        // ISO date YYYY-MM-DD
  tradeDate: string
  security: string
  securityCode: string
  assetClass: AssetClass
  transactionType: TransactionType
  quantity: number
  price: number
  amount: number           // gross amount NGN
  currency: 'NGN'
  counterparty: string
  portfolio: string
  narration: string
}

export type MatchStatus = 'MATCHED' | 'PARTIAL' | 'UNMATCHED_A' | 'UNMATCHED_B'
export type ExceptionStatus = 'OPEN' | 'UNDER_REVIEW' | 'APPROVED' | 'DISPUTED' | 'ESCALATED' | 'RESOLVED'
export type ExceptionPriority = 'HIGH' | 'MEDIUM' | 'LOW'

export interface MatchedItem {
  id: string
  status: MatchStatus
  sourceA?: Transaction
  sourceB?: Transaction
  variance: number
  variancePct: number
  matchedOn: string[]
  notes?: string
}

export interface ExceptionItem {
  id: string
  reconciliationId: string
  reconciliationName: string
  matchItem: MatchedItem
  status: ExceptionStatus
  priority: ExceptionPriority
  assignedTo?: string
  comments: ExceptionComment[]
  createdAt: string
  updatedAt: string
  resolvedAt?: string
}

export interface ExceptionComment {
  id: string
  author: string
  text: string
  createdAt: string
}

export interface ReconciliationConfig {
  primaryKey: 'reference' | 'amount_date' | 'custom'
  amountTolerance: number    // absolute NGN tolerance
  dateTolerance: number      // days tolerance
  matchFields: string[]
}

export type ReconciliationStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export interface ReconciliationJob {
  id: string
  name: string
  description: string
  sourceAName: string
  sourceBName: string
  sourceALabel: string
  sourceBLabel: string
  config: ReconciliationConfig
  status: ReconciliationStatus
  createdAt: string
  completedAt?: string
  createdBy: string
  period: string             // e.g. "October 2024"
  results: ReconciliationResults
  sourceAData: Transaction[]
  sourceBData: Transaction[]
  matchedItems: MatchedItem[]
}

export interface ReconciliationResults {
  totalA: number
  totalB: number
  matched: number
  partial: number
  unmatchedA: number
  unmatchedB: number
  totalVariance: number
  matchRate: number
}

export interface DashboardStats {
  totalJobs: number
  avgMatchRate: number
  openExceptions: number
  totalVariance: number
  recentJobs: ReconciliationJob[]
}
