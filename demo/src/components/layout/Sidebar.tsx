import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  RefreshCw,
  AlertTriangle,
  FileBarChart2,
  Settings,
  X,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/reconcile', icon: RefreshCw, label: 'Reconciliations' },
  { to: '/exceptions', icon: AlertTriangle, label: 'Exceptions' },
  { to: '/reports', icon: FileBarChart2, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-60 flex flex-col bg-navy-900 text-white transition-transform duration-200',
          'lg:static lg:z-auto lg:translate-x-0 lg:flex',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between px-5 border-b border-navy-700">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-amber-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm leading-none">V</span>
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight">VantageRec</span>
              <div className="text-[10px] text-navy-500 leading-none mt-0.5 text-gray-400">
                Reconciliation Engine
              </div>
            </div>
          </div>
          <button
            className="lg:hidden text-gray-400 hover:text-white p-1"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <ul className="space-y-0.5">
            {NAV.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    )
                  }
                  onClick={() => onClose()}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-navy-700">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-amber-700 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-white">AO</span>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-white truncate">Adaeze Okonkwo</div>
              <div className="text-[11px] text-gray-400 truncate">Operations Lead</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
