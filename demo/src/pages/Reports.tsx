import { useEffect, useState } from 'react'
import { RefreshCw, Download, FileText, BarChart2, TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'
import { api } from '@/lib/api'
import { formatNGN, formatPct, cn } from '@/lib/utils'
import type { ReconciliationJob } from '@/types'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function Reports() {
  const [jobs, setJobs] = useState<ReconciliationJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getJobs().then(j => { setJobs(j); setLoading(false) })
  }, [])

  const completed = jobs.filter(j => j.status === 'COMPLETED')

  const trendData = [...completed]
    .reverse()
    .map(j => ({
      period: j.period.replace(' 2024', ''),
      matched: j.results.matched,
      partial: j.results.partial,
      unmatchedA: j.results.unmatchedA,
      unmatchedB: j.results.unmatchedB,
      matchRate: j.results.matchRate,
      variance: j.results.totalVariance / 1_000_000,
    }))

  const latestJob = completed[0]
  const pieData = latestJob ? [
    { name: 'Matched', value: latestJob.results.matched, fill: '#059669' },
    { name: 'Partial', value: latestJob.results.partial, fill: '#D97706' },
    { name: 'Unmatched A', value: latestJob.results.unmatchedA, fill: '#DC2626' },
    { name: 'Unmatched B', value: latestJob.results.unmatchedB, fill: '#EF4444' },
  ].filter(d => d.value > 0) : []

  const totalMatchRate = completed.length > 0
    ? completed.reduce((s, j) => s + j.results.matchRate, 0) / completed.length : 0
  const totalVariance = completed.reduce((s, j) => s + j.results.totalVariance, 0)
  const totalExceptions = completed.reduce((s, j) => s + j.results.partial + j.results.unmatchedA + j.results.unmatchedB, 0)

  const handleExport = (type: string) => {
    toast.success(`${type} report generated — download starting`)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-2 text-gray-400">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-6 space-y-6 animate-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-500 mt-0.5">Reconciliation performance analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('PDF')}>
            <FileText className="w-3.5 h-3.5" /> PDF Report
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('Excel')}>
            <Download className="w-3.5 h-3.5" /> Excel Export
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg. Match Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-mono font-semibold text-gray-900">{formatPct(totalMatchRate)}</div>
          <div className="text-xs text-gray-400 mt-1">across {completed.length} reconciliation runs</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Exceptions</span>
            <BarChart2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-mono font-semibold text-gray-900">{totalExceptions}</div>
          <div className="text-xs text-gray-400 mt-1">partial matches + unmatched items</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cumulative Variance</span>
            <Download className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-3xl font-mono font-semibold text-gray-900 text-sm">
            {formatNGN(totalVariance).replace('NGN', '₦')}
          </div>
          <div className="text-xs text-gray-400 mt-1">total across all runs</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Stacked bar: items per run */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Item Breakdown by Period</h3>
          <p className="text-xs text-gray-400 mb-4">Matched vs exception items per reconciliation</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trendData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6 }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="matched" name="Matched" fill="#059669" stackId="a" radius={[0,0,0,0]} />
              <Bar dataKey="partial" name="Partial" fill="#D97706" stackId="a" />
              <Bar dataKey="unmatchedA" name="Unmatched A" fill="#DC2626" stackId="a" />
              <Bar dataKey="unmatchedB" name="Unmatched B" fill="#EF4444" stackId="a" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie: latest run breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Latest Run Breakdown</h3>
          <p className="text-xs text-gray-400 mb-4">{latestJob?.name || 'No completed runs'}</p>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Variance trend */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Variance Trend (₦ Million)</h3>
        <p className="text-xs text-gray-400 mb-4">Total open variance per reconciliation period</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={trendData} margin={{ top: 0, right: 4, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `₦${v}M`} />
            <Tooltip
              contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6 }}
              formatter={(v: number) => [`₦${v.toFixed(2)}M`, 'Variance']}
            />
            <Bar dataKey="variance" name="Variance" fill="#B45309" radius={[2,2,0,0]}>
              {trendData.map((_, i) => <Cell key={i} fill={i === trendData.length - 1 ? '#D97706' : '#B45309'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-run table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Reconciliation Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Period', 'Name', 'Records A', 'Records B', 'Matched', 'Partial', 'Unmatched', 'Match Rate', 'Variance'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 px-5 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {completed.map(job => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-700 font-medium">{job.period}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs max-w-[180px] truncate">{job.name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-600">{job.results.totalA}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-600">{job.results.totalB}</td>
                  <td className="px-5 py-3 font-mono text-xs text-emerald-600">{job.results.matched}</td>
                  <td className="px-5 py-3 font-mono text-xs text-amber-600">{job.results.partial}</td>
                  <td className="px-5 py-3 font-mono text-xs text-red-600">{job.results.unmatchedA + job.results.unmatchedB}</td>
                  <td className="px-5 py-3">
                    <span className={cn('font-mono text-xs font-medium',
                      job.results.matchRate >= 90 ? 'text-emerald-600' : 'text-amber-600'
                    )}>
                      {formatPct(job.results.matchRate)}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-red-500">
                    {formatNGN(job.results.totalVariance).replace('NGN', '₦')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
