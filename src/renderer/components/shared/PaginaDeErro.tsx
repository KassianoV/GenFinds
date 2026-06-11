import React, { useState } from 'react'
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

interface PaginaDeErroProps {
  error: Error
  onReset: () => void
}

export function PaginaDeErro({ error, onReset }: PaginaDeErroProps): React.JSX.Element {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-64 px-6 py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
        <AlertTriangle size={24} className="text-red-500" />
      </div>

      <h2 className="text-base font-semibold text-foreground mb-1">
        Algo deu errado
      </h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        Ocorreu um erro inesperado nesta página. Tente novamente ou reinicie o aplicativo.
      </p>

      <button
        onClick={onReset}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        <RefreshCw size={14} />
        Tentar novamente
      </button>

      <button
        onClick={() => setShowDetails((v) => !v)}
        className="flex items-center gap-1 mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {showDetails ? 'Ocultar detalhes' : 'Ver detalhes do erro'}
      </button>

      {showDetails && (
        <div className="mt-3 w-full max-w-md text-left bg-muted rounded-lg p-3 overflow-auto max-h-40">
          <p className="text-xs font-mono text-red-500 break-all whitespace-pre-wrap">
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ''}
          </p>
        </div>
      )}
    </div>
  )
}
