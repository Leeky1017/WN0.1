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
}

export type BackendExitEvent = {
  code: number | null
  signal: NodeJS.Signals | null
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

      if (!wasExpected && this.onUnexpectedExit) {
        this.onUnexpectedExit({ code, signal })
      }
    })

    try {
      await Promise.race([
        this.waitForPort(options.port, options.startupTimeoutMs ?? 30_000, options.pollIntervalMs ?? 200),
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
