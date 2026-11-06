import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <RefreshCw className="w-5 h-5 text-gray-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Page not found</h2>
      <p className="text-sm text-gray-400 mb-5">The page you are looking for does not exist or has been moved.</p>
      <Button variant="primary" asChild>
        <Link to="/">Back to Dashboard</Link>
      </Button>
    </div>
  )
}
