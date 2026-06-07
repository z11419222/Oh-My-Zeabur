import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button, Typography, Space } from '@douyinfe/semi-ui'

const { Title, Paragraph } = Typography

interface ErrorBoundaryProps {
  children: ReactNode
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unexpected render error',
    }
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // Surface the failure to devtools; swap for a real logger in production.
    console.error('ErrorBoundary caught a render error', error, info)
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, message: '' })
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, message: '' })
    this.props.onReset?.()
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div
        style={{
          padding: 48,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <Title heading={3}>页面出现异常 / Something went wrong</Title>
        <Paragraph type="tertiary" style={{ maxWidth: 480, wordBreak: 'break-word' }}>
          {this.state.message}
        </Paragraph>
        <Space>
          <Button theme="solid" type="primary" onClick={this.handleReset}>
            返回首页
          </Button>
          <Button theme="light" onClick={this.handleRetry}>
            重试
          </Button>
        </Space>
      </div>
    )
  }
}

export default ErrorBoundary
