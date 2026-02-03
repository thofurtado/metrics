
import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
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
        error: null
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
                <div className="flex flex-col items-center justify-center p-8 m-4 border-2 border-dashed rounded-xl bg-destructive/5 border-destructive/20 min-h-[200px] gap-4 text-center">
                    <div className="p-3 rounded-full bg-destructive/10">
                        <AlertTriangle className="w-8 h-8 text-destructive" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-foreground">Ops! Algo deu errado</h3>
                        <p className="text-sm text-muted-foreground max-w-[300px]">
                            O componente falhou ao carregar. Isso pode ser um erro temporário.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={this.handleReset}
                        className="gap-2"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Tentar novamente
                    </Button>
                </div>
            )
        }

        return this.props.children
    }
}
