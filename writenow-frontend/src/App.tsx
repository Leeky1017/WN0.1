/**
 * WriteNow Frontend V2 - Demo Application
 * Phase 0: 基础设施验证
 */

import { useState } from 'react'
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui'
import { useRpcConnection } from '@/lib/hooks'
import { invoke } from '@/lib/rpc'
import type { ProjectBootstrapResponse, FileListResponse } from '@/types/ipc-generated'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * Connection status indicator
 */
function StatusBadge({ status }: { status: ConnectionStatus }) {
  const statusConfig: Record<ConnectionStatus, { label: string; className: string }> = {
    connecting: { label: '连接中...', className: 'bg-yellow-500' },
    connected: { label: '已连接', className: 'bg-[var(--color-success)]' },
    disconnected: { label: '未连接', className: 'bg-[var(--text-muted)]' },
    error: { label: '连接失败', className: 'bg-[var(--color-error)]' },
  }
  
  const config = statusConfig[status]
  
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm ${config.className}`}>
      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      {config.label}
    </span>
  )
}

function App() {
  const { status, isConnected, connect, error: connectionError } = useRpcConnection({
    autoConnect: false, // Manual connection for demo
  })
  
  const [projectInfo, setProjectInfo] = useState<ProjectBootstrapResponse | null>(null)
  const [fileList, setFileList] = useState<FileListResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Handle connect button click */
  const handleConnect = async () => {
    setError(null)
    try {
      await connect()
    } catch (err) {
      setError(err instanceof Error ? err.message : '连接失败')
    }
  }

  /** Test project:bootstrap API */
  const handleBootstrap = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await invoke('project:bootstrap', {})
      setProjectInfo(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'API 调用失败')
    } finally {
      setLoading(false)
    }
  }

  /** Test file:list API */
  const handleListFiles = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await invoke('file:list', {})
      setFileList(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'API 调用失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8 bg-[var(--bg-app)]">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            WriteNow Frontend V2
          </h1>
          <p className="text-[var(--text-secondary)]">
            Phase 0: 基础设施验证 - Vite + React + TypeScript + Tailwind + shadcn/ui + RPC
          </p>
        </header>

        {/* Connection Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>后端连接</CardTitle>
              <StatusBadge status={status} />
            </div>
            <CardDescription>
              WebSocket JSON-RPC 连接到 Theia 后端服务
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Input
                value="ws://localhost:3000/standalone-rpc"
                readOnly
                className="flex-1"
              />
              <Button
                onClick={handleConnect}
                disabled={isConnected || status === 'connecting'}
              >
                {status === 'connecting' ? '连接中...' : isConnected ? '已连接' : '连接'}
              </Button>
            </div>
            {connectionError && (
              <p className="mt-2 text-sm text-[var(--color-error)]">{connectionError}</p>
            )}
          </CardContent>
        </Card>

        {/* Component Demo Card */}
        <Card>
          <CardHeader>
            <CardTitle>组件演示</CardTitle>
            <CardDescription>
              shadcn/ui 基础组件（使用 Design Tokens）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Button variants */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-[var(--text-secondary)]">Button 变体</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link</Button>
              </div>
            </div>

            {/* Button sizes */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-[var(--text-secondary)]">Button 尺寸</h3>
              <div className="flex items-center gap-2">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon">+</Button>
              </div>
            </div>

            {/* Input */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-[var(--text-secondary)]">Input</h3>
              <div className="max-w-sm space-y-2">
                <Input placeholder="请输入文本..." />
                <Input placeholder="禁用状态" disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RPC Test Card */}
        <Card>
          <CardHeader>
            <CardTitle>RPC 接口测试</CardTitle>
            <CardDescription>
              验证与 Theia 后端的端到端通路
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={handleBootstrap} disabled={!isConnected || loading}>
                {loading ? '加载中...' : 'project:bootstrap'}
              </Button>
              <Button onClick={handleListFiles} disabled={!isConnected || loading} variant="outline">
                {loading ? '加载中...' : 'file:list'}
              </Button>
            </div>

            {error && (
              <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/30">
                <p className="text-sm text-[var(--color-error)]">{error}</p>
              </div>
            )}

            {projectInfo && (
              <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-input)] space-y-2">
                <h4 className="font-medium text-[var(--text-primary)]">项目信息</h4>
                <pre className="text-sm text-[var(--text-secondary)] font-mono overflow-auto">
                  {JSON.stringify(projectInfo, null, 2)}
                </pre>
              </div>
            )}

            {fileList && (
              <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-input)] space-y-2">
                <h4 className="font-medium text-[var(--text-primary)]">文件列表</h4>
                <pre className="text-sm text-[var(--text-secondary)] font-mono overflow-auto max-h-60">
                  {JSON.stringify(fileList, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <p className="text-sm text-[var(--text-muted)]">
              {isConnected 
                ? '已连接到后端，点击按钮测试 API' 
                : '请先连接到后端服务'}
            </p>
          </CardFooter>
        </Card>

        {/* Theme Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Design Tokens 预览</CardTitle>
            <CardDescription>
              Cursor/Linear 风格的深色主题配色
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="h-12 rounded-[var(--radius-md)] bg-[var(--bg-app)]" />
                <p className="text-xs text-[var(--text-muted)]">--bg-app</p>
              </div>
              <div className="space-y-1">
                <div className="h-12 rounded-[var(--radius-md)] bg-[var(--bg-sidebar)]" />
                <p className="text-xs text-[var(--text-muted)]">--bg-sidebar</p>
              </div>
              <div className="space-y-1">
                <div className="h-12 rounded-[var(--radius-md)] bg-[var(--bg-panel)]" />
                <p className="text-xs text-[var(--text-muted)]">--bg-panel</p>
              </div>
              <div className="space-y-1">
                <div className="h-12 rounded-[var(--radius-md)] bg-[var(--accent)]" />
                <p className="text-xs text-[var(--text-muted)]">--accent</p>
              </div>
              <div className="space-y-1">
                <div className="h-12 rounded-[var(--radius-md)] bg-[var(--color-success)]" />
                <p className="text-xs text-[var(--text-muted)]">--color-success</p>
              </div>
              <div className="space-y-1">
                <div className="h-12 rounded-[var(--radius-md)] bg-[var(--color-warning)]" />
                <p className="text-xs text-[var(--text-muted)]">--color-warning</p>
              </div>
              <div className="space-y-1">
                <div className="h-12 rounded-[var(--radius-md)] bg-[var(--color-error)]" />
                <p className="text-xs text-[var(--text-muted)]">--color-error</p>
              </div>
              <div className="space-y-1">
                <div className="h-12 rounded-[var(--radius-md)] border border-[var(--border-default)]" />
                <p className="text-xs text-[var(--text-muted)]">--border-default</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center text-sm text-[var(--text-muted)]">
          WriteNow Frontend V2 · Phase 0 验证完成
        </footer>
      </div>
    </div>
  )
}

export default App
