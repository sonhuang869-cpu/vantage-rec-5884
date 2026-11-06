import { useEffect, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, XCircle, Clock, ChevronDown,
  RefreshCw, Search, MessageSquare, ArrowRight, Filter
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { formatNGN, formatDate, formatDateTime, cn } from '@/lib/utils'
import type { ExceptionItem, ExceptionStatus } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { toast } from 'sonner'

const STATUS_OPTIONS: ExceptionStatus[] = ['OPEN', 'UNDER_REVIEW', 'APPROVED', 'DISPUTED', 'ESCALATED', 'RESOLVED']

export function Exceptions() {
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [selected, setSelected] = useState<ExceptionItem | null>(null)
  const [comment, setComment] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    api.getExceptions().then(e => {
      setExceptions(e)
      setLoading(false)
    })
  }, [])

  const filtered = exceptions.filter(exc => {
    const ref = exc.matchItem.sourceA?.reference || exc.matchItem.sourceB?.reference || ''
    const sec = exc.matchItem.sourceA?.security || exc.matchItem.sourceB?.security || ''
    const q = search.toLowerCase()
    const matchSearch = !q || ref.toLowerCase().includes(q) || sec.toLowerCase().includes(q) ||
      exc.reconciliationName.toLowerCase().includes(q) || exc.id.toLowerCase().includes(q)
    const matchStatus = filterStatus === 'all' || exc.status === filterStatus
    const matchPriority = filterPriority === 'all' || exc.priority === filterPriority
    return matchSearch && matchStatus && matchPriority
  })

  const openCount = exceptions.filter(e => e.status === 'OPEN').length
  const reviewCount = exceptions.filter(e => e.status === 'UNDER_REVIEW').length
  const resolvedCount = exceptions.filter(e => e.status === 'RESOLVED').length

  const handleAction = async (exc: ExceptionItem, newStatus: ExceptionStatus) => {
    setActionLoading(true)
    try {
      const updated = await api.updateExceptionStatus(exc.id, newStatus, comment || undefined, 'Adaeze Okonkwo')
      setExceptions(prev => prev.map(e => e.id === updated.id ? updated : e))
      setSelected(updated)
      setComment('')
      toast.success(`Exception ${newStatus.toLowerCase().replace('_', ' ')}`)
    } catch {
      toast.error('Action failed — please try again')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!selected || !comment.trim()) return
    setActionLoading(true)
    try {
      const updated = await api.addComment(selected.id, comment.trim(), 'Adaeze Okonkwo')
      setExceptions(prev => prev.map(e => e.id === updated.id ? updated : e))
      setSelected(updated)
      setComment('')
      toast.success('Comment added')
    } catch {
      toast.error('Failed to add comment')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Exception Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">Review, approve, and resolve reconciliation discrepancies</p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <div className="text-xs text-blue-600 font-medium">Open</div>
          <div className="text-2xl font-mono font-semibold text-blue-700 mt-0.5">{openCount}</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
          <div className="text-xs text-purple-600 font-medium">Under Review</div>
          <div className="text-2xl font-mono font-semibold text-purple-700 mt-0.5">{reviewCount}</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
          <div className="text-xs text-emerald-600 font-medium">Resolved</div>
          <div className="text-2xl font-mono font-semibold text-emerald-700 mt-0.5">{resolvedCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input placeholder="Search exceptions…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Exception ID', 'Reconciliation', 'Security / Reference', 'Type', 'Variance (₦)', 'Priority', 'Status', 'Assigned To', ''].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-5 py-10 text-center text-sm text-gray-400">No exceptions match your filters</td></tr>
                ) : filtered.map(exc => {
                  const tx = exc.matchItem.sourceA || exc.matchItem.sourceB!
                  return (
                    <tr key={exc.id} className="hover:bg-gray-50/60 transition-colors cursor-pointer" onClick={() => setSelected(exc)}>
                      <td className="px-5 py-3 font-mono text-xs text-gray-600">{exc.id}</td>
                      <td className="px-5 py-3 max-w-[160px]">
                        <div className="text-xs text-gray-700 truncate">{exc.reconciliationName}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">{tx.securityCode}</div>
                        <div className="text-xs font-mono text-gray-400">{tx.reference}</div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={exc.matchItem.status === 'PARTIAL' ? 'partial' : 'unmatched'}>
                          {exc.matchItem.status === 'PARTIAL' ? 'Partial' : exc.matchItem.status === 'UNMATCHED_A' ? 'Only in A' : 'Only in B'}
                        </Badge>
                      </td>
                      <td className={cn('px-5 py-3 font-mono text-xs font-medium', Math.abs(exc.matchItem.variance) > 0 ? 'text-red-600' : 'text-gray-500')}>
                        {formatNGN(Math.abs(exc.matchItem.variance)).replace('NGN', '₦')}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={exc.priority.toLowerCase() as 'high' | 'medium' | 'low'}>{exc.priority}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={statusVariant(exc.status)}>{statusLabel(exc.status)}</Badge>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">{exc.assignedTo || '—'}</td>
                      <td className="px-5 py-3">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map(exc => {
              const tx = exc.matchItem.sourceA || exc.matchItem.sourceB!
              return (
                <button key={exc.id} className="w-full text-left px-4 py-3 hover:bg-gray-50" onClick={() => setSelected(exc)}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm text-gray-900">{tx.securityCode}</div>
                      <div className="text-xs font-mono text-gray-400 mt-0.5">{exc.id}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={statusVariant(exc.status)} className="text-[10px]">{statusLabel(exc.status)}</Badge>
                      <Badge variant={exc.priority.toLowerCase() as 'high' | 'medium' | 'low'} className="text-[10px]">{exc.priority}</Badge>
                    </div>
                  </div>
                  <div className="mt-1.5 text-xs text-gray-400">
                    {formatNGN(Math.abs(exc.matchItem.variance)).replace('NGN', '₦')} variance
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.id}
                  <Badge variant={priorityVariant(selected.priority)}>{selected.priority}</Badge>
                </DialogTitle>
                <DialogDescription>{selected.reconciliationName}</DialogDescription>
              </DialogHeader>

              <div className="px-6 space-y-4">
                {/* Transaction detail */}
                <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
                  {[
                    ['Security', (selected.matchItem.sourceA || selected.matchItem.sourceB)?.security],
                    ['Reference', (selected.matchItem.sourceA || selected.matchItem.sourceB)?.reference],
                    ['Value Date', formatDate((selected.matchItem.sourceA || selected.matchItem.sourceB)?.valueDate || '')],
                    ['Amount (A)', selected.matchItem.sourceA ? formatNGN(selected.matchItem.sourceA.amount).replace('NGN', '₦') : '—'],
                    ['Amount (B)', selected.matchItem.sourceB ? formatNGN(selected.matchItem.sourceB.amount).replace('NGN', '₦') : '—'],
                    ['Variance', formatNGN(Math.abs(selected.matchItem.variance)).replace('NGN', '₦')],
                    ['Matched On', selected.matchItem.matchedOn.join(', ') || 'None'],
                    ['Status', statusLabel(selected.status)],
                    ['Assigned To', selected.assignedTo || 'Unassigned'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex px-4 py-2 gap-4">
                      <span className="text-gray-400 w-24 flex-shrink-0 text-xs">{k}</span>
                      <span className="text-gray-900 text-xs font-medium">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Comments */}
                {selected.comments.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Comments</div>
                    {selected.comments.map(c => (
                      <div key={c.id} className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-700 text-xs">{c.author}</span>
                          <span className="text-xs text-gray-400">{formatDateTime(c.createdAt)}</span>
                        </div>
                        <div className="text-gray-600 text-xs">{c.text}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add comment */}
                {selected.status !== 'RESOLVED' && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Add a comment…"
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {selected.status !== 'RESOLVED' && (
                <DialogFooter className="flex-row gap-2">
                  <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => handleAction(selected, 'UNDER_REVIEW')}>
                    Mark Under Review
                  </Button>
                  <Button size="sm" variant="destructive" disabled={actionLoading} onClick={() => handleAction(selected, 'ESCALATED')}>
                    Escalate
                  </Button>
                  <Button size="sm" variant="primary" disabled={actionLoading} onClick={() => handleAction(selected, 'RESOLVED')}>
                    {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Resolve
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function statusLabel(s: ExceptionStatus): string {
  const map: Record<ExceptionStatus, string> = {
    OPEN: 'Open',
    UNDER_REVIEW: 'Under Review',
    APPROVED: 'Approved',
    DISPUTED: 'Disputed',
    ESCALATED: 'Escalated',
    RESOLVED: 'Resolved',
  }
  return map[s]
}

function statusVariant(s: ExceptionStatus) {
  const map: Record<ExceptionStatus, string> = {
    OPEN: 'open',
    UNDER_REVIEW: 'review',
    APPROVED: 'matched',
    DISPUTED: 'disputed',
    ESCALATED: 'escalated',
    RESOLVED: 'resolved',
  }
  return map[s] as Parameters<typeof Badge>[0]['variant']
}

function priorityVariant(p: string) {
  if (p === 'HIGH') return 'high' as const
  if (p === 'MEDIUM') return 'medium' as const
  return 'low' as const
}
