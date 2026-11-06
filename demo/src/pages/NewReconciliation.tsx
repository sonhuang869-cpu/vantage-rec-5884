import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, ChevronRight, ChevronLeft, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react'
import Papa from 'papaparse'
import { api } from '@/lib/api'
import { buildOctoberDataset } from '@/lib/seed-data'
import type { Transaction, ReconciliationConfig } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, formatNGN } from '@/lib/utils'
import { toast } from 'sonner'

type Step = 1 | 2 | 3

const STEPS = [
  { n: 1 as Step, label: 'Source A' },
  { n: 2 as Step, label: 'Source B' },
  { n: 3 as Step, label: 'Configure & Run' },
]

function parseCsvToTransactions(raw: string, source: 'A' | 'B'): Transaction[] {
  const result = Papa.parse<Record<string, string>>(raw, { header: true, skipEmptyLines: true })
  return result.data.map((row, i) => ({
    id: `${source}-csv-${i}`,
    reference: row.reference || row.Reference || row.ref || `REF-${i}`,
    valueDate: row.valueDate || row.value_date || row.date || new Date().toISOString().slice(0, 10),
    tradeDate: row.tradeDate || row.trade_date || row.date || new Date().toISOString().slice(0, 10),
    security: row.security || row.Security || 'Unknown Security',
    securityCode: row.securityCode || row.security_code || 'UNK',
    assetClass: (row.assetClass as Transaction['assetClass']) || 'EQUITY',
    transactionType: (row.transactionType as Transaction['transactionType']) || 'EQUITY_BUY',
    quantity: parseFloat(row.quantity || row.qty || '0'),
    price: parseFloat(row.price || '0'),
    amount: parseFloat(row.amount || row.Amount || '0'),
    currency: 'NGN',
    counterparty: row.counterparty || 'Unknown',
    portfolio: row.portfolio || 'Default',
    narration: row.narration || row.description || '',
  }))
}

export function NewReconciliation() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [running, setRunning] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [period, setPeriod] = useState('')
  const [sourceALabel, setSourceALabel] = useState('')
  const [sourceBLabel, setSourceBLabel] = useState('')
  const [sourceAName, setSourceAName] = useState('')
  const [sourceBName, setSourceBName] = useState('')
  const [sourceAData, setSourceAData] = useState<Transaction[]>([])
  const [sourceBData, setSourceBData] = useState<Transaction[]>([])
  const [sourceAMode, setSourceAMode] = useState<'sample' | 'upload'>('sample')
  const [sourceBMode, setSourceBMode] = useState<'sample' | 'upload'>('sample')
  const [config, setConfig] = useState<ReconciliationConfig>({
    primaryKey: 'reference',
    amountTolerance: 1000,
    dateTolerance: 1,
    matchFields: ['reference', 'amount', 'valueDate'],
  })

  const useSampleData = useCallback(() => {
    const { sourceA, sourceB } = buildOctoberDataset()
    setSourceAData(sourceA)
    setSourceBData(sourceB)
    setSourceAName('prestige_am_nov2024.csv')
    setSourceBName('firstcustodian_nov2024.csv')
    if (!sourceALabel) setSourceALabel('Prestige Asset Management (Book)')
    if (!sourceBLabel) setSourceBLabel('First Custodian Nigeria (Statement)')
  }, [sourceALabel, sourceBLabel])

  const handleFileA = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSourceAName(file.name)
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const txns = parseCsvToTransactions(ev.target?.result as string, 'A')
        setSourceAData(txns)
        toast.success(`Loaded ${txns.length} records from ${file.name}`)
      } catch {
        toast.error('Failed to parse CSV file')
      }
    }
    reader.readAsText(file)
  }

  const handleFileB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSourceBName(file.name)
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const txns = parseCsvToTransactions(ev.target?.result as string, 'B')
        setSourceBData(txns)
        toast.success(`Loaded ${txns.length} records from ${file.name}`)
      } catch {
        toast.error('Failed to parse CSV file')
      }
    }
    reader.readAsText(file)
  }

  const canProceed = () => {
    if (step === 1) return sourceAData.length > 0
    if (step === 2) return sourceBData.length > 0
    if (step === 3) return name.trim() !== '' && period.trim() !== ''
    return false
  }

  const handleNext = () => {
    if (step === 1) {
      if (sourceAMode === 'sample' && sourceAData.length === 0) useSampleData()
      setStep(2)
    } else if (step === 2) {
      if (sourceBMode === 'sample' && sourceBData.length === 0) useSampleData()
      setStep(3)
    }
  }

  const handleRun = async () => {
    if (!canProceed()) return
    setRunning(true)
    try {
      const job = await api.createJob({
        name: name.trim(),
        description: `Reconciliation: ${sourceALabel} vs ${sourceBLabel} for ${period}`,
        sourceALabel: sourceALabel || 'Source A',
        sourceBLabel: sourceBLabel || 'Source B',
        sourceAName,
        sourceBName,
        sourceAData,
        sourceBData,
        config,
        createdBy: 'Adaeze Okonkwo',
        period,
      })
      toast.success('Reconciliation completed successfully')
      navigate(`/reconcile/${job.id}`)
    } catch (err) {
      toast.error('Reconciliation failed — please try again')
      setRunning(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-enter">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-5">
        <span className="cursor-pointer hover:text-gray-600" onClick={() => navigate('/reconcile')}>Reconciliations</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-700 font-medium">New Reconciliation</span>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                step === s.n ? 'bg-amber-600 text-white' :
                step > s.n ? 'bg-emerald-600 text-white' :
                'bg-gray-200 text-gray-500'
              )}>
                {step > s.n ? <CheckCircle2 className="w-4 h-4" /> : s.n}
              </div>
              <span className={cn('text-sm font-medium hidden sm:inline', step === s.n ? 'text-gray-900' : step > s.n ? 'text-emerald-700' : 'text-gray-400')}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('flex-1 h-0.5 mx-3', step > s.n ? 'bg-emerald-400' : 'bg-gray-200')} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        {step === 1 && (
          <SourceStep
            stepNum={1}
            title="Source A — Internal Book / Portfolio System"
            description="Upload your internal portfolio management or accounting system export."
            mode={sourceAMode}
            setMode={setSourceAMode}
            fileName={sourceAName}
            recordCount={sourceAData.length}
            label={sourceALabel}
            setLabel={setSourceALabel}
            onFileChange={handleFileA}
            onUseSample={() => {
              const { sourceA, sourceB } = buildOctoberDataset()
              setSourceAData(sourceA)
              setSourceAName('prestige_am_nov2024.csv')
              if (!sourceALabel) setSourceALabel('Prestige Asset Management (Book)')
            }}
            sampleDescription="Prestige Asset Management — 32 equity & fixed income transactions (November 2024)"
          />
        )}

        {step === 2 && (
          <SourceStep
            stepNum={2}
            title="Source B — Custodian / Counterparty Statement"
            description="Upload the statement from your custodian or counterparty for the same period."
            mode={sourceBMode}
            setMode={setSourceBMode}
            fileName={sourceBName}
            recordCount={sourceBData.length}
            label={sourceBLabel}
            setLabel={setSourceBLabel}
            onFileChange={handleFileB}
            onUseSample={() => {
              const { sourceA, sourceB } = buildOctoberDataset()
              setSourceBData(sourceB)
              setSourceBName('firstcustodian_nov2024.csv')
              if (!sourceBLabel) setSourceBLabel('First Custodian Nigeria (Statement)')
            }}
            sampleDescription="First Custodian Nigeria — 33 transaction records for the same period"
          />
        )}

        {step === 3 && (
          <ConfigureStep
            name={name}
            setName={setName}
            period={period}
            setPeriod={setPeriod}
            config={config}
            setConfig={setConfig}
            sourceAData={sourceAData}
            sourceBData={sourceBData}
            sourceALabel={sourceALabel}
            sourceBLabel={sourceBLabel}
          />
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep((step - 1) as Step) : navigate('/reconcile')}
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          {step < 3 ? (
            <Button variant="primary" onClick={handleNext} disabled={!canProceed() && sourceAMode !== 'sample' && sourceBMode !== 'sample'}>
              Continue
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button variant="primary" onClick={handleRun} disabled={running || !canProceed()}>
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running reconciliation…
                </>
              ) : (
                <>Run Reconciliation</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function SourceStep({
  stepNum, title, description, mode, setMode, fileName, recordCount,
  label, setLabel, onFileChange, onUseSample, sampleDescription,
}: {
  stepNum: number
  title: string
  description: string
  mode: 'sample' | 'upload'
  setMode: (m: 'sample' | 'upload') => void
  fileName: string
  recordCount: number
  label: string
  setLabel: (v: string) => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onUseSample: () => void
  sampleDescription: string
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2 block">
          Source Label
        </label>
        <Input
          placeholder={`e.g. Prestige AM Book (${stepNum === 1 ? 'Oct' : 'Oct'} 2024)`}
          value={label}
          onChange={e => setLabel(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { setMode('sample'); onUseSample() }}
          className={cn(
            'flex-1 rounded-lg border-2 p-3 text-left transition-all',
            mode === 'sample' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
          )}
        >
          <div className="font-medium text-sm text-gray-900 mb-1">Use sample data</div>
          <div className="text-xs text-gray-500">{sampleDescription}</div>
        </button>
        <button
          onClick={() => setMode('upload')}
          className={cn(
            'flex-1 rounded-lg border-2 p-3 text-left transition-all',
            mode === 'upload' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
          )}
        >
          <div className="font-medium text-sm text-gray-900 mb-1">Upload CSV file</div>
          <div className="text-xs text-gray-500">Upload your own transaction export (CSV)</div>
        </button>
      </div>

      {mode === 'upload' && (
        <label className="block">
          <div className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            recordCount > 0 ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:border-amber-400 hover:bg-amber-50/40'
          )}>
            {recordCount > 0 ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <div className="text-sm font-medium text-gray-900">{fileName}</div>
                <div className="text-xs text-emerald-600">{recordCount} records loaded</div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-7 h-7 text-gray-400" />
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-amber-600">Click to upload</span> or drag and drop
                </div>
                <div className="text-xs text-gray-400">CSV files only</div>
              </div>
            )}
          </div>
          <input type="file" accept=".csv" className="sr-only" onChange={onFileChange} />
        </label>
      )}

      {mode === 'sample' && recordCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{recordCount} records loaded from sample dataset</span>
        </div>
      )}
    </div>
  )
}

function ConfigureStep({
  name, setName, period, setPeriod, config, setConfig,
  sourceAData, sourceBData, sourceALabel, sourceBLabel,
}: {
  name: string
  setName: (v: string) => void
  period: string
  setPeriod: (v: string) => void
  config: ReconciliationConfig
  setConfig: (c: ReconciliationConfig) => void
  sourceAData: Transaction[]
  sourceBData: Transaction[]
  sourceALabel: string
  sourceBLabel: string
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Configure & Run</h3>
        <p className="text-sm text-gray-500 mt-1">Set reconciliation parameters and review the sources before running.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
          <div className="text-xs font-medium text-gray-500 mb-1">Source A</div>
          <div className="text-sm font-medium text-gray-900 truncate">{sourceALabel || 'Source A'}</div>
          <div className="text-xs text-gray-400 mt-0.5">{sourceAData.length} records</div>
        </div>
        <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
          <div className="text-xs font-medium text-gray-500 mb-1">Source B</div>
          <div className="text-sm font-medium text-gray-900 truncate">{sourceBLabel || 'Source B'}</div>
          <div className="text-xs text-gray-400 mt-0.5">{sourceBData.length} records</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5 block">
            Reconciliation Name <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="e.g. PAM vs First Custodian — Nov 2024"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5 block">
            Period <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="e.g. November 2024"
            value={period}
            onChange={e => setPeriod(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5 block">
          Primary Match Key
        </label>
        <Select
          value={config.primaryKey}
          onValueChange={v => setConfig({ ...config, primaryKey: v as ReconciliationConfig['primaryKey'] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reference">Transaction Reference (recommended)</SelectItem>
            <SelectItem value="amount_date">Amount + Value Date</SelectItem>
            <SelectItem value="custom">Custom fields</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5 block">
            Amount Tolerance (₦)
          </label>
          <Input
            type="number"
            value={config.amountTolerance}
            onChange={e => setConfig({ ...config, amountTolerance: parseFloat(e.target.value) || 0 })}
            min={0}
          />
          <p className="text-xs text-gray-400 mt-1">Max acceptable amount difference</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5 block">
            Date Tolerance (days)
          </label>
          <Input
            type="number"
            value={config.dateTolerance}
            onChange={e => setConfig({ ...config, dateTolerance: parseInt(e.target.value) || 0 })}
            min={0}
            max={5}
          />
          <p className="text-xs text-gray-400 mt-1">Settlement date variance allowed</p>
        </div>
      </div>
    </div>
  )
}
