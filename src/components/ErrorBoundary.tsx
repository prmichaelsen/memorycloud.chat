import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  name?: string
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name ?? 'unknown'}]`, error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="p-4 text-sm text-red-400 bg-red-950/30 rounded-lg m-2">
          <p className="font-medium">{this.props.name ?? 'Component'} crashed</p>
          <p className="mt-1 text-xs text-red-500/70 font-mono">{this.state.error?.message}</p>
        </div>
      )
    }
    return this.props.children
  }
}
