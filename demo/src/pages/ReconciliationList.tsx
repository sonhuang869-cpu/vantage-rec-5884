import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, ArrowRight, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { formatNGN, formatPct, formatDateTime, cn } from '@/lib/utils'
import type { ReconciliationJob } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export function ReconciliationList() {
  const [jobs, setJobs] = useState<ReconciliationJob[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.getJobs().then(j => {
      setJobs(j)
      setLoading(false)
    })
  }, [])

  const filtered = jobs.filter(j =>
    j.name.toLowerCase().includes(search.toLowerCase()) ||
    j.period.toLowerCase().includes(search.toLowerCase()) ||
    j.createdBy.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 space-y-4 animate-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Reconciliations</h2>
          <p className="text-sm text-gray-500 mt-0.5">{jobs.length} total reconciliation runs</p>
        </div>
        <Button variant="primary" asChild>
          <Link to="/reconcile/new">
            <Plus className="w-4 h-4" />
            New Reconciliation
          </Link>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <Input
          placeholder="Search reconciliations…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState search={search} />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Name', 'Period', 'Source A', 'Source B', 'Match Rate', 'Exceptions', 'Total Variance', 'Run By', 'Date', ''].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(job => {
                  const totalExceptions = job.results.partial + job.results.unmatchedA + job.results.unmatchedB
                  return (
                    <tr key={job.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="px-5 py-3">
                        <Link to={`/reconcile/${job.id}`} className="font-medium text-gray-900 hover:text-amber-700">
                          {job.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{job.period}</td>
                      <td className="px-5 py-3 text-gray-500 max-w-[120px] truncate">{job.sourceALabel}</td>
                      <td className="px-5 py-3 text-gray-500 max-w-[120px] truncate">{job.sourceBLabel}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${job.results.matchRate}%` }} />
                          </div>
                          <span className={cn('font-mono text-xs font-medium',
                            job.results.matchRate >= 90 ? 'text-emerald-600' :
                            job.results.matchRate >= 70 ? 'text-amber-600' : 'text-red-600'
                          )}>
                            {formatPct(job.results.matchRate)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {totalExceptions > 0 ? (
                          <Badge variant="partial">{totalExceptions}</Badge>
                        ) : (
                          <Badge variant="matched">0</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-600">
                        {formatNGN(job.results.totalVariance).replace('NGN', '₦')}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{job.createdBy}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDateTime(job.createdAt)}</td>
                      <td className="px-5 py-3">
                        <Link to={`/reconcile/${job.id}`} className="text-gray-400 hover:text-amber-600">
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map(job => (
              <Link key={job.id} to={`/reconcile/${job.id}`} className="block px-4 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">{job.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{job.period} · {job.createdBy}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <span className={cn('text-xs font-mono font-semibold',
                    job.results.matchRate >= 90 ? 'text-emerald-600' : 'text-amber-600'
                  )}>
                    {formatPct(job.results.matchRate)} matched
                  </span>
                  <span className="text-xs text-gray-400">
                    {job.results.partial + job.results.unmatchedA + job.results.unmatchedB} exceptions
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState({ search }: { search: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 flex flex-col items-center py-16 px-6 text-center">
      <RefreshCw className="w-8 h-8 text-gray-300 mb-3" />
      {search ? (
        <>
          <div className="text-sm font-medium text-gray-900 mb-1">No results for "{search}"</div>
          <div className="text-xs text-gray-400">Try a different search term</div>
        </>
      ) : (
        <>
          <div className="text-sm font-medium text-gray-900 mb-1">No reconciliations yet</div>
          <div className="text-xs text-gray-400 mb-4">Create your first reconciliation run</div>
          <Button variant="primary" asChild size="sm">
            <Link to="/reconcile/new"><Plus className="w-3.5 h-3.5" /> New Reconciliation</Link>
          </Button>
        </>
      )}
    </div>
  )
}
