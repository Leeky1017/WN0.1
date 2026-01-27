import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'

export type BackendLaunchOptions = {
  /**
   * Executable used to launch the backend.
   * Why: In dev we prefer the system `node` so native modules compiled for Node work without Electron rebuilds.
   * In packaged builds we fall back to the Electron runtime (`process.execPath`).
   */
  executablePath?: string
  entryPath: string
  cwd: string
  env: NodeJS.ProcessEnv
  port: number
  args?: string[]
  startupTimeoutMs?: number
  pollIntervalMs?: number
  pidFilePath?: string
  cleanupStalePid?: boolean
  preflightPortCheck?: boolean
}

export type BackendExitEvent = {
  code: number | null
  signal: NodeJS.Signals | null
}

export type BackendPidFileRecord = {
  pid: number
  port: number
  startedAt: number
}

export type BackendLauncherLogger = {
  info: (message: string) => void
  warn: (message: string) => void
  error: (message: string) => void
}

export type BackendLauncherDependencies = {
  logger: BackendLauncherLogger
  onUnexpectedExit?: (event: BackendExitEvent) => void
}

export class BackendLauncher {
  private readonly logger: BackendLauncherLogger
  private readonly onUnexpectedExit?: (event: BackendExitEvent) => void
  private process: ChildProcess | null = null
  private status: 'idle' | 'starting' | 'running' | 'stopping' = 'idle'
  private expectedExit = false
  private lastOptions: BackendLaunchOptions | null = null
  private currentPidFilePath: string | null = null

  constructor({ logger, onUnexpectedExit }: BackendLauncherDependencies) {
    this.logger = logger
    this.onUnexpectedExit = onUnexpectedExit
  }

  /**
   * Start the backend early so the renderer only loads after the RPC server is reachable.
   * Throws when the process fails to spawn, exits before readiness, or times out.
   */
  async start(options: BackendLaunchOptions): Promise<void> {
    if (this.status !== 'idle' || this.process) {
      throw new Error('Backend already started or still stopping')
    }

    if (!fs.existsSync(options.entryPath)) {
      throw new Error(`Backend entry not found: ${options.entryPath}`)
    }

    this.status = 'starting'
    this.expectedExit = false
    this.lastOptions = options
    this.currentPidFilePath = options.pidFilePath ?? null

    const startupTimeoutMs = options.startupTimeoutMs ?? 30_000
    const pollIntervalMs = options.pollIntervalMs ?? 200
    const pidFilePath = options.pidFilePath

    if (pidFilePath && options.cleanupStalePid && fs.existsSync(pidFilePath)) {
      let record: BackendPidFileRecord | null = null
      try {
        const raw = fs.readFileSync(pidFilePath, 'utf8')
        const parsed = JSON.parse(raw) as Partial<BackendPidFileRecord>
        if (typeof parsed.pid === 'number' && Number.isFinite(parsed.pid)) {
          const port = typeof parsed.port === 'number' && Number.isFinite(parsed.port) ? parsed.port : options.port
          const startedAt = typeof parsed.startedAt === 'number' ? parsed.startedAt : 0
          record = { pid: parsed.pid, port, startedAt }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.logger.warn(`[backend] failed to read stale pid file: ${message}`)
      }

      if (record && record.port === options.port) {
        /**
         * Why: WM-005 force-kills Electron; the backend can outlive the parent and keep the port busy in E2E.
         */
        const isPidAlive = (): boolean => {
          try {
            process.kill(record.pid, 0)
            return true
          } catch (error) {
            const code = (error as NodeJS.ErrnoException).code
            return code === 'EPERM'
          }
        }

        if (isPidAlive()) {
          this.logger.warn(`[backend] stale backend pid detected (pid=${record.pid}); attempting to terminate`)
          try {
            process.kill(record.pid, 'SIGTERM')
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            this.logger.warn(`[backend] failed to send SIGTERM to stale pid ${record.pid}: ${message}`)
          }

          const deadline = Date.now() + Math.min(startupTimeoutMs, 5_000)
          while (Date.now() < deadline) {
            if (!isPidAlive()) break
            await new Promise((resolve) => setTimeout(resolve, Math.min(pollIntervalMs, 250)))
          }

          if (isPidAlive()) {
            this.logger.warn(`[backend] stale pid ${record.pid} still alive; sending SIGKILL`)
            try {
              process.kill(record.pid, 'SIGKILL')
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error)
              this.logger.warn(`[backend] failed to send SIGKILL to stale pid ${record.pid}: ${message}`)
            }
          }
        }
      }

      try {
        fs.unlinkSync(pidFilePath)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.logger.warn(`[backend] failed to remove stale pid file: ${message}`)
      }
    }

    if (options.preflightPortCheck) {
      await this.waitForPortAvailable(options.port, startupTimeoutMs, pollIntervalMs)
    }

    this.logger.info(`[backend] starting: ${options.entryPath}`)

    const executablePath = options.executablePath ?? process.execPath
    const child = spawn(executablePath, [options.entryPath, ...(options.args ?? [])], {
      cwd: options.cwd,
      env: {
        ...options.env,
        ...(executablePath === process.execPath ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    this.process = child

    if (pidFilePath && child.pid) {
      try {
        const record: BackendPidFileRecord = {
          pid: child.pid,
          port: options.port,
          startedAt: Date.now(),
        }
        fs.writeFileSync(pidFilePath, JSON.stringify(record), 'utf8')
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.logger.warn(`[backend] failed to write pid file: ${message}`)
      }
    }

    child.stdout?.on('data', (data: Buffer) => {
      this.logger.info(`[backend] ${data.toString().trimEnd()}`)
    })

    child.stderr?.on('data', (data: Buffer) => {
      this.logger.error(`[backend:stderr] ${data.toString().trimEnd()}`)
    })

    child.on('exit', (code, signal) => {
      const wasExpected = this.expectedExit || this.status === 'stopping'
      this.logger.warn(`[backend] exited with code=${code ?? 'null'} signal=${signal ?? 'null'}`)
      this.process = null
      this.status = 'idle'

      if (pidFilePath) {
        try {
          fs.unlinkSync(pidFilePath)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          this.logger.warn(`[backend] failed to remove pid file: ${message}`)
        }
      }
      this.currentPidFilePath = null

      if (!wasExpected && this.onUnexpectedExit) {
        this.onUnexpectedExit({ code, signal })
      }
    })

    try {
      await Promise.race([
        this.waitForPort(options.port, startupTimeoutMs, pollIntervalMs),
        this.rejectOnExit(child, () => this.status === 'starting'),
        this.rejectOnSpawnError(child),
      ])
      this.status = 'running'
      this.logger.info('[backend] ready')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`[backend] failed to start: ${message}`)
      await this.stop(5_000)
      throw error
    }
  }

  /**
   * Stop the backend so we do not leave an orphaned process behind.
   * Escalates to SIGKILL after the grace period to guarantee cleanup.
   */
  async stop(gracePeriodMs = 5_000): Promise<void> {
    if (!this.process || this.status === 'idle') {
      return
    }

    this.status = 'stopping'
    this.expectedExit = true

    const child = this.process

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (!child.killed) {
          this.logger.warn('[backend] did not exit in time; sending SIGKILL')
          try {
            child.kill('SIGKILL')
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            this.logger.error(`[backend] SIGKILL failed: ${message}`)
          }
        }
        resolve()
      }, gracePeriodMs)

      child.once('exit', () => {
        clearTimeout(timeout)
        resolve()
      })

      try {
        child.kill('SIGTERM')
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.logger.error(`[backend] SIGTERM failed: ${message}`)
        clearTimeout(timeout)
        resolve()
      }
    })

    this.process = null
    this.status = 'idle'

    if (this.currentPidFilePath) {
      try {
        fs.unlinkSync(this.currentPidFilePath)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.logger.warn(`[backend] failed to remove pid file: ${message}`)
      }
      this.currentPidFilePath = null
    }
  }

  /**
   * Restart the backend after crashes using the last known options.
   */
  async restart(): Promise<void> {
    if (!this.lastOptions) {
      throw new Error('Backend has not been started yet')
    }

    await this.stop()
    await this.start(this.lastOptions)
  }

  /**
   * Wait for the port to accept connections so the renderer doesn't race the backend.
   */
  private async waitForPort(port: number, timeoutMs: number, pollIntervalMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs

    return new Promise((resolve, reject) => {
      const attempt = () => {
        if (Date.now() > deadline) {
          reject(new Error(`Backend start timeout after ${timeoutMs}ms`))
          return
        }

        const socket = new net.Socket()

        socket.once('connect', () => {
          socket.destroy()
          resolve()
        })

        socket.once('error', () => {
          socket.destroy()
          setTimeout(attempt, pollIntervalMs)
        })

        socket.connect(port, '127.0.0.1')
      }

      attempt()
    })
  }

  /**
   * Wait for the port to become available before launching a new backend.
   * Why: Prevent connecting to a stale backend that survived a force-kill in E2E.
   */
  private async waitForPortAvailable(port: number, timeoutMs: number, pollIntervalMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs
    let warned = false

    return new Promise((resolve, reject) => {
      const attempt = () => {
        if (Date.now() > deadline) {
          reject(new Error(`Backend port ${port} still in use after ${timeoutMs}ms`))
          return
        }

        const server = net.createServer()

        server.once('error', (error) => {
          const code = (error as NodeJS.ErrnoException).code
          if (code === 'EADDRINUSE') {
            if (!warned) {
              warned = true
              this.logger.warn(`[backend] port ${port} in use; waiting for release`)
            }
            setTimeout(attempt, pollIntervalMs)
            return
          }
          reject(error)
        })

        server.once('listening', () => {
          server.close(() => resolve())
        })

        server.listen(port, '127.0.0.1')
      }

      attempt()
    })
  }

  /**
   * Reject only when the backend exits while still starting to surface early failures.
   */
  private rejectOnExit(child: ChildProcess, shouldReject: () => boolean): Promise<never> {
    return new Promise((_, reject) => {
      child.once('exit', (code, signal) => {
        if (this.expectedExit || !shouldReject()) {
          return
        }
        reject(new Error(`Backend exited early (code=${code ?? 'null'}, signal=${signal ?? 'null'})`))
      })
    })
  }

  /**
   * Reject when the process fails to spawn so callers can fail fast.
   */
  private rejectOnSpawnError(child: ChildProcess): Promise<never> {
    return new Promise((_, reject) => {
      child.once('error', (error) => {
        reject(error)
      })
    })
  }
}
