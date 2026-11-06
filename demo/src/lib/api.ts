import type {
  ReconciliationJob,
  ReconciliationConfig,
  Transaction,
  ExceptionItem,
  ExceptionStatus,
  ExceptionComment,
} from '@/types'
import { runReconciliation } from './reconciliation-engine'
import { generateSeedJobs, generateExceptions } from './seed-data'

const JOBS_KEY = 'vr_recon_jobs'
const EXCEPTIONS_KEY = 'vr_exceptions'

function loadJobs(): ReconciliationJob[] {
  try {
    const raw = localStorage.getItem(JOBS_KEY)
    if (raw) return JSON.parse(raw) as ReconciliationJob[]
  } catch {}
  return []
}

function saveJobs(jobs: ReconciliationJob[]): void {
  try {
    localStorage.setItem(JOBS_KEY, JSON.stringify(jobs))
  } catch {}
}

function loadExceptions(): ExceptionItem[] {
  try {
    const raw = localStorage.getItem(EXCEPTIONS_KEY)
    if (raw) return JSON.parse(raw) as ExceptionItem[]
  } catch {}
  return []
}

function saveExceptions(exceptions: ExceptionItem[]): void {
  try {
    localStorage.setItem(EXCEPTIONS_KEY, JSON.stringify(exceptions))
  } catch {}
}

function ensureSeeded(): void {
  const existing = loadJobs()
  if (existing.length > 0) return
  const jobs = generateSeedJobs()
  saveJobs(jobs)
  const exceptions = generateExceptions(jobs)
  saveExceptions(exceptions)
}

export const api = {
  resetDemo(): void {
    localStorage.removeItem(JOBS_KEY)
    localStorage.removeItem(EXCEPTIONS_KEY)
    ensureSeeded()
  },

  async getJobs(): Promise<ReconciliationJob[]> {
    ensureSeeded()
    await delay(120)
    return loadJobs().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  },

  async getJob(id: string): Promise<ReconciliationJob | null> {
    ensureSeeded()
    await delay(80)
    return loadJobs().find(j => j.id === id) ?? null
  },

  async createJob(params: {
    name: string
    description: string
    sourceALabel: string
    sourceBLabel: string
    sourceAName: string
    sourceBName: string
    sourceAData: Transaction[]
    sourceBData: Transaction[]
    config: ReconciliationConfig
    createdBy: string
    period: string
  }): Promise<ReconciliationJob> {
    await delay(1800) // simulate processing
    const jobs = loadJobs()
    const matchedItems = runReconciliation(params.sourceAData, params.sourceBData, params.config)

    const matched = matchedItems.filter(m => m.status === 'MATCHED').length
    const partial = matchedItems.filter(m => m.status === 'PARTIAL').length
    const unmatchedA = matchedItems.filter(m => m.status === 'UNMATCHED_A').length
    const unmatchedB = matchedItems.filter(m => m.status === 'UNMATCHED_B').length
    const totalVariance = matchedItems.reduce((s, m) => s + Math.abs(m.variance), 0)
    const totalA = params.sourceAData.length

    const job: ReconciliationJob = {
      id: `recon-${Date.now()}`,
      name: params.name,
      description: params.description,
      sourceAName: params.sourceAName,
      sourceBName: params.sourceBName,
      sourceALabel: params.sourceALabel,
      sourceBLabel: params.sourceBLabel,
      config: params.config,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      createdBy: params.createdBy,
      period: params.period,
      results: {
        totalA,
        totalB: params.sourceBData.length,
        matched,
        partial,
        unmatchedA,
        unmatchedB,
        totalVariance,
        matchRate: totalA > 0 ? Math.round(((matched + partial) / totalA) * 1000) / 10 : 0,
      },
      sourceAData: params.sourceAData,
      sourceBData: params.sourceBData,
      matchedItems,
    }

    jobs.unshift(job)
    saveJobs(jobs)

    // Generate exceptions for new job
    const existing = loadExceptions()
    const newExc = generateExceptions([job])
    saveExceptions([...existing, ...newExc])

    return job
  },

  async getExceptions(): Promise<ExceptionItem[]> {
    ensureSeeded()
    await delay(100)
    return loadExceptions()
  },

  async updateExceptionStatus(
    id: string,
    status: ExceptionStatus,
    comment?: string,
    author?: string
  ): Promise<ExceptionItem> {
    await delay(400)
    const exceptions = loadExceptions()
    const idx = exceptions.findIndex(e => e.id === id)
    if (idx === -1) throw new Error('Exception not found')

    const exc = exceptions[idx]
    exc.status = status
    exc.updatedAt = new Date().toISOString()
    if (status === 'RESOLVED') exc.resolvedAt = new Date().toISOString()
    if (comment && author) {
      exc.comments.push({
        id: `c${Date.now()}`,
        author,
        text: comment,
        createdAt: new Date().toISOString(),
      } as ExceptionComment)
    }
    saveExceptions(exceptions)
    return exc
  },

  async addComment(id: string, text: string, author: string): Promise<ExceptionItem> {
    await delay(300)
    const exceptions = loadExceptions()
    const idx = exceptions.findIndex(e => e.id === id)
    if (idx === -1) throw new Error('Exception not found')
    exceptions[idx].comments.push({
      id: `c${Date.now()}`,
      author,
      text,
      createdAt: new Date().toISOString(),
    } as ExceptionComment)
    exceptions[idx].updatedAt = new Date().toISOString()
    saveExceptions(exceptions)
    return exceptions[idx]
  },
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}
