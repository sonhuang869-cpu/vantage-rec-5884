import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu, Bell } from 'lucide-react'
import { Sidebar } from './Sidebar'

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/reconcile': 'Reconciliations',
  '/reconcile/new': 'New Reconciliation',
  '/exceptions': 'Exception Management',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const title =
    ROUTE_TITLES[location.pathname] ??
    (location.pathname.startsWith('/reconcile/') ? 'Reconciliation Detail' : 'VantageRec')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 flex-shrink-0">
          <button
            className="lg:hidden p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 truncate">{title}</h1>
          </div>

          <div className="flex items-center gap-2">
            <button className="relative p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full" />
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="w-7 h-7 rounded-full bg-navy-800 flex items-center justify-center">
                <span className="text-xs font-semibold text-white">AO</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
