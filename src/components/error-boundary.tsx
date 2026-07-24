import { AlertTriangle, RefreshCcw } from 'lucide-react'
import React, { Component, ErrorInfo, ReactNode } from 'react'

import { Button } from './ui/button'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="m-4 flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-destructive/20 bg-destructive/5 p-8 text-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">
              Ops! Algo deu errado
            </h3>
            <p className="max-w-[300px] text-sm text-muted-foreground">
              O componente falhou ao carregar. Isso pode ser um erro temporário.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
