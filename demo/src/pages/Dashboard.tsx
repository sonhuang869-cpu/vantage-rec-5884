import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
  RefreshCw,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { api } from '@/lib/api'
import { formatNGN, formatPct, formatDateTime, cn } from '@/lib/utils'
import type { ReconciliationJob, ExceptionItem } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const STATUS_COLORS: Record<string, string> = {
  MATCHED: 'text-emerald-600',
  PARTIAL: 'text-amber-600',
  UNMATCHED_A: 'text-red-600',
  UNMATCHED_B: 'text-red-600',
}

export function Dashboard() {
  const [jobs, setJobs] = useState<ReconciliationJob[]>([])
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getJobs(), api.getExceptions()]).then(([j, e]) => {
      setJobs(j)
      setExceptions(e)
      setLoading(false)
    })
  }, [])

  const openExceptions = exceptions.filter(e => e.status === 'OPEN' || e.status === 'UNDER_REVIEW')
  const completedJobs = jobs.filter(j => j.status === 'COMPLETED')
  const avgMatchRate =
    completedJobs.length > 0
      ? completedJobs.reduce((s, j) => s + j.results.matchRate, 0) / completedJobs.length
      : 0
  const totalVariance = completedJobs.reduce((s, j) => s + j.results.totalVariance, 0)

  const chartData = [...completedJobs]
    .reverse()
    .slice(-6)
    .map(j => ({
      period: j.period.replace(' 2024', ''),
      matchRate: j.results.matchRate,
      exceptions: j.results.partial + j.results.unmatchedA + j.results.unmatchedB,
    }))

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

  return (
    <div className="p-4 md:p-6 space-y-6 animate-enter">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
          <p className="text-sm text-gray-500 mt-0.5">Prestige Asset Management — Reconciliation Dashboard</p>
        </div>
        <Button variant="primary" asChild size="default">
          <Link to="/reconcile/new" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>New Reconciliation</span>
          </Link>
        </Button>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Total Reconciliations"
          value={String(jobs.length)}
          sub={`${completedJobs.length} completed`}
          icon={<RefreshCw className="w-4 h-4 text-navy-600" />}
          accent="navy"
        />
        <StatTile
          label="Avg. Match Rate"
          value={formatPct(avgMatchRate)}
          sub="across all periods"
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
          accent="green"
        />
        <StatTile
          label="Open Exceptions"
          value={String(openExceptions.length)}
          sub={`${exceptions.filter(e => e.priority === 'HIGH' && e.status !== 'RESOLVED').length} high priority`}
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          accent="amber"
          alert={openExceptions.length > 0}
        />
        <StatTile
          label="Total Variance (NGN)"
          value={formatNGN(totalVariance).replace('NGN', '₦')}
          sub="open variance across all jobs"
          icon={<XCircle className="w-4 h-4 text-red-500" />}
          accent="red"
        />
      </div>

      {/* Chart + recent exceptions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Match rate trend */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Match Rate Trend</h3>
              <p className="text-xs text-gray-400 mt-0.5">Monthly reconciliation performance</p>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="matchGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(v: number) => [`${v.toFixed(1)}%`, 'Match Rate']}
                />
                <Area type="monotone" dataKey="matchRate" stroke="#059669" strokeWidth={2} fill="url(#matchGrad)" dot={{ fill: '#059669', r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
              No completed reconciliations yet
            </div>
          )}
        </div>

        {/* Exception summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Exceptions</h3>
            <Link to="/exceptions" className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Open', count: exceptions.filter(e => e.status === 'OPEN').length, color: 'text-blue-600 bg-blue-50' },
              { label: 'Under Review', count: exceptions.filter(e => e.status === 'UNDER_REVIEW').length, color: 'text-purple-600 bg-purple-50' },
              { label: 'Escalated', count: exceptions.filter(e => e.status === 'ESCALATED').length, color: 'text-orange-600 bg-orange-50' },
              { label: 'Resolved', count: exceptions.filter(e => e.status === 'RESOLVED').length, color: 'text-emerald-600 bg-emerald-50' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{label}</span>
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', color)}>{count}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>High priority open</span>
              <span className="font-medium text-red-600">
                {exceptions.filter(e => e.priority === 'HIGH' && e.status !== 'RESOLVED').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent jobs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Recent Reconciliations</h3>
          <Link to="/reconcile" className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Table — desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Reconciliation', 'Period', 'Match Rate', 'Exceptions', 'Variance', 'Run By', 'Date'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-400 px-5 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {jobs.slice(0, 5).map(job => (
                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link to={`/reconcile/${job.id}`} className="font-medium text-navy-800 hover:text-amber-700">
                      {job.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{job.period}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${job.results.matchRate}%` }}
                        />
                      </div>
                      <span className={cn('font-mono text-xs', job.results.matchRate >= 90 ? 'text-emerald-600' : job.results.matchRate >= 70 ? 'text-amber-600' : 'text-red-600')}>
                        {formatPct(job.results.matchRate)}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-amber-700">
                      {job.results.partial + job.results.unmatchedA + job.results.unmatchedB}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-700">
                    {formatNGN(job.results.totalVariance).replace('NGN', '₦')}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{job.createdBy}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{formatDateTime(job.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {jobs.slice(0, 3).map(job => (
            <Link key={job.id} to={`/reconcile/${job.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <div className="min-w-0">
                <div className="font-medium text-sm text-gray-900 truncate">{job.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{job.period} · {job.createdBy}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={cn('font-mono text-xs font-semibold', job.results.matchRate >= 90 ? 'text-emerald-600' : 'text-amber-600')}>
                  {formatPct(job.results.matchRate)}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatTile({
  label,
  value,
  sub,
  icon,
  accent,
  alert,
}: {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  accent: 'navy' | 'green' | 'amber' | 'red'
  alert?: boolean
}) {
  return (
    <div className={cn(
      'bg-white rounded-lg border p-4 flex flex-col gap-2 transition-shadow hover:shadow-sm',
      alert ? 'border-amber-200' : 'border-gray-200'
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <div className={cn(
          'w-7 h-7 rounded flex items-center justify-center',
          accent === 'navy' ? 'bg-slate-100' :
          accent === 'green' ? 'bg-emerald-50' :
          accent === 'amber' ? 'bg-amber-50' : 'bg-red-50'
        )}>
          {icon}
        </div>
      </div>
      <div>
        <div className="text-xl font-semibold text-gray-900 font-mono tabular">{value}</div>
        <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
      </div>
    </div>
  )
}
