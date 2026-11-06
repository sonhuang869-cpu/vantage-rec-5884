import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { ReconciliationList } from '@/pages/ReconciliationList'
import { NewReconciliation } from '@/pages/NewReconciliation'
import { ReconciliationDetail } from '@/pages/ReconciliationDetail'
import { Exceptions } from '@/pages/Exceptions'
import { Reports } from '@/pages/Reports'
import { Settings } from '@/pages/Settings'
import { NotFound } from '@/pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { fontSize: '13px' },
        }}
      />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/reconcile" element={<ReconciliationList />} />
          <Route path="/reconcile/new" element={<NewReconciliation />} />
          <Route path="/reconcile/:id" element={<ReconciliationDetail />} />
          <Route path="/exceptions" element={<Exceptions />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
