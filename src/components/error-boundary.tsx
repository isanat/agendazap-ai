'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Error caught by boundary:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full border-red-200 bg-red-50 dark:bg-red-950/20">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Algo deu errado!</h2>
          <p className="text-muted-foreground mb-4">
            Ocorreu um erro inesperado. Por favor, tente novamente.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Recarregar Página
            </Button>
            <Button onClick={reset}>
              Tentar Novamente
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-4 p-2 bg-muted rounded text-xs text-left overflow-auto max-h-32">
              {error.message}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
