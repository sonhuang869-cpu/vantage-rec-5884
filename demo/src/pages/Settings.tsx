import { useState } from 'react'
import { RefreshCw, Trash2, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export function Settings() {
  const [resetting, setResetting] = useState(false)
  const [orgName, setOrgName] = useState('Prestige Asset Management')
  const [custodian, setCustodian] = useState('First Custodian Nigeria Ltd')

  const handleReset = async () => {
    setResetting(true)
    await new Promise(r => setTimeout(r, 600))
    api.resetDemo()
    setResetting(false)
    toast.success('Demo data reset to defaults')
    window.location.href = '/'
  }

  return (
    <div className="p-4 md:p-6 max-w-xl space-y-6 animate-enter">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-0.5">Organisation and demo configuration</p>
      </div>

      {/* Organisation */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Organisation Details</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5 block">
              Organisation Name
            </label>
            <Input value={orgName} onChange={e => setOrgName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5 block">
              Default Custodian
            </label>
            <Input value={custodian} onChange={e => setCustodian(e.target.value)} />
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => toast.success('Settings saved')}>
          Save Changes
        </Button>
      </div>

      {/* Users */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Team Members</h3>
        <div className="space-y-3">
          {[
            { name: 'Adaeze Okonkwo', role: 'Operations Lead', initials: 'AO' },
            { name: 'Emeka Nwosu', role: 'Finance Analyst', initials: 'EN' },
            { name: 'Chidi Eze', role: 'Investment Manager', initials: 'CE' },
          ].map(u => (
            <div key={u.name} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-navy-800 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-white">{u.initials}</span>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{u.name}</div>
                <div className="text-xs text-gray-400">{u.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Matching defaults */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Default Matching Configuration</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5 block">Amount Tolerance (₦)</label>
            <Input type="number" defaultValue={1000} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5 block">Date Tolerance (days)</label>
            <Input type="number" defaultValue={1} min={0} max={5} />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => toast.success('Defaults updated')}>
          Update Defaults
        </Button>
      </div>

      {/* Demo reset */}
      <div className="bg-red-50 rounded-lg border border-red-200 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <h3 className="text-sm font-semibold text-red-800">Reset Demo Data</h3>
        </div>
        <p className="text-xs text-red-600">
          This will clear all reconciliation history and reload the original sample data. Use this to restore the demo to its default state.
        </p>
        <Button variant="destructive" size="sm" onClick={handleReset} disabled={resetting}>
          {resetting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          {resetting ? 'Resetting…' : 'Reset Demo Data'}
        </Button>
      </div>
    </div>
  )
}
