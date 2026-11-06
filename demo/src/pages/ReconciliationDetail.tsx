import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  CheckCircle2, AlertTriangle, XCircle, ChevronRight,
  RefreshCw, Download, ArrowUpDown, Search, Info, Circle
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatNGN, formatPct, formatDate, cn } from '@/lib/utils'
import type { ReconciliationJob, MatchedItem, MatchStatus } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'

export function ReconciliationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [job, setJob] = useState<ReconciliationJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'amount' | 'variance' | 'date'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [activeTab, setActiveTab] = useState('matched')

  useEffect(() => {
    if (!id) return
    api.getJob(id).then(j => {
      setJob(j)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500 mb-4">Reconciliation not found</div>
        <Button variant="outline" onClick={() => navigate('/reconcile')}>Back to list</Button>
      </div>
    )
  }

  const { results, matchedItems } = job

  const matched = matchedItems.filter(m => m.status === 'MATCHED')
  const partial = matchedItems.filter(m => m.status === 'PARTIAL')
  const unmatchedA = matchedItems.filter(m => m.status === 'UNMATCHED_A')
  const unmatchedB = matchedItems.filter(m => m.status === 'UNMATCHED_B')

  function filterItems(items: MatchedItem[]): MatchedItem[] {
    const q = search.toLowerCase()
    let filtered = items
    if (q) {
      filtered = items.filter(item => {
        const ref = item.sourceA?.reference || item.sourceB?.reference || ''
        const sec = item.sourceA?.security || item.sourceB?.security || ''
        const cp = item.sourceA?.counterparty || item.sourceB?.counterparty || ''
        return ref.toLowerCase().includes(q) || sec.toLowerCase().includes(q) || cp.toLowerCase().includes(q)
      })
    }
    return [...filtered].sort((a, b) => {
      const mult = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'amount') {
        const aAmt = a.sourceA?.amount || a.sourceB?.amount || 0
        const bAmt = b.sourceA?.amount || b.sourceB?.amount || 0
        return (aAmt - bAmt) * mult
      }
      if (sortKey === 'variance') return (Math.abs(a.variance) - Math.abs(b.variance)) * mult
      if (sortKey === 'date') {
        const aDate = a.sourceA?.valueDate || a.sourceB?.valueDate || ''
        const bDate = b.sourceA?.valueDate || b.sourceB?.valueDate || ''
        return aDate.localeCompare(bDate) * mult
      }
      return 0
    })
  }

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const handleExport = () => {
    toast.success('Export prepared — download starting')
  }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-enter">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Link to="/reconcile" className="hover:text-gray-600">Reconciliations</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-700 font-medium truncate">{job.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{job.name}</h2>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <span className="text-sm text-gray-500">{job.period}</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-500">Run by {job.createdBy}</span>
            <span className="text-gray-300">·</span>
            <Badge variant="matched">Completed</Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-3.5 h-3.5" />
          Export
        </Button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryTile
          label="Matched"
          count={results.matched}
          total={results.totalA}
          color="emerald"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        />
        <SummaryTile
          label="Partial Match"
          count={results.partial}
          total={results.totalA}
          color="amber"
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
        />
        <SummaryTile
          label="Unmatched (A)"
          count={results.unmatchedA}
          total={results.totalA}
          color="red"
          icon={<XCircle className="w-4 h-4 text-red-500" />}
        />
        <SummaryTile
          label="Unmatched (B)"
          count={results.unmatchedB}
          total={results.totalB}
          color="red"
          icon={<XCircle className="w-4 h-4 text-red-400" />}
        />
      </div>

      {/* KPI bar */}
      <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <div className="text-xs text-gray-400 mb-1">Match Rate</div>
            <div className="flex items-center gap-3">
              <div className="w-40 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${results.matchRate}%` }} />
              </div>
              <span className={cn('text-lg font-mono font-semibold', results.matchRate >= 90 ? 'text-emerald-600' : 'text-amber-600')}>
                {formatPct(results.matchRate)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <KpiPair label="Total Variance" value={formatNGN(results.totalVariance).replace('NGN', '₦')} highlight={results.totalVariance > 0} />
            <KpiPair label="Source A Records" value={String(results.totalA)} />
            <KpiPair label="Source B Records" value={String(results.totalB)} />
          </div>
        </div>
      </div>

      {/* Results table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Search by reference, security, counterparty…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-5 border-b border-gray-100">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="matched">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Matched
                <TabCount n={matched.length} color="emerald" />
              </TabsTrigger>
              <TabsTrigger value="partial">
                <AlertTriangle className="w-3.5 h-3.5" />
                Partial
                <TabCount n={partial.length} color="amber" />
              </TabsTrigger>
              <TabsTrigger value="unmatched_a">
                <XCircle className="w-3.5 h-3.5" />
                Only in A
                <TabCount n={unmatchedA.length} color="red" />
              </TabsTrigger>
              <TabsTrigger value="unmatched_b">
                <XCircle className="w-3.5 h-3.5" />
                Only in B
                <TabCount n={unmatchedB.length} color="red" />
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="matched">
            <ItemsTable items={filterItems(matched)} sourceALabel={job.sourceALabel} sourceBLabel={job.sourceBLabel} status="MATCHED" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          </TabsContent>
          <TabsContent value="partial">
            <ItemsTable items={filterItems(partial)} sourceALabel={job.sourceALabel} sourceBLabel={job.sourceBLabel} status="PARTIAL" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          </TabsContent>
          <TabsContent value="unmatched_a">
            <ItemsTable items={filterItems(unmatchedA)} sourceALabel={job.sourceALabel} sourceBLabel={job.sourceBLabel} status="UNMATCHED_A" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          </TabsContent>
          <TabsContent value="unmatched_b">
            <ItemsTable items={filterItems(unmatchedB)} sourceALabel={job.sourceALabel} sourceBLabel={job.sourceBLabel} status="UNMATCHED_B" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function SummaryTile({ label, count, total, color, icon }: { label: string; count: number; total: number; color: string; icon: React.ReactNode }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-semibold text-gray-900 font-mono">{count}</div>
      <div className="text-xs text-gray-400 mt-0.5">{formatPct(pct)} of source</div>
    </div>
  )
}

function KpiPair({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-0.5">{label}</div>
      <div className={cn('text-sm font-mono font-medium', highlight ? 'text-red-600' : 'text-gray-900')}>{value}</div>
    </div>
  )
}

function TabCount({ n, color }: { n: number; color: string }) {
  if (n === 0) return null
  return (
    <span className={cn('ml-1 text-xs font-semibold px-1.5 py-0.5 rounded-full',
      color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
      color === 'amber' ? 'bg-amber-100 text-amber-700' :
      'bg-red-100 text-red-700'
    )}>
      {n}
    </span>
  )
}

function ItemsTable({
  items, sourceALabel, sourceBLabel, status, sortKey, sortDir, onSort
}: {
  items: MatchedItem[]
  sourceALabel: string
  sourceBLabel: string
  status: MatchStatus
  sortKey: string
  sortDir: 'asc' | 'desc'
  onSort: (key: 'amount' | 'variance' | 'date') => void
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-gray-400">
        <Circle className="w-8 h-8 mb-2 opacity-30" />
        <div className="text-sm">No items in this category</div>
      </div>
    )
  }

  const showVariance = status === 'PARTIAL'
  const showSourceA = status !== 'UNMATCHED_B'
  const showSourceB = status !== 'UNMATCHED_A'

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left text-xs font-medium text-gray-400 px-5 py-2.5">Reference</th>
              <th className="text-left text-xs font-medium text-gray-400 px-5 py-2.5">Security</th>
              <SortTh label="Value Date" sortKey="date" active={sortKey} dir={sortDir} onSort={onSort} />
              {showSourceA && <SortTh label={`Amount (${sourceALabel.split(' ')[0]})`} sortKey="amount" active={sortKey} dir={sortDir} onSort={onSort} />}
              {showSourceB && <th className="text-right text-xs font-medium text-gray-400 px-5 py-2.5">Amount (B)</th>}
              {showVariance && <SortTh label="Variance (₦)" sortKey="variance" active={sortKey} dir={sortDir} onSort={onSort} />}
              <th className="text-left text-xs font-medium text-gray-400 px-5 py-2.5">Counterparty</th>
              <th className="text-left text-xs font-medium text-gray-400 px-5 py-2.5">Matched On</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(item => {
              const tx = item.sourceA || item.sourceB!
              return (
                <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-gray-700">{tx.reference}</td>
                  <td className="px-5 py-3">
                    <div className="text-sm text-gray-900 font-medium">{tx.securityCode}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[180px]">{tx.security}</div>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500 font-mono">{formatDate(tx.valueDate)}</td>
                  {showSourceA && (
                    <td className="px-5 py-3 text-right font-mono text-xs text-gray-700">
                      {formatNGN(item.sourceA?.amount ?? 0).replace('NGN', '₦')}
                    </td>
                  )}
                  {showSourceB && (
                    <td className="px-5 py-3 text-right font-mono text-xs text-gray-700">
                      {formatNGN(item.sourceB?.amount ?? 0).replace('NGN', '₦')}
                    </td>
                  )}
                  {showVariance && (
                    <td className={cn('px-5 py-3 text-right font-mono text-xs font-medium',
                      item.variance > 0 ? 'text-red-600' : item.variance < 0 ? 'text-amber-600' : 'text-emerald-600'
                    )}>
                      {item.variance > 0 ? '+' : ''}{formatNGN(item.variance).replace('NGN', '₦')}
                    </td>
                  )}
                  <td className="px-5 py-3 text-xs text-gray-500">{tx.counterparty}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {item.matchedOn.map(m => (
                        <span key={m} className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{m}</span>
                      ))}
                      {item.matchedOn.length === 0 && <span className="text-[11px] text-red-400">—</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden divide-y divide-gray-100">
        {items.map(item => {
          const tx = item.sourceA || item.sourceB!
          return (
            <div key={item.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-sm text-gray-900">{tx.securityCode}</div>
                  <div className="text-xs text-gray-400 mt-0.5 font-mono">{tx.reference}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs text-gray-700">{formatNGN(tx.amount).replace('NGN', '₦')}</div>
                  {showVariance && item.variance !== 0 && (
                    <div className={cn('font-mono text-xs font-medium',
                      item.variance > 0 ? 'text-red-600' : 'text-amber-600'
                    )}>
                      {item.variance > 0 ? '+' : ''}{formatNGN(item.variance).replace('NGN', '₦')}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-1">{formatDate(tx.valueDate)} · {tx.counterparty}</div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function SortTh({ label, sortKey, active, dir, onSort }: { label: string; sortKey: 'amount' | 'variance' | 'date'; active: string; dir: 'asc' | 'desc'; onSort: (k: 'amount' | 'variance' | 'date') => void }) {
  return (
    <th className="text-right px-5 py-2.5">
      <button
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-700 ml-auto"
      >
        {label}
        <ArrowUpDown className={cn('w-3 h-3', active === sortKey ? 'text-amber-500' : '')} />
      </button>
    </th>
  )
}
