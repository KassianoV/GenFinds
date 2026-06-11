import React from 'react'
import { PaginaDeErro } from './PaginaDeErro'
import { isElectron } from '../../services/platform'

interface Props {
  children: React.ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const message = error.message ?? 'Unknown error'
    const stack = info.componentStack ?? error.stack ?? ''

    if (isElectron() && window.api?.app?.logError) {
      void window.api.app.logError(message, stack)
    } else {
      console.error('[ErrorBoundary]', message, stack)
    }
  }

  handleReset = (): void => {
    this.setState({ error: null })
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return <PaginaDeErro error={this.state.error} onReset={this.handleReset} />
    }
    return this.props.children
  }
}
