import type { Transaction, ReconciliationJob, ExceptionItem, MatchedItem } from '@/types'
import { runReconciliation } from './reconciliation-engine'

const PORTFOLIOS = ['PAM-EQUITY-001', 'PAM-FIXINC-002', 'PAM-BALANCED-003']
const SECURITIES = [
  { name: 'MTN Nigeria Communications Plc', code: 'MTNN', class: 'EQUITY' as const },
  { name: 'Dangote Cement Plc', code: 'DANGCEM', class: 'EQUITY' as const },
  { name: 'Zenith Bank Plc', code: 'ZENITHBANK', class: 'EQUITY' as const },
  { name: 'Access Holdings Plc', code: 'ACCESS', class: 'EQUITY' as const },
  { name: 'Airtel Africa Plc', code: 'AIRTELAFRI', class: 'EQUITY' as const },
  { name: 'BUA Foods Plc', code: 'BUAFOODS', class: 'EQUITY' as const },
  { name: 'Seplat Energy Plc', code: 'SEPLAT', class: 'EQUITY' as const },
  { name: 'FGN Bond 2029 12.75%', code: 'FGNBOND2029', class: 'FIXED_INCOME' as const },
  { name: 'FGN Bond 2032 14.55%', code: 'FGNBOND2032', class: 'FIXED_INCOME' as const },
  { name: '91-Day Treasury Bill', code: 'TBILL91', class: 'TBILL' as const },
  { name: '182-Day Treasury Bill', code: 'TBILL182', class: 'TBILL' as const },
]
const COUNTERPARTIES = [
  'Stanbic IBTC Asset Management',
  'FBN Quest Merchant Bank',
  'Meristem Securities Ltd',
  'Cardinalstone Partners',
  'Chapel Hill Denham Advisory',
  'FSDH Asset Management',
  'Nigerian Exchange Group',
  'First Custodian Nigeria Ltd',
]

function makeRef(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(6, '0')}`
}

function dateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isoNow(): string {
  return new Date().toISOString()
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

// Source A: Prestige Asset Management (internal book)
// Source B: First Custodian Nigeria (custodian statement)
// Intentional discrepancies introduced for demonstration

export function buildOctoberDataset(): { sourceA: Transaction[]; sourceB: Transaction[] } {
  const rawPairs: Array<{
    ref: string
    sec: number
    type: 'EQUITY_BUY' | 'EQUITY_SELL' | 'BOND_BUY' | 'BOND_SELL' | 'TBILL_PURCHASE' | 'TBILL_MATURITY' | 'DIVIDEND' | 'COUPON'
    qty: number
    price: number
    tradeDate: string
    valueDate: string
    portfolio: number
    counterparty: number
    discrepancy: 'none' | 'amount' | 'missing_a' | 'missing_b' | 'date'
    varianceAmt?: number
  }> = [
    // Perfect matches
    { ref: 'PAM', sec: 0, type: 'EQUITY_BUY', qty: 500000, price: 285.50, tradeDate: '2024-10-01', valueDate: '2024-10-04', portfolio: 0, counterparty: 0, discrepancy: 'none' },
    { ref: 'PAM', sec: 1, type: 'EQUITY_BUY', qty: 200000, price: 1105.00, tradeDate: '2024-10-02', valueDate: '2024-10-07', portfolio: 0, counterparty: 1, discrepancy: 'none' },
    { ref: 'PAM', sec: 2, type: 'EQUITY_SELL', qty: 1000000, price: 38.75, tradeDate: '2024-10-03', valueDate: '2024-10-08', portfolio: 1, counterparty: 2, discrepancy: 'none' },
    { ref: 'PAM', sec: 3, type: 'EQUITY_BUY', qty: 750000, price: 22.80, tradeDate: '2024-10-04', valueDate: '2024-10-09', portfolio: 0, counterparty: 3, discrepancy: 'none' },
    { ref: 'PAM', sec: 4, type: 'EQUITY_SELL', qty: 300000, price: 2290.00, tradeDate: '2024-10-07', valueDate: '2024-10-10', portfolio: 2, counterparty: 1, discrepancy: 'none' },
    { ref: 'PAM', sec: 7, type: 'BOND_BUY', qty: 50000000, price: 97.80, tradeDate: '2024-10-07', valueDate: '2024-10-09', portfolio: 1, counterparty: 7, discrepancy: 'none' },
    { ref: 'PAM', sec: 5, type: 'DIVIDEND', qty: 2000000, price: 3.50, tradeDate: '2024-10-08', valueDate: '2024-10-08', portfolio: 0, counterparty: 4, discrepancy: 'none' },
    { ref: 'PAM', sec: 8, type: 'BOND_SELL', qty: 30000000, price: 102.15, tradeDate: '2024-10-09', valueDate: '2024-10-11', portfolio: 1, counterparty: 7, discrepancy: 'none' },
    { ref: 'PAM', sec: 9, type: 'TBILL_PURCHASE', qty: 100000000, price: 96.40, tradeDate: '2024-10-10', valueDate: '2024-10-10', portfolio: 2, counterparty: 5, discrepancy: 'none' },
    { ref: 'PAM', sec: 0, type: 'EQUITY_SELL', qty: 250000, price: 288.00, tradeDate: '2024-10-11', valueDate: '2024-10-16', portfolio: 0, counterparty: 0, discrepancy: 'none' },
    { ref: 'PAM', sec: 6, type: 'EQUITY_BUY', qty: 100000, price: 4150.00, tradeDate: '2024-10-14', valueDate: '2024-10-17', portfolio: 2, counterparty: 2, discrepancy: 'none' },
    { ref: 'PAM', sec: 1, type: 'EQUITY_SELL', qty: 50000, price: 1092.00, tradeDate: '2024-10-15', valueDate: '2024-10-18', portfolio: 0, counterparty: 1, discrepancy: 'none' },
    { ref: 'PAM', sec: 10, type: 'TBILL_MATURITY', qty: 50000000, price: 100.00, tradeDate: '2024-10-15', valueDate: '2024-10-15', portfolio: 2, counterparty: 5, discrepancy: 'none' },
    { ref: 'PAM', sec: 7, type: 'COUPON', qty: 100000000, price: 6.375, tradeDate: '2024-10-16', valueDate: '2024-10-16', portfolio: 1, counterparty: 7, discrepancy: 'none' },
    { ref: 'PAM', sec: 3, type: 'EQUITY_SELL', qty: 500000, price: 23.10, tradeDate: '2024-10-17', valueDate: '2024-10-22', portfolio: 0, counterparty: 3, discrepancy: 'none' },
    { ref: 'PAM', sec: 2, type: 'EQUITY_BUY', qty: 2000000, price: 36.90, tradeDate: '2024-10-18', valueDate: '2024-10-23', portfolio: 1, counterparty: 2, discrepancy: 'none' },
    { ref: 'PAM', sec: 4, type: 'EQUITY_BUY', qty: 150000, price: 2310.00, tradeDate: '2024-10-21', valueDate: '2024-10-24', portfolio: 2, counterparty: 4, discrepancy: 'none' },
    { ref: 'PAM', sec: 5, type: 'EQUITY_BUY', qty: 500000, price: 365.00, tradeDate: '2024-10-22', valueDate: '2024-10-25', portfolio: 0, counterparty: 6, discrepancy: 'none' },
    { ref: 'PAM', sec: 8, type: 'BOND_BUY', qty: 75000000, price: 101.50, tradeDate: '2024-10-23', valueDate: '2024-10-25', portfolio: 1, counterparty: 7, discrepancy: 'none' },
    { ref: 'PAM', sec: 0, type: 'EQUITY_BUY', qty: 800000, price: 290.00, tradeDate: '2024-10-24', valueDate: '2024-10-29', portfolio: 0, counterparty: 0, discrepancy: 'none' },
    { ref: 'PAM', sec: 9, type: 'TBILL_PURCHASE', qty: 200000000, price: 95.90, tradeDate: '2024-10-25', valueDate: '2024-10-25', portfolio: 2, counterparty: 5, discrepancy: 'none' },
    { ref: 'PAM', sec: 6, type: 'EQUITY_SELL', qty: 50000, price: 4200.00, tradeDate: '2024-10-28', valueDate: '2024-10-31', portfolio: 2, counterparty: 2, discrepancy: 'none' },
    { ref: 'PAM', sec: 1, type: 'EQUITY_BUY', qty: 300000, price: 1120.00, tradeDate: '2024-10-29', valueDate: '2024-11-01', portfolio: 0, counterparty: 1, discrepancy: 'none' },
    // Amount discrepancies (partial matches)
    { ref: 'PAM', sec: 2, type: 'EQUITY_BUY', qty: 500000, price: 37.60, tradeDate: '2024-10-30', valueDate: '2024-11-04', portfolio: 1, counterparty: 2, discrepancy: 'amount', varianceAmt: 125000 },
    { ref: 'PAM', sec: 7, type: 'BOND_BUY', qty: 25000000, price: 98.50, tradeDate: '2024-10-14', valueDate: '2024-10-16', portfolio: 1, counterparty: 7, discrepancy: 'amount', varianceAmt: 87500 },
    { ref: 'PAM', sec: 3, type: 'EQUITY_BUY', qty: 1000000, price: 24.50, tradeDate: '2024-10-21', valueDate: '2024-10-24', portfolio: 0, counterparty: 3, discrepancy: 'amount', varianceAmt: 50000 },
    { ref: 'PAM', sec: 5, type: 'DIVIDEND', qty: 1500000, price: 3.50, tradeDate: '2024-10-22', valueDate: '2024-10-22', portfolio: 0, counterparty: 4, discrepancy: 'amount', varianceAmt: 7500 },
    { ref: 'PAM', sec: 0, type: 'EQUITY_SELL', qty: 400000, price: 292.00, tradeDate: '2024-10-28', valueDate: '2024-11-01', portfolio: 0, counterparty: 0, discrepancy: 'amount', varianceAmt: 230000 },
    { ref: 'PAM', sec: 8, type: 'COUPON', qty: 50000000, price: 7.275, tradeDate: '2024-10-30', valueDate: '2024-10-30', portfolio: 1, counterparty: 7, discrepancy: 'amount', varianceAmt: 42500 },
    // Missing from B (only in source A)
    { ref: 'PAM', sec: 4, type: 'EQUITY_BUY', qty: 200000, price: 2340.00, tradeDate: '2024-10-15', valueDate: '2024-10-18', portfolio: 2, counterparty: 4, discrepancy: 'missing_b' },
    { ref: 'PAM', sec: 6, type: 'EQUITY_BUY', qty: 75000, price: 4280.00, tradeDate: '2024-10-23', valueDate: '2024-10-28', portfolio: 2, counterparty: 2, discrepancy: 'missing_b' },
    { ref: 'PAM', sec: 9, type: 'TBILL_PURCHASE', qty: 150000000, price: 96.10, tradeDate: '2024-10-29', valueDate: '2024-10-29', portfolio: 2, counterparty: 5, discrepancy: 'missing_b' },
    // Missing from A (only in source B)
    { ref: 'PAM', sec: 1, type: 'EQUITY_SELL', qty: 100000, price: 1095.00, tradeDate: '2024-10-11', valueDate: '2024-10-16', portfolio: 0, counterparty: 1, discrepancy: 'missing_a' },
    { ref: 'PAM', sec: 5, type: 'EQUITY_SELL', qty: 250000, price: 371.00, tradeDate: '2024-10-25', valueDate: '2024-10-30', portfolio: 0, counterparty: 6, discrepancy: 'missing_a' },
  ]

  const sourceA: Transaction[] = []
  const sourceB: Transaction[] = []
  let refCounter = 1000

  for (const pair of rawPairs) {
    const sec = SECURITIES[pair.sec]
    const ref = makeRef('FCN-TXN-', refCounter)
    const intRef = makeRef('PAM-INT-', refCounter)
    refCounter++

    const baseAmount = pair.qty * pair.price
    const portfolio = PORTFOLIOS[pair.portfolio]
    const counterparty = COUNTERPARTIES[pair.counterparty]

    const txBase = {
      reference: ref,
      tradeDate: pair.tradeDate,
      valueDate: pair.valueDate,
      security: sec.name,
      securityCode: sec.code,
      assetClass: sec.class,
      transactionType: pair.type,
      quantity: pair.qty,
      price: pair.price,
      currency: 'NGN' as const,
      counterparty,
      portfolio,
      narration: `${pair.type.replace('_', ' ')} - ${sec.code} - ${portfolio}`,
    }

    if (pair.discrepancy === 'missing_a') {
      // Only in B
      sourceB.push({ ...txBase, id: `B-${ref}`, amount: baseAmount })
    } else if (pair.discrepancy === 'missing_b') {
      // Only in A (use internal ref since custodian doesn't have it)
      sourceA.push({ ...txBase, id: `A-${ref}`, reference: intRef, amount: baseAmount })
    } else if (pair.discrepancy === 'amount') {
      const variance = pair.varianceAmt ?? 0
      sourceA.push({ ...txBase, id: `A-${ref}`, amount: baseAmount })
      sourceB.push({ ...txBase, id: `B-${ref}`, amount: baseAmount + variance })
    } else {
      sourceA.push({ ...txBase, id: `A-${ref}`, amount: baseAmount })
      sourceB.push({ ...txBase, id: `B-${ref}`, amount: baseAmount })
    }
  }

  return { sourceA, sourceB }
}

export function buildSeptemberDataset(): { sourceA: Transaction[]; sourceB: Transaction[] } {
  // Smaller dataset with higher match rate for variety
  const data: Transaction[] = [
    { id: 'A-S001', reference: 'FCN-TXN-S001', valueDate: '2024-09-02', tradeDate: '2024-08-30', security: 'MTN Nigeria Communications Plc', securityCode: 'MTNN', assetClass: 'EQUITY', transactionType: 'EQUITY_BUY', quantity: 1000000, price: 278.00, amount: 278000000, currency: 'NGN', counterparty: 'Stanbic IBTC Asset Management', portfolio: 'PAM-EQUITY-001', narration: 'EQUITY BUY - MTNN' },
    { id: 'A-S002', reference: 'FCN-TXN-S002', valueDate: '2024-09-04', tradeDate: '2024-09-02', security: 'FGN Bond 2029 12.75%', securityCode: 'FGNBOND2029', assetClass: 'FIXED_INCOME', transactionType: 'BOND_BUY', quantity: 100000000, price: 97.20, amount: 97200000, currency: 'NGN', counterparty: 'First Custodian Nigeria Ltd', portfolio: 'PAM-FIXINC-002', narration: 'BOND BUY - FGN2029' },
    { id: 'A-S003', reference: 'FCN-TXN-S003', valueDate: '2024-09-05', tradeDate: '2024-09-03', security: 'Dangote Cement Plc', securityCode: 'DANGCEM', assetClass: 'EQUITY', transactionType: 'EQUITY_SELL', quantity: 150000, price: 1098.00, amount: 164700000, currency: 'NGN', counterparty: 'FBN Quest Merchant Bank', portfolio: 'PAM-EQUITY-001', narration: 'EQUITY SELL - DANGCEM' },
    { id: 'A-S004', reference: 'FCN-TXN-S004', valueDate: '2024-09-10', tradeDate: '2024-09-06', security: '91-Day Treasury Bill', securityCode: 'TBILL91', assetClass: 'TBILL', transactionType: 'TBILL_PURCHASE', quantity: 500000000, price: 96.80, amount: 484000000, currency: 'NGN', counterparty: 'First Custodian Nigeria Ltd', portfolio: 'PAM-BALANCED-003', narration: 'TBILL PURCHASE 91D' },
    { id: 'A-S005', reference: 'FCN-TXN-S005', valueDate: '2024-09-12', tradeDate: '2024-09-10', security: 'Zenith Bank Plc', securityCode: 'ZENITHBANK', assetClass: 'EQUITY', transactionType: 'DIVIDEND', quantity: 5000000, price: 3.00, amount: 15000000, currency: 'NGN', counterparty: 'Nigerian Exchange Group', portfolio: 'PAM-EQUITY-001', narration: 'DIVIDEND - ZENITHBANK' },
    { id: 'A-S006', reference: 'FCN-TXN-S006', valueDate: '2024-09-16', tradeDate: '2024-09-13', security: 'Airtel Africa Plc', securityCode: 'AIRTELAFRI', assetClass: 'EQUITY', transactionType: 'EQUITY_BUY', quantity: 500000, price: 2250.00, amount: 1125000000, currency: 'NGN', counterparty: 'Cardinalstone Partners', portfolio: 'PAM-BALANCED-003', narration: 'EQUITY BUY - AIRTELAFRI' },
    { id: 'A-S007', reference: 'FCN-TXN-S007', valueDate: '2024-09-18', tradeDate: '2024-09-16', security: 'BUA Foods Plc', securityCode: 'BUAFOODS', assetClass: 'EQUITY', transactionType: 'EQUITY_SELL', quantity: 800000, price: 358.00, amount: 286400000, currency: 'NGN', counterparty: 'Chapel Hill Denham Advisory', portfolio: 'PAM-EQUITY-001', narration: 'EQUITY SELL - BUAFOODS' },
  ]

  const sourceA = data
  const sourceB = data.map((tx, i) => ({
    ...tx,
    id: `B-${tx.reference}`,
    // Add small discrepancy to item 6
    amount: i === 5 ? tx.amount + 562500 : tx.amount,
  }))

  return { sourceA, sourceB }
}

export function generateSeedJobs(): ReconciliationJob[] {
  const { sourceA: octA, sourceB: octB } = buildOctoberDataset()
  const { sourceA: sepA, sourceB: sepB } = buildSeptemberDataset()

  const octConfig = { primaryKey: 'reference' as const, amountTolerance: 1000, dateTolerance: 1, matchFields: ['reference', 'amount', 'valueDate'] }
  const sepConfig = { primaryKey: 'reference' as const, amountTolerance: 1000, dateTolerance: 1, matchFields: ['reference', 'amount', 'valueDate'] }

  const octMatched = runReconciliation(octA, octB, octConfig)
  const sepMatched = runReconciliation(sepA, sepB, sepConfig)

  const octResults = computeResults(octA, octB, octMatched)
  const sepResults = computeResults(sepA, sepB, sepMatched)

  const jobs: ReconciliationJob[] = [
    {
      id: 'recon-oct-2024',
      name: 'PAM vs First Custodian — October 2024',
      description: 'Monthly equity and fixed income reconciliation: Prestige Asset Management internal book vs First Custodian Nigeria statement.',
      sourceAName: 'prestige_am_oct2024.csv',
      sourceBName: 'firstcustodian_oct2024.csv',
      sourceALabel: 'Prestige Asset Management (Book)',
      sourceBLabel: 'First Custodian Nigeria (Statement)',
      config: octConfig,
      status: 'COMPLETED',
      createdAt: daysAgo(3),
      completedAt: daysAgo(3),
      createdBy: 'Adaeze Okonkwo',
      period: 'October 2024',
      results: octResults,
      sourceAData: octA,
      sourceBData: octB,
      matchedItems: octMatched,
    },
    {
      id: 'recon-sep-2024',
      name: 'PAM vs First Custodian — September 2024',
      description: 'Monthly reconciliation for September 2024 — equities, bonds and treasury bills.',
      sourceAName: 'prestige_am_sep2024.csv',
      sourceBName: 'firstcustodian_sep2024.csv',
      sourceALabel: 'Prestige Asset Management (Book)',
      sourceBLabel: 'First Custodian Nigeria (Statement)',
      config: sepConfig,
      status: 'COMPLETED',
      createdAt: daysAgo(35),
      completedAt: daysAgo(35),
      createdBy: 'Emeka Nwosu',
      period: 'September 2024',
      results: sepResults,
      sourceAData: sepA,
      sourceBData: sepB,
      matchedItems: sepMatched,
    },
    {
      id: 'recon-aug-2024',
      name: 'PAM vs First Custodian — August 2024',
      description: 'Monthly reconciliation for August 2024.',
      sourceAName: 'prestige_am_aug2024.csv',
      sourceBName: 'firstcustodian_aug2024.csv',
      sourceALabel: 'Prestige Asset Management (Book)',
      sourceBLabel: 'First Custodian Nigeria (Statement)',
      config: octConfig,
      status: 'COMPLETED',
      createdAt: daysAgo(66),
      completedAt: daysAgo(66),
      createdBy: 'Adaeze Okonkwo',
      period: 'August 2024',
      results: { totalA: 28, totalB: 28, matched: 25, partial: 2, unmatchedA: 1, unmatchedB: 1, totalVariance: 143750, matchRate: 89.3 },
      sourceAData: [],
      sourceBData: [],
      matchedItems: [],
    },
  ]

  return jobs
}

function computeResults(
  sourceA: Transaction[],
  sourceB: Transaction[],
  matchedItems: MatchedItem[]
) {
  const matched = matchedItems.filter(m => m.status === 'MATCHED').length
  const partial = matchedItems.filter(m => m.status === 'PARTIAL').length
  const unmatchedA = matchedItems.filter(m => m.status === 'UNMATCHED_A').length
  const unmatchedB = matchedItems.filter(m => m.status === 'UNMATCHED_B').length
  const totalVariance = matchedItems.reduce((s, m) => s + Math.abs(m.variance), 0)
  const total = sourceA.length + unmatchedB

  return {
    totalA: sourceA.length,
    totalB: sourceB.length,
    matched,
    partial,
    unmatchedA,
    unmatchedB,
    totalVariance,
    matchRate: total > 0 ? Math.round(((matched + partial) / Math.max(sourceA.length, 1)) * 1000) / 10 : 0,
  }
}

export function generateExceptions(jobs: ReconciliationJob[]): ExceptionItem[] {
  const exceptions: ExceptionItem[] = []
  let excId = 1

  for (const job of jobs) {
    for (const item of job.matchedItems) {
      if (item.status === 'MATCHED') continue
      const absVar = Math.abs(item.variance)
      let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW'
      if (absVar > 1000000 || item.status === 'UNMATCHED_A' || item.status === 'UNMATCHED_B') {
        priority = 'HIGH'
      } else if (absVar > 100000) {
        priority = 'MEDIUM'
      }

      // Some already resolved for history
      const resolved = excId % 7 === 0
      const underReview = excId % 5 === 0

      exceptions.push({
        id: `EXC-${String(excId).padStart(4, '0')}`,
        reconciliationId: job.id,
        reconciliationName: job.name,
        matchItem: item,
        status: resolved ? 'RESOLVED' : underReview ? 'UNDER_REVIEW' : 'OPEN',
        priority,
        assignedTo: excId % 3 === 0 ? 'Emeka Nwosu' : excId % 3 === 1 ? 'Adaeze Okonkwo' : undefined,
        comments: resolved ? [{
          id: `c${excId}`,
          author: 'Adaeze Okonkwo',
          text: 'Confirmed with counterparty — accrued interest difference. Approved for settlement.',
          createdAt: daysAgo(1),
        }] : [],
        createdAt: job.createdAt,
        updatedAt: job.createdAt,
        resolvedAt: resolved ? daysAgo(1) : undefined,
      })
      excId++
    }
  }

  return exceptions
}
