import type { Transaction, MatchedItem, ReconciliationConfig } from '@/types'

let _idCounter = 0
function nextId(): string {
  return `mi-${++_idCounter}`
}

export function runReconciliation(
  sourceA: Transaction[],
  sourceB: Transaction[],
  config: ReconciliationConfig
): MatchedItem[] {
  const results: MatchedItem[] = []
  const usedB = new Set<string>()

  for (const txA of sourceA) {
    // 1. Try exact match: same reference + amount within tolerance
    const exactIdx = sourceB.findIndex(txB =>
      !usedB.has(txB.id) &&
      txB.reference === txA.reference &&
      Math.abs(txB.amount - txA.amount) <= config.amountTolerance
    )

    if (exactIdx !== -1) {
      const txB = sourceB[exactIdx]
      usedB.add(txB.id)
      results.push({
        id: nextId(),
        status: 'MATCHED',
        sourceA: txA,
        sourceB: txB,
        variance: txB.amount - txA.amount,
        variancePct: txA.amount !== 0 ? ((txB.amount - txA.amount) / txA.amount) * 100 : 0,
        matchedOn: ['reference', 'amount'],
      })
      continue
    }

    // 2. Try partial match: same reference, amount discrepancy
    const partialIdx = sourceB.findIndex(txB =>
      !usedB.has(txB.id) &&
      txB.reference === txA.reference
    )

    if (partialIdx !== -1) {
      const txB = sourceB[partialIdx]
      usedB.add(txB.id)
      const variance = txB.amount - txA.amount
      results.push({
        id: nextId(),
        status: 'PARTIAL',
        sourceA: txA,
        sourceB: txB,
        variance,
        variancePct: txA.amount !== 0 ? (variance / txA.amount) * 100 : 0,
        matchedOn: ['reference'],
      })
      continue
    }

    // 3. Try fuzzy: same amount + date within tolerance
    const fuzzyIdx = sourceB.findIndex(txB =>
      !usedB.has(txB.id) &&
      Math.abs(txB.amount - txA.amount) <= config.amountTolerance &&
      Math.abs(daysDiff(txB.valueDate, txA.valueDate)) <= config.dateTolerance &&
      txB.securityCode === txA.securityCode
    )

    if (fuzzyIdx !== -1) {
      const txB = sourceB[fuzzyIdx]
      usedB.add(txB.id)
      results.push({
        id: nextId(),
        status: 'PARTIAL',
        sourceA: txA,
        sourceB: txB,
        variance: txB.amount - txA.amount,
        variancePct: txA.amount !== 0 ? ((txB.amount - txA.amount) / txA.amount) * 100 : 0,
        matchedOn: ['amount', 'date', 'security'],
      })
      continue
    }

    // Unmatched A
    results.push({
      id: nextId(),
      status: 'UNMATCHED_A',
      sourceA: txA,
      variance: txA.amount,
      variancePct: 100,
      matchedOn: [],
    })
  }

  // Remaining sourceB items are unmatched B
  for (const txB of sourceB) {
    if (!usedB.has(txB.id)) {
      results.push({
        id: nextId(),
        status: 'UNMATCHED_B',
        sourceB: txB,
        variance: -txB.amount,
        variancePct: 100,
        matchedOn: [],
      })
    }
  }

  return results
}

function daysDiff(a: string, b: string): number {
  const da = new Date(a).getTime()
  const db = new Date(b).getTime()
  return (da - db) / (1000 * 60 * 60 * 24)
}
